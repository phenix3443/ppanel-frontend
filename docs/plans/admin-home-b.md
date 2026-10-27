# 管理后台 Home B：技术方案与验收映射

> 状态：待独立评审。评审通过前不开始实现。方案有任何改动都要重新评审。

## 依据

| 项 | 值 |
|---|---|
| 需求与验收 | [PR #34](https://github.com/phenix3443/ppanel-frontend/pull/34)（draft / do-not-merge）及其 [README](https://github.com/phenix3443/ppanel-frontend/blob/3ccb483819e7bc302f219a20fb693f9bb751aaf7/apps/admin/prototype/home-visual/README.md) |
| 视觉选择获批 SHA | `8ef6b6ff3f0cba863f8fe2a43d899550d627176e` |
| 定稿 SHA | `3ccb483819e7bc302f219a20fb693f9bb751aaf7` |
| 方案基线 | `origin/main` `b0f3cd1fc8576bdb31298637b056d44f12aa7f99`（定稿 SHA 相对它只新增 `apps/admin/prototype/home-visual/`，业务代码一致） |
| 决定 | Board 选定 B（运维优先），运行状态先于收入。本项目不开 GitHub Issues，以 PR #34 + README 为准 |

原型只用来读设计。实现从 `origin/main` 开新分支，不合入、不复制 `apps/admin/prototype/`，也不以 PR #34 的分支为基线。

文中「验收 N」指 README「验收标准」第 N 条。

## 现状（已读代码）

- 路由 `apps/admin/src/routes/dashboard/index.lazy.tsx` 渲染 `sections/dashboard/index.tsx`，顺序是 `Statistics` → `Billing type="dashboard"`。
- `components/statistics.tsx`（308 行）里有 5 张 KPI 卡、`SystemVersionCard`、收入卡、用户卡、两张流量排行卡。数据来自：
  - `getConsoleServer`，queryKey `["queryServerTotalData"]`：在线用户、今日/本月上下行、在线/离线服务器、节点/用户今日/昨日排行、`updated_at`
  - `getConsoleTicket`，queryKey `["queryTicketWaitReply"]`：`count`
- `revenue-statistics-card.tsx` 用 `getConsoleRevenue`（`["queryRevenueStatistics"]`），`user-statistics-card.tsx` 用 `getConsoleUser`（`["queryUserStatistics"]`）。两张卡都是 today 饼图、month 柱图、total 面积图，底部汇总。
- `system-version-card.tsx` 用 `getToolVersion`（`skipErrorHandler`，`retry: 1`）和 `postToolRestart`。重启流程：AlertDialog 确认 → 请求 → 等 5 秒 → 关闭；失败时由请求层 toast，按钮恢复可点。`system-version-card.test.tsx` 覆盖这三点。
- `billing.tsx` 从 CDN 拉赞助商，只保留未过期的，空列表时 `return null`。`billing.test.tsx` 覆盖首屏加载。
- 请求层 `packages/ui/src/lib/request.ts`：`code` 不是 200/0 时 reject，默认 toast（`skipErrorHandler` 时不 toast）。QueryClient 全局 `staleTime: 30_000`，`retry` 用 React Query 默认值（3 次）。
- **问题：** 现有 Home 没有读 `isLoading` / `isError`。所有数字都写成 `x || 0`，`components/display.tsx` 也会把 `undefined` 显示成 `0`。所以加载中和请求失败都会显示成「0 台离线、0 个工单」，看起来像系统正常。这正是验收 10 要解决的。
- 主题：`packages/ui/src/styles/globals.css` 定义 shadcn 变量（`:root` 浅色，`.dark` 深色），admin 和 user 的 `main.tsx` 各自 import 它。`ThemeProvider` 在 `<html>` 上切 `.light` / `.dark`，默认 `system`。
- 布局 `apps/admin/src/layout/index.tsx`：内容区是 `h-[calc(100vh-56px)] overflow-auto p-4` 的 div。侧栏是 shadcn `Sidebar`（`--sidebar-*` 变量，窄屏变成 Sheet），顶栏用 `bg-background`。
- Tabs 是 Radix（自带 `role="tablist"`、`aria-selected`、方向键切换）。图表是 recharts 2.15.4，经 `ChartContainer` 包装。

## 组件边界

都在 `apps/admin/src/sections/dashboard/` 下。路由和 `index.lazy.tsx` 不动。

```
index.tsx                     Home 根：data-admin-home + 布局顺序
lib/module-state.ts           把 useQuery 结果收敛成 loading | error | ready（纯函数）
lib/health.ts                 deriveHealth()：服务器 + 工单 → 整体状态（纯函数）
hooks/use-dashboard-data.ts   5 个 query 的唯一定义，沿用现有 queryKey
components/home-header.tsx    标题、整体状态徽标、updated_at
components/health-strip.tsx   运行状态条：服务器、工单、Web/Server 版本、重启按钮
components/system-restart.tsx 重启确认流程，从 system-version-card 原样搬出
components/metric-band.tsx    指标带：在线用户、今日收入、今日流量、本月流量
components/statistics-card.tsx 收入/用户切换 + today/month/total 切换
components/revenue-panel.tsx  由 revenue-statistics-card 拆出的图表体与汇总
components/user-panel.tsx     由 user-statistics-card 拆出的图表体与汇总
components/traffic-rank-card.tsx 节点/用户排行，今日/昨日切换
components/module-states.tsx  ModuleLoading / ModuleError / ModuleEmpty
components/billing.tsx        只改样式，逻辑不动
```

删除：`statistics.tsx`、`system-version-card.tsx`、`revenue-statistics-card.tsx`、`user-statistics-card.tsx`（内容分别并入上面的文件）。`system-version-card.test.tsx` 的三个用例改为测试 `health-strip` / `system-restart`，断言保持不变（接口路径、无「update」按钮、无版本时显示 `—`、失败后可重试）。

设计要点：

- **数据只在 hook 里取一次。** `use-dashboard-data.ts` 导出 `useServerTotal()`、`useTicketCount()`、`useRevenue()`、`useUserStats()`、`useServerVersion()`，queryKey、`queryFn` 和 `getToolVersion` 的 `skipErrorHandler` / `retry: 1` 都和现在一样。状态条和指标带都读 `useServerTotal()`，React Query 只发一次请求。
- **状态判断集中在两个纯函数。** 组件不自己写 `x || 0`。`module-state.ts` 和 `health.ts` 是这次唯一有分支逻辑的地方，用单元测试覆盖全部组合。
- **不新增接口、字段、操作。** 只用上面 5 个已有 GET 和 1 个已有 POST。「重试」按钮调用同一个 query 的 `refetch()`，不是新能力（见「待评审确认的决定」第 1 条）。

## 数据与状态映射

### 模块状态

`toModuleState(query)` 的规则：

| useQuery 情况 | 模块状态 | 说明 |
|---|---|---|
| 首次加载中（`isPending` 且未失败） | `loading` | 显示骨架，数字位显示 `—`，不显示 0 |
| `isError`（含重试用尽） | `error` | 即使缓存里有旧数据也算 error，不拿旧数据判断健康 |
| 成功 | `ready` + data | 0 就是真实的 0 |

### 整体健康状态（`deriveHealth`）

输入：服务器模块、工单模块。按顺序判断，先命中先返回：

| # | 条件 | 整体状态 | 徽标文案（zh-CN / en-US） | 色调 `data-tone` |
|---|---|---|---|---|
| 1 | 任一模块 `error` | `unknown` | 部分运行状态获取失败 / Some status unavailable | `muted` + 警示图标 |
| 2 | 任一模块 `loading` | `checking` | 正在获取运行状态 / Checking status | `muted` |
| 3 | 离线 > 0 或 工单 > 0 | `attention` | 有事项需要处理 / Needs attention | `warning` |
| 4 | 服务器总数 = 0 | `no-servers` | 尚未接入服务器 / No servers connected | `muted` |
| 5 | 其余 | `ok` | 系统运行正常 / All systems normal | `success` |

注意第 1 条排在第 3 条前面：只要有一个模块失败，就不说「运行正常」，即使另一个模块有异常也先告诉管理员「有数据拿不到」。异常项本身仍然在状态条里各自显示（见下表），不会被整体状态盖住。

### 状态条单项

| 项 | loading | error | ready = 0 | ready > 0 |
|---|---|---|---|---|
| 服务器（链接 `/dashboard/servers`） | 「服务器 —」muted | 「服务器状态获取失败」muted + 重试按钮 | 离线 0：「服务器 34/34 在线」muted；总数 0：「尚未接入服务器」muted | 「服务器 34/36 在线 · 2 台离线」`danger` |
| 工单（链接 `/dashboard/ticket`） | 「工单 —」muted | 「工单数获取失败」muted + 重试按钮 | 「工单 无待处理」muted | 「工单 3 个待处理」`warning` |
| Web 版本 | 不请求，`VITE_APP_VERSION ?? "dev"` | — | — | — |
| Server 版本 | `—` | `—`（现有行为，接口用 `skipErrorHandler`） | — | `V{version}` |

状态条整体描边：整体状态为 `attention` 时用 warning 描边，其他情况用 `border-subtle`。

### 指标带

| 项 | 数据 | loading | error | ready |
|---|---|---|---|---|
| 在线用户（链接 `/dashboard/servers`，沿用现有跳转） | server.online_users | `—` | `—` + 「获取失败」 | 整数，0 显示 0 |
| 今日收入 | revenue.today.amount_total，副行 new_order_amount / renewal_order_amount | `—` | `—` + 「获取失败」 | `Display type="currency"` |
| 今日流量 | today_upload + today_download，副行 ↑↓ | `—` | `—` + 「获取失败」 | `formatBytes` |
| 本月流量 | monthly_upload + monthly_download，副行 ↑↓ | `—` | `—` + 「获取失败」 | `formatBytes` |

只有 `ready` 时才调用 `Display` / `formatBytes`，避免它们把缺失值显示成 0。

### 统计卡与排行

| 模块 | loading | error | ready 但无数据 | ready 有数据 |
|---|---|---|---|---|
| 收入 today | 骨架 | ModuleError + 重试 | new 与 renewal 都为 0：ModuleEmpty，汇总行显示真实的 0 | 饼图 + 汇总 |
| 收入 month / total | 骨架 | 同上 | `list` 为空：ModuleEmpty | 柱图 / 面积图 + 汇总 |
| 用户 today / month / total | 同上 | 同上 | 同上 | 同上 |
| 节点 / 用户排行 | 骨架行 | ModuleError + 重试 | 数组为空：ModuleEmpty | 列表 |

ModuleEmpty 用虚线框和固定文案「暂无数据 / 有数据后自动显示」，不用现有 `composed/empty` 的随机趣味文案（README「空状态」）。ModuleError 文案「数据加载失败」+「重试」按钮。

排行列表：`<ol>`，每行是名次、名称、细进度条、流量值。进度条宽度 = 本行流量 / 第一名流量；第一名为 0 时宽度 0，不除零，不出 NaN。前 3 名的名次用 `signal` 色。

- 节点行：名称是 `name`。
- 用户行：名称是订阅 ID `sid`。现有实现在 hover 时显示 `UserDetail` + `UserSubscribeDetail`；改成行内按钮打开 Popover 显示同样内容，键盘也能打开。不新增数据。

切换状态：统计卡的「收入 / 用户」和「today / month / total」、排行的「今日 / 昨日」和「节点 / 用户」都是组件内 `useState`，默认值分别为收入、today、今日、节点。和现在一样不写 URL。

### updated_at

顶部显示「数据更新于 {相对时间}」，来自 `server.updated_at`（已有字段）。只有服务器模块 `ready` 且 `updated_at > 0` 时显示，否则不显示，不伪造「刚刚」。

## admin token 作用域

目标：token 只进 admin 的 CSS 包，`packages/ui/src/styles/globals.css` 和 user 端不改一行（验收 8）。

1. 新增 `apps/admin/src/styles/admin.css`：

   ```css
   @import "@workspace/ui/globals.css";

   :root { --ds-canvas: #f1f0ed; /* …README 浅色全套… */ }
   .dark { --ds-canvas: #151412; /* …README 深色全套… */ }

   @theme inline {
     --color-ds-canvas: var(--ds-canvas);
     --color-ds-surface: var(--ds-surface);
     /* …text-1/2/3、signal、success、danger、warning、info 及 *-soft… */
   }
   ```

   `apps/admin/src/main.tsx` 的 `import "@workspace/ui/globals.css"` 改为 `import "./styles/admin.css"`。user 端仍直接 import `globals.css`，拿不到任何 `--ds-*` 和 `ds-*` 工具类。

2. 分三层生效：

   | 层 | 选择器 | 映射 | 影响范围 |
   |---|---|---|---|
   | 设计 token | `:root` / `.dark` | 只定义 `--ds-*` | 无（命名空间独立，不被现有组件引用） |
   | 外框 | `:root` / `.dark` | `--sidebar*` → foundation/text/signal/border；`--background` → canvas | admin 全部页面的侧栏、顶栏、内容底色。README 要求侧栏和顶栏继承 token |
   | Home 内容 | `.admin-home` | `--card`、`--card-foreground`、`--border`、`--input`、`--muted`、`--muted-foreground`、`--primary`、`--primary-foreground`、`--ring`、`--chart-1..3`、`--radius` → 对应 ds token | 只有 Home。其他后台页面的卡片、按钮、表格不变 |

   `--chart-1..3` 按 README 固定顺序映射到 signal（新购/主系列）→ info（续费）→ structure（注册）。

   重启按钮按原型做成描边样式：`variant="outline"`，文字 `danger`，描边 `danger` 40%，hover 底色 `danger-soft`。不用 shadcn 的实心 `destructive`：白字放在深色 danger `#ee8178` 上对比度只有约 2.6 : 1。只改样式，按钮文案和确认流程不变。

3. 渲染到 `document.body` 的 portal（重启 AlertDialog、用户详情 Popover）不在 `.admin-home` 里。给这两处的 Content 加上 `admin-home` class，让它们也用 Home token。
4. 侧栏当前项高亮：`--sidebar-accent` → `signal-soft`，`--sidebar-accent-foreground` → `signal`。只改变量，不改 `sidebar-left.tsx` 和 `header.tsx` 的结构。
5. 去掉毛玻璃和大投影：Home 卡片用 `shadow-none` + 1px `border-subtle` + 顶部内高光 `--ds-highlight`。

## 布局与响应式

Home 根元素用容器查询（Tailwind v4 内置 `@container`），按内容区宽度断点，而不是视口宽度。这样侧栏展开或收起时布局都对。

| 区域 | 内容宽 < 48rem（含 390px 手机） | 48–64rem | ≥ 64rem（1440px 桌面展开侧栏约 1150px） |
|---|---|---|---|
| 顶部 | 标题与整体徽标换行 | 同一行 | 同一行 |
| 状态条 | 单列：标题、徽标组（`flex-wrap`）、重启按钮占满宽 | `auto 1fr auto` 三列，徽标组可换行 | 同左 |
| 指标带 | 1 列 | 2 列 | 4 列，细分隔线 |
| 主区 | 统计卡、排行上下排列 | 同左 | `minmax(0,2fr) minmax(300px,1fr)` |
| 赞助区 | 1 列 | 3 列 | 6 列（沿用现有列数） |

防横向溢出：

- 所有 grid 轨道用 `minmax(0, …)`，flex 子项加 `min-w-0`。
- 排行名称 `truncate`，完整名称放在 `title` 和行的可访问名称里；流量值 `shrink-0`，永远可读。
- 状态条徽标允许换行，文字不截断。
- 图表用 `ChartContainer` 自带的 ResponsiveContainer，宽度跟随卡片。
- 间距：卡片间距统一 16px（`gap-4`），卡片内边距 20px（`p-5`）。窄屏页面内边距由现有布局的 `p-4` 提供，不改布局文件。

## 可访问性

| 项 | 做法 |
|---|---|
| 区域结构 | 状态条 `<section aria-labelledby>`，标题「运行状态」；统计卡、排行卡同样有标题 |
| 不只靠颜色 | 状态都有文字和数量（「2 台离线」「3 个待处理」「获取失败」） |
| 整体状态播报 | 整体徽标 `role="status"`（隐式 `aria-live="polite"`），刷新后状态变化会被读出 |
| 键盘 | 状态条两个链接、重试按钮、统计卡两组 Tabs、排行两组 Tabs、用户行按钮、重启按钮都可 Tab 到达。Radix Tabs 组内用方向键 |
| 选中状态 | Radix Tabs 输出 `role="tab"` + `aria-selected`。每组 TabsList 加 `aria-label`（「统计类型」「时间范围」「排行日期」「排行对象」） |
| 焦点可见 | 链接和自定义按钮加 `focus-visible:ring-[3px] ring-ring`，`--ring` 在 Home 映射到 signal，与 surface 对比度 ≥ 3 : 1 |
| 图表 | 图表 SVG `aria-hidden`，旁边放 `sr-only` 的 `<table>`，列出同一组数据（日期 / 类型 / 数值）。读屏可读，视觉不变 |
| 进度条 | `aria-hidden`，数值以文字给出 |
| 重启 | 沿用 Radix AlertDialog 的焦点陷阱和 Esc 关闭 |
| 动效 | 不新增动画 |

## 字体

- `apps/admin` 新增依赖 `@fontsource/ibm-plex-sans`（400、600）和 `@fontsource/ibm-plex-mono`（400），在 `admin.css` 里 import。fontsource 按 `unicode-range` 拆分子集，浏览器只下载用到的字。
- 中文不打包 Noto Sans SC，回退到系统字体：`"IBM Plex Sans", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", system-ui, sans-serif`。理由：`@fontsource/noto-sans-sc` 每个字重有上百个子集文件，会让 dist 和镜像明显变大，而后台只有站长一个人用，系统中文字体足够。README 写明「具体由工程决定」。
- 字体只加在 `.admin-home` 上，侧栏、顶栏和其他页面字体不变。
- 数字：KPI、汇总、排行名次和流量值加 `tabular-nums`。版本号、订阅 ID、排行流量值用 `font-mono`（IBM Plex Mono）。
- 字号按 README 阶梯：页面标题 22/600，卡片标题 15/600，正文 13–14/400，辅助 12/400，KPI 28/600，汇总 18/600。

## 验收映射

「自动」是 CI 和本地能跑的检查；「Board」是 Board 在自己 Mac 上的浏览器取证（步骤见下一节）。agent 不启动浏览器，自动检查通过不代表浏览器验收通过。

| # | 验收 | 实现位置 | 自动检查 | Board 取证 |
|---|---|---|---|---|
| 1 | B 排序与布局；深色三档底色 | `index.tsx` 顺序 header → 状态条 → 指标带 → 主区 → 赞助；`admin.css` token | `home.test.tsx`：DOM 顺序（`compareDocumentPosition`）；`theme-tokens.test.ts`：深色 canvas/surface/surface-raised 值与 README 一致 | B1：1440px 深色截图与 `shots/B-*-dark.png` 对照 |
| 2 | 文字与状态色对比度 ≥ 4.5 : 1（深浅两套） | `admin.css` | `theme-tokens.test.ts`：解析 `admin.css` 的 token，计算 WCAG 对比度：text-1/2/3、signal、success、danger、warning、info 分别对 canvas、surface、surface-raised，以及状态色对其 `*-soft` 叠在 surface 上的合成底色，深浅两套都 ≥ 4.5 | B2：DevTools 抽查徽标、辅助文字的对比度 |
| 3 | warning 与 signal 分离，工单 > 0 用 warning | `admin.css`；`health-strip.tsx` 工单项 `data-tone="warning"` | `theme-tokens.test.ts`：两套主题里 warning ≠ signal；`health-strip.test.tsx`：工单 3 → 工单徽标 `data-tone="warning"` | B3：需关注场景截图 |
| 4 | 离线或工单 > 0 时首屏可见且有颜色；都为 0 时无红黄 | `lib/health.ts`；`health-strip.tsx` | `health.test.ts` 覆盖全部分支；`health-strip.test.tsx`：都为 0 时页面内没有 `data-tone="danger"` / `"warning"` 的元素 | B4：1440px 和 390px 首屏是否能看到异常项 |
| 5 | 全空时图表和排行显示空状态，无空白卡、无 NaN | `module-states.tsx`；各 panel 与排行 | `statistics-card.test.tsx`、`traffic-rank-card.test.tsx`：全空响应下出现 ModuleEmpty 文案，`document.body.textContent` 不含 `NaN` | B5：空数据场景截图 |
| 6 | KPI 与排行数字 tabular-nums | `metric-band.tsx`、汇总、`traffic-rank-card.tsx` | 组件测试：数值节点带 `tabular-nums` class | B6：DevTools Computed 查 `font-variant-numeric` |
| 7 | 浅色可切换且满足第 2 条 | `admin.css` `:root` 浅色值；沿用 ThemeProvider | 同第 2 条（浅色那一套） | B7：浅色截图 + 抽查对比度 |
| 8 | token 只在 admin 内，不改 globals.css、不影响 user | `apps/admin/src/styles/admin.css`；`main.tsx` import | `git diff --exit-code origin/main -- packages/ui/src/styles/globals.css apps/user` 无输出；构建后 `grep -rl -- '--ds-' apps/user/dist` 无结果，`apps/admin/dist` 有结果 | B8：打开 user 端首页，确认外观没变 |
| 9 | 数据来源、跳转、重启流程不变 | `use-dashboard-data.ts`；`health-strip.tsx` 链接；`system-restart.tsx` | 原三个重启/版本用例保留断言；新增：在线用户和服务器链接 `href` 含 `/dashboard/servers`，工单链接含 `/dashboard/ticket`；请求路径只有 5 个 GET + 1 个 POST | B9：点三个链接；打开重启对话框后点取消（不在生产环境确认重启） |
| 10 | 加载、失败、真实零值可区分；失败不显示「运行正常」「无待处理」；保留重试/刷新 | `lib/module-state.ts`、`lib/health.ts`、`module-states.tsx` | `health.test.ts`：任一模块 error → 不是 `ok`；`health-strip.test.tsx`：服务器请求失败时不出现「All systems normal」，出现失败文案，点重试后请求次数 +1；工单失败时不出现「无待处理」；`metric-band.test.tsx`：失败显示 `—` 不显示 `0`，真实 0 显示 `0` | B10：用 DevTools 阻断单个接口、全部接口、慢速网络，分别截图 |
| 11 | 键盘可达、焦点可见、选中可读、图表有数据说明 | 见「可访问性」 | 组件测试：Tabs 有 `aria-label`，选中项 `aria-selected="true"`；图表旁存在 `sr-only` 表格且行数等于数据点数 | B11：只用键盘走一遍；VoiceOver 读状态条、Tabs、图表表格 |
| 12 | 1440px / 390px 下状态条、长名称、空状态可读，无页面级横向溢出 | 见「布局与响应式」 | `traffic-rank-card.test.tsx`：60 字符节点名完整出现在 `title` 和可访问名称里（jsdom 不能测布局，只测内容不丢） | B12：两种宽度下检查溢出（命令见下） |

第 2 条的预算：方案阶段已用 README 的 token 值按 WCAG 公式算过，16 个前景色对 canvas、surface、surface-raised 及 soft 合成底色全部 ≥ 4.5。最低几项：深色 danger 对 danger-soft 4.83，深色 text-3 对 surface-raised 4.90，浅色 info 对 info-soft 4.80。实现中的测试是为了防止以后改 token 时回退，不是首次验证。

赞助区：`billing.tsx` 只改 className，`if (!list?.length) return null` 和过期过滤不动，`billing.test.tsx` 保持通过。

## 自动检查清单（实现 PR 要贴结果）

在实现分支根目录运行，每条命令设 10 分钟上限：

```bash
bun install --frozen-lockfile       # 新增 fontsource 后锁文件随 PR 提交
timeout 600 bun run check            # biome，与 CI 一致
timeout 600 bun run build            # turbo build，含各 app 的 tsc
timeout 600 bun run test             # 含 apps/admin vitest
git diff --exit-code origin/main -- packages/ui/src/styles/globals.css apps/user
grep -rl -- '--ds-' apps/user/dist   # 期望无输出
grep -rl -- '--ds-' apps/admin/dist  # 期望有输出
```

新增或改写的测试文件：`lib/health.test.ts`、`lib/module-state.test.ts`、`components/health-strip.test.tsx`（含原重启/版本三个用例）、`components/metric-band.test.tsx`、`components/statistics-card.test.tsx`、`components/traffic-rank-card.test.tsx`、`home.test.tsx`、`apps/admin/src/styles/theme-tokens.test.ts`。沿用现有写法：`// @vitest-environment jsdom`，mock `@workspace/ui/lib/request` 和 `react-i18next`。

新增文案写入 `apps/admin/public/assets/locales/{en-US,zh-CN}/dashboard.json`，用 `bun run i18n:status` 确认没有缺失 key。

## Board 手工取证清单

agent 不启动浏览器。下列各项都需要 Board 在自己的 Mac 上操作。每项记录：实现 PR 的 head SHA、浏览器及版本、主题、视口宽度、截图。

准备：

1. 检出实现 PR 的 head SHA，`bun install`，在 `apps/admin` 配好指向**测试后端**的 `VITE_API_PREFIX`，运行 `bun run dev`，打开 `http://localhost:3001/#/dashboard`。
2. 不要连生产后端做 B9 的重启确认。
3. 需要构造数据场景时，用 Chrome DevTools → Network → 右键请求 → Override content，改写 `/v1/admin/console/server` 或 `/v1/admin/console/ticket` 的响应。

| 编号 | 操作 | 通过标准 |
|---|---|---|
| B1 | 深色、1440px 宽，截全页 | 顺序为状态条 → 指标带 → 统计/排行 → 赞助；三档底色与 `shots/B-alert-dark.png` 一致 |
| B2 | DevTools 选中状态徽标文字、辅助文字，看 Accessibility 面板的 contrast | 均 ≥ 4.5 |
| B3 | 改写 ticket 响应 `count: 3` | 工单徽标为黄色，和导航当前项的橙色明显不同 |
| B4 | 改写 server 响应 `offline_servers: 2`，在 1440px 和 390px（DevTools Device Toolbar）下不滚动查看 | 首屏能看到「2 台离线」，红色；都改回 0 后页面上没有红色或黄色 |
| B5 | 四个 console 接口都改写成空数组/0 | 每个图表、排行是虚线空状态，没有空白卡片，没有 NaN；状态条显示「尚未接入服务器」 |
| B6 | 选中一个 KPI 数字，看 Computed | `font-variant-numeric: tabular-nums` |
| B7 | 切到浅色，重复 B1、B2 | 同标准 |
| B8 | 打开 user 端（`apps/user` 的 dev），对比 main 的截图 | 外观无变化 |
| B9 | 点在线用户、服务器徽标、工单徽标；点「系统重启」后点「取消」 | 分别到 `/dashboard/servers`、`/dashboard/servers`、`/dashboard/ticket`；对话框文案与现在一致，取消后无请求 |
| B10 | (a) Network 面板 Block request URL 阻断 `/v1/admin/console/server`；(b) 阻断全部 `/v1/admin/console/*`；(c) Throttling 选 Slow 3G 刷新 | (a) 服务器徽标显示「获取失败」+ 重试，整体徽标不是「系统运行正常」；解除阻断后点重试恢复。(b) 各模块都显示失败，没有任何「无待处理」「运行正常」。(c) 加载期间显示骨架和 `—`，没有 0 |
| B11 | 只用 Tab / Shift+Tab / 方向键 / Enter 走一遍：服务器链接 → 工单链接 → 重启 → 统计 Tabs → 排行 Tabs → 用户行详情；再开 VoiceOver（⌘F5）读一遍 | 每一步都能看到焦点框；VoiceOver 读出「运行状态」区域、Tabs 选中状态、图表数据表格 |
| B12 | 1440px 和 390px 下，把一个节点名改写成 60 个字符；在 Console 运行 `const c=document.querySelector('[data-admin-home]').parentElement; [c.scrollWidth, c.clientWidth, document.documentElement.scrollWidth, innerWidth]` | 前两个数相等、后两个数相等（没有页面级横向滚动）；长名称截断但 hover 能看到全名，流量值完整显示 |

README 里的可用性验证（任务耗时、第一次点击、误判）是另一件事，不在本清单里，也不能用本清单的结果代替。

## 风险

| 风险 | 影响 | 应对 |
|---|---|---|
| `--background` 和 `--sidebar-*` 在 admin 全局生效 | 其他后台页面的外框底色变成暖色，原有卡片（冷灰）放在暖色底上可能有轻微色差；`variant="outline"` 按钮用 `bg-background`，也会变 | 这是 README「侧栏顶栏继承 token」的直接结果。Board 在 B8 之外抽查 1–2 个其他页面（如用户列表）。如果 Board 不接受，退回方案：`--background` 只在 `.admin-home` 内生效，外框只改 `--sidebar-*` |
| `@import "@workspace/ui/globals.css"` 再追加 `@theme inline` 的 Tailwind v4 写法 | 若构建不认，ds 工具类不生成 | 实现第一步先跑 `bun run build` 验证。不行就不用 `@theme`，改用 `bg-(--ds-surface)` 这类任意值写法，作用域结论不变 |
| React Query 默认重试 3 次 | 接口挂掉时要等约 7 秒才进入失败状态，期间显示骨架 | 沿用现有行为，不改全局 retry。Board 在 B10 记录实际等待时间，如需缩短另提 |
| 失败时请求层会弹 toast | 一次加载可能弹 2–3 个错误提示 | 现有行为，属于「保留的反馈」，不改 |
| 中文回退系统字体 | Windows 上中文是微软雅黑，和设计稿的 Noto Sans SC 有差异 | 后台用户就是站长本人（Mac，PingFang SC）。如需一致再加 `@fontsource/noto-sans-sc` |
| 合并统计卡后 today 饼图高度变小 | 小屏上图例可能挤 | 图表高度保持 `h-60` 以上，B4/B12 截图确认 |
| 上游同步冲突 | 本仓库定期合并 perfect-panel 上游，Home 文件被重写后合并会冲突 | 改动集中在 `sections/dashboard/` 和新增的 `styles/admin.css`；冲突时以本实现为准 |

## 待评审确认的决定

1. **重试按钮。** 失败模块显示「重试」按钮，调用同一 query 的 `refetch()`。不新增接口，但界面上多了一个按钮。理由：验收 10 要求「保留现有重试/刷新路径」，而现有路径（自动重试、窗口聚焦刷新、浏览器刷新）对管理员不可见。如果评审认为这算新操作，改为只显示失败文案和「刷新页面可重试」提示。
2. **外框 token 全局生效**（见风险第 1 条）。
3. **中文不打包 Noto Sans SC**（见「字体」）。
4. **用户排行的详情从 hover 改为按钮 + Popover。** 内容不变，交互从仅鼠标 hover 变成点击/回车打开，为了满足验收 11。

## 非目标

- 不改 `/dashboard` 以外的页面内容，不改侧栏、顶栏的组件结构和导航项。
- 不改 `packages/ui` 的任何文件，不改 user 端。
- 不新增接口、字段、操作、客户端、轮询或自动刷新。
- 不改 ThemeProvider 默认值（仍为 `system`），不改主题切换入口。
- 不重做赞助区逻辑。
- 不做 README 的可用性测试，不声称 B 提高效率或降低误判。
- 不部署，不在真实系统上执行重启。
- 不合并或复用 PR #34 的原型代码。

## 实施顺序（评审通过后）

一个实现 PR，按以下顺序提交，每步都能单独 build 和 test：

1. `admin.css` + token 测试 + `main.tsx` import（验收 2、7、8）
2. `module-state.ts`、`health.ts` 及单元测试（验收 4、10）
3. `use-dashboard-data.ts`，拆出 `system-restart.tsx`，迁移原有测试（验收 9）
4. 状态条、整体徽标、指标带（验收 1、3、4、6、10）
5. 统计卡、排行、空/错/加载态、图表数据表（验收 5、6、11）
6. 布局、字体、赞助区样式（验收 1、12）
7. 文案、i18n、自检，交独立评审；Board 按清单取证
