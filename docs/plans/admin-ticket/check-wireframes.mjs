import { chromium, firefox, webkit } from 'playwright';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
// Pass the wireframes directory as argv[2]; browser.sh copies this script, so
// prefix process.argv[2] with the read-only mounted source directory in a temp copy.
const source = process.argv[2];
if (!source) throw new Error('Expected wireframes directory in argv[2]');
const results = [];
for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await engine.launch({ headless: true });
  for (const file of (await readdir(source)).filter(f => f.endsWith('.svg')).sort()) {
    const mobile = file.startsWith('mobile-');
    const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 } });
    await page.setContent(`<style>body{margin:0}svg{display:block;max-width:100%;height:auto}</style>${await readFile(join(source, file), 'utf8')}`);
    const metrics = await page.evaluate(() => {
      const svg = document.querySelector('svg');
      const bounds = svg.getBoundingClientRect();
      const badText = [...svg.querySelectorAll('text')].filter(node => {
        const r = node.getBoundingClientRect();
        return r.left < bounds.left || r.right > bounds.right + 1 || r.bottom > bounds.bottom + 1;
      }).map(node => node.textContent);
      return { title: svg.querySelector('title')?.textContent, description: svg.querySelector('desc')?.textContent, width: bounds.width, scrollWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth, badText };
    });
    if (!metrics.title || !metrics.description || metrics.badText.length || metrics.scrollWidth > metrics.viewportWidth) throw new Error(JSON.stringify({ name, file, metrics }));
    await page.screenshot({ path: `/out/${name}-${file.replace('.svg', '.png')}`, fullPage: true });
    results.push({ browser: name, version: browser.version(), file, ...metrics, result: 'pass' });
    await page.close();
  }
  await browser.close();
}
await writeFile('/out/check-results.json', JSON.stringify({ scope: 'Static SVG rendering only; no application, interaction, backend, or usability verification', results }, null, 2) + '\n');
console.log(JSON.stringify({ checks: results.length, failures: 0 }));
