import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const css = readFileSync(
  fileURLToPath(new URL("./admin.css", import.meta.url)),
  "utf8"
).replace(/\/\*[\s\S]*?\*\//g, "");

type Rule = { selector: string; decls: Record<string, string> };

function parseRules(source: string): Rule[] {
  const rules: Rule[] = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  for (const match of source.matchAll(re)) {
    const selector = (match[1] ?? "").trim().replace(/^@import[^;]*;\s*/gm, "");
    const decls: Record<string, string> = {};
    for (const part of (match[2] ?? "").split(";")) {
      const idx = part.indexOf(":");
      if (idx === -1) continue;
      decls[part.slice(0, idx).trim()] = part
        .slice(idx + 1)
        .trim()
        .replace(/\s+/g, " ");
    }
    rules.push({ selector, decls });
  }
  return rules;
}

const rules = parseRules(css);
const light = rules.find((r) => r.selector === ":root")?.decls ?? {};
const dark = rules.find((r) => r.selector === ".dark")?.decls ?? {};

type RGBA = [number, number, number, number];

function parseColor(value: string): RGBA {
  const hex = value.match(/^#([0-9a-f]{6})$/i);
  if (hex?.[1]) {
    const channel = (i: number) =>
      Number.parseInt(hex[1]?.slice(i, i + 2) ?? "0", 16);
    return [channel(0), channel(2), channel(4), 1];
  }
  const rgba = value.match(/^rgba\(([^)]+)\)$/);
  if (rgba?.[1]) {
    const [r, g, b, a] = rgba[1].split(",").map((v) => Number(v.trim()));
    return [r ?? 0, g ?? 0, b ?? 0, a ?? 1];
  }
  throw new Error(`unsupported color ${value}`);
}

function over(top: RGBA, base: RGBA): RGBA {
  const a = top[3];
  return [
    top[0] * a + base[0] * (1 - a),
    top[1] * a + base[1] * (1 - a),
    top[2] * a + base[2] * (1 - a),
    1,
  ];
}

function luminance([r, g, b]: RGBA) {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.039_28 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: RGBA, b: RGBA) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

function token(theme: Record<string, string>, name: string) {
  const value = theme[`--ds-${name}`];
  if (!value) throw new Error(`missing --ds-${name}`);
  return parseColor(value);
}

const TEXT = ["text-1", "text-2", "text-3"];
const STATUS = ["signal", "success", "danger", "warning", "info"];
const BACKGROUNDS = ["canvas", "surface", "surface-raised"];

describe.each([
  ["light", light],
  ["dark", dark],
])("%s tokens", (_name, theme) => {
  it.each([...TEXT, ...STATUS])("%s reaches 4.5:1 on every base", (fg) => {
    for (const bg of BACKGROUNDS) {
      expect(
        contrast(token(theme, fg), token(theme, bg)),
        `${fg} on ${bg}`
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(STATUS)("%s reaches 4.5:1 on its soft badge over surface", (fg) => {
    const soft = over(token(theme, `${fg}-soft`), token(theme, "surface"));
    expect(contrast(token(theme, fg), soft)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps warning distinct from signal", () => {
    expect(theme["--ds-warning"]).not.toBe(theme["--ds-signal"]);
  });
});

describe("dark surfaces match the README", () => {
  it("uses the three approved base layers", () => {
    expect(dark["--ds-canvas"]).toBe("#151412");
    expect(dark["--ds-surface"]).toBe("#25221e");
    expect(dark["--ds-surface-raised"]).toBe("#2d2924");
  });
});

describe("token scope", () => {
  it("only declares --ds-* on :root and .dark", () => {
    for (const rule of rules.filter((r) =>
      [":root", ".dark"].includes(r.selector)
    )) {
      for (const name of Object.keys(rule.decls)) {
        expect(name, `${rule.selector} ${name}`).toMatch(/^--ds-/);
      }
    }
  });

  it("only overrides shadcn variables inside Home scope", () => {
    const scoped = rules.filter(
      (r) =>
        !(
          [":root", ".dark"].includes(r.selector) ||
          r.selector.startsWith("@theme")
        )
    );
    expect(scoped.length).toBeGreaterThan(0);
    for (const rule of scoped) {
      const touchesShadcn = Object.keys(rule.decls).some(
        (name) => name.startsWith("--") && !name.startsWith("--ds-")
      );
      if (!touchesShadcn) continue;
      for (const selector of rule.selector.split(",")) {
        expect(selector.trim()).toMatch(
          /\.admin-home|:has\(\[data-admin-home\]\)/
        );
      }
    }
  });

  it("never sets --background on the frame", () => {
    for (const rule of rules.filter((r) =>
      r.selector.includes(":has([data-admin-home])")
    )) {
      expect(rule.decls["--background"]).toBeUndefined();
    }
  });
});
