# 管理后台 Home A：方案差异与验收映射

> 状态：待评审。Board 于 2026-10-27 09:07 UTC 改选 A，取代 B 的布局选择。本文写清 A 和 main 上已合并的 B 有哪些不同、实现怎么改，以及验收条款怎么对应到 A。评审通过前不改应用代码，也不 revert 已合并的 B。

## 依据

| 项 | 值 |
|---|---|
| 决定 | Board 在 Paperclip 任务 SOL-1845 评论：「PR #34 这里更新一下，我选择 A 方案」（2026-10-27 09:07:50 UTC） |
| 视觉来源 | [PR #34](https://github.com/phenix3443/ppanel-frontend/pull/34)（draft / do-not-merge）`index.html` 的 `VariantA`；截图 `shots/A-normal-dark.png`、`A-normal-light.png`、`A-empty-dark.png` |
| 视觉选择 SHA | `8ef6b6ff3f0cba863f8fe2a43d899550d627176e`（A 的布局和 token 在此提交已定） |
| 定稿 SHA | `3ccb483819e7bc302f219a20fb693f9bb751aaf7`（只把默认变体改为 B、补交接说明，没改 A） |
| 验收条款 | [验收标准修订版](admin-home-b-acceptance.md) 的 12 条，按下文「验收映射」调整后适用于 A |
| 现状基线 | `origin/main` `3a89635f9366d309dfe29b880ed1a79313a562d3`，含已合并的 B（[PR #36](https://github.com/phenix3443/ppanel-frontend/pull/36)，merge `00e454c`） |

原型只用来读设计，不合入、不复制 `apps/admin/prototype/`。

## 不变的边界

以下沿用 B 阶段的决定，A 不改：

- 只改 `/dashboard` Home。侧栏和顶栏只继承 admin token，结构不动。
- 不新增接口、字段、操作或客户端。数据仍来自 `getConsoleServer`、`getConsoleTicket`、`getConsoleRevenue`、`getConsoleUser`、`getToolVersion`，唯一操作仍是系统重启（`postToolRestart`）。
- token 只在 admin 内生效（`apps/admin/src/styles/admin.css`，`.admin-home` / `[data-admin-home]` 作用域），不改 `packages/ui`。
- warning 与 signal 分离；深浅两套主题；IBM Plex 字体；tabular-nums。
- 加载、请求失败、成功空数据、真实零值四种状态分开显示（`lib/module-state.ts`）。
- 跳转：在线用户、服务器 → `/dashboard/servers`；工单 → `/dashboard/ticket`。重启确认与反馈不变。
- 赞助区有有效赞助商才显示，`billing.tsx` 逻辑不动。

## A 与已合并 B 的布局差异

| 区域 | 已合并的 B | A（原型 `VariantA`） |
|---|---|---|
| 页头 | 标题 + 整体健康徽标 + 更新时间 | 标题 + 更新时间，**没有整体健康徽标** |
| 运行状态 | 一条状态条：服务器、工单、Web/Server 版本、重启按钮 | **没有状态条**。服务器、工单是 KPI 卡；版本和重启放在「系统服务」卡 |
| KPI | 一条指标带，4 项：在线用户、今日收入、今日流量、本月流量 | **6 张等权卡片**，3 列 2 行：在线用户、今日流量、本月流量、服务器总数、待处理工单、系统服务 |
| 今日收入 | 在指标带里 | 不单独成卡，在收入统计卡的「今日」视图里 |
| 收入 / 用户统计 | 合并成一张卡，用分段控件切换 | **两张卡并排**，各自有 今日 / 月 / 总计 切换 |
| 流量排行 | 右侧一张卡，节点 / 用户切换 + 今日 / 昨日切换 | **两张卡并排**：节点流量、用户流量，各自有 今日 / 昨日 切换 |
| 异常提示 | 状态条描边变黄，服务器项红色徽标、工单项黄色徽标 | 服务器卡：离线数用 danger 色，图标底色变 danger-soft；工单卡：描边和数字用 warning 色，图标底色变 warning-soft |
| 窄屏 | 状态条换行，主区单列 | 所有卡片单列，顺序同上 |

A 的卡片网格和旧版（B 之前）的 `statistics.tsx` 结构一致，所以叫「沿用结构，换视觉」。

## 实现方案

### 保留并复用

这些是 B 实现里与布局无关的部分，A 直接沿用：

- `styles/admin.css`、`styles/theme-tokens.test.ts`：token、作用域和对比度测试。
- `lib/module-state.ts`、`hooks/use-dashboard-data.ts`：模块状态和 5 个 query（queryKey 不变，每个接口仍只请求一次）。
- `components/module-states.tsx`（加载 / 失败 / 空状态）、`status-badge.tsx`、`segment.ts`。
- `components/stats-chart.tsx`、`revenue-panel.tsx`、`user-panel.tsx`：图表、读屏数据表、底部汇总。
- `components/traffic-rank-card.tsx` 里的 `rankRows`、`barPercent` 和排行列表渲染（截断 + `title` 全名、数值完整显示）。
- `components/system-restart.tsx`：重启确认流程。
- `components/billing.tsx`：不动。

### 调整

都在 `apps/admin/src/sections/dashboard/` 下：

```
index.tsx                     布局改为：页头 → KPI 网格 → 收入|用户 两卡 → 节点|用户流量 两卡 → 赞助
components/home-header.tsx    去掉整体健康徽标，保留标题和 updated_at
components/kpi-grid.tsx       新增：6 张卡（在线用户、今日流量、本月流量、服务器、工单、系统服务）
components/system-service-card.tsx  新增：Web/Server 版本 + SystemRestart，内容取自 health-strip 的版本部分
components/revenue-card.tsx   新增：收入统计卡，包 revenue-panel + 今日/月/总计 切换
components/user-card.tsx      新增：用户统计卡，包 user-panel + 今日/月/总计 切换
components/traffic-rank-card.tsx  改为接收 type="nodes" | "users"，每张卡只有 今日/昨日 切换
```

删除：`health-strip.tsx`、`metric-band.tsx`、`statistics-card.tsx` 及其测试，`hooks/use-home-health.ts`。测试里仍然有效的断言（服务器失败与重试、工单失败、单模块失败不影响其他模块、0 台服务器文案、版本接口与重启）迁到新组件的测试里，断言内容不变。

`lib/health.ts` 的 `deriveHealth` 只服务于整体徽标，A 没有整体徽标，所以删除 `deriveHealth`、`healthTone`、`healthHasAlertIcon` 及其测试。服务器卡和工单卡各自的色调改用两个小纯函数（`serverTone`、`ticketTone`），只在模块 `ready` 时上色，`loading` / `error` 时为 muted。

### 各卡片的状态

| 卡片 | 加载中 | 请求失败 | 成功 |
|---|---|---|---|
| 在线用户、今日流量、本月流量 | 数值显示 `—` | 数值显示 `—`，卡内显示失败文案 + 重试 | 真实值，0 显示为 0 |
| 服务器总数 | `—` | 失败文案 + 重试 | 总数；副行「在线 N · 离线 M」，离线 > 0 时离线数和图标为 danger。总数为 0 时副行显示「尚未接入服务器」 |
| 待处理工单 | `—` | 失败文案 + 重试；不显示 0 或「无待处理」 | 数量；> 0 时描边、数字和图标为 warning；= 0 时为默认色 |
| 系统服务 | 版本显示 `—` | 版本显示 `—`（`getToolVersion` 沿用 `skipErrorHandler`、`retry: 1`） | 版本号；重启按钮始终可用，始终为 danger 样式 |
| 收入统计、用户统计 | ModuleLoading | ModuleError + 重试 | 图表或 ModuleEmpty |
| 节点流量、用户流量 | ModuleLoading | ModuleError + 重试 | 排行或 ModuleEmpty |

在线用户和两张流量卡都读 `getConsoleServer`，失败时三张卡都显示失败；重试调用同一个 `refetch()`。

「尚未接入服务器」偏离了 `A-empty-dark.png`（截图里写的是「在线 0 · 离线 0」）。这样做是为了满足原稿「卡片与数据模块层次」第 5 条和验收 5：0 台服务器不能看起来像一切正常。请评审确认。

### 布局与窄屏

- 网格用 Home 容器查询（沿用 B 的 `@container/home`）：宽时 KPI 3 列、统计和排行 2 列；窄时都单列。断点在实现时按 1440 和 390 两个视口取证调整。
- 窄屏单列时 6 张 KPI 卡按上表顺序排列，服务器是第 4 张、工单是第 5 张。用原型在 390 × 844 下量过（Chromium，`variant=A&scenario=alert`）：服务器卡底边 682px，工单卡底边 819px，都在 844px 首屏内，但工单卡余量只有约 25px。应用里顶栏和内边距和原型不完全一样，所以这是实现时必须实测的风险项。如果实测工单卡超出首屏，先缩小窄屏下 KPI 卡的内边距和数字字号，不改卡片顺序；仍放不下时停下来交评审决定，不自行改布局。
- 长节点名截断，`title` 给全名；数值完整显示；页面不出现横向溢出。

## 验收映射

12 条编号沿用[验收标准修订版](admin-home-b-acceptance.md)。下表写明每条在 A 下是否原样适用；需要改写的条目给出 A 版本的表述。

| # | 适用性 | A 下的验收表述 | 取证 |
|---|---|---|---|
| 1 | 改写 | Home 在深色主题下使用原稿 token；`canvas`、`surface`、`surface-raised` 三档底色与 **A 的截图**（`A-normal-dark.png`）一致 | 计算样式 + 截图 |
| 2 | 原样 | 文字和状态色对比度 ≥ 4.5 : 1，深浅两套 | 沿用 `theme-tokens.test.ts`，浏览器抽样重测 |
| 3 | 改写 | warning ≠ signal；待处理工单 > 0 时，**工单卡**的描边、数字和图标用 warning，不用 signal | 计算样式 |
| 4 | 改写 | 服务器离线数 > 0 或待处理工单 > 0 时，**服务器卡、工单卡**在首屏内，且用文字、数量和颜色提示。服务器和工单数据都成功取得且都为 0 时，这两张卡不显示红色或黄色。重启按钮始终为 danger，不受本条约束。视口和异常输入不变：1440 × 900、390 × 844，在线 4 台、离线 2 台，可另加工单 > 0 | 位置测量 + 截图；390 下见上文风险项 |
| 5 | 改写 | 各接口成功返回空数据时，两张统计卡和两张排行卡都显示空状态（虚线框 + 说明），不出现空白卡片或 NaN；0 台服务器时**服务器卡**显示「尚未接入服务器」。请求失败见第 10 条 | 截图 + DOM 断言 |
| 6 | 原样 | KPI 和排行数字使用 `tabular-nums` | 计算样式 |
| 7 | 原样 | 可切换浅色，满足第 2 条（对照 `A-normal-light.png`） | 同第 2 条 |
| 8 | 原样 | token 只在 admin 内生效，不影响 user | 沿用 B 的 head / base 计算样式对比和 user 构建产物检查 |
| 9 | 原样 | 数据来源、跳转、重启流程不变。A 下跳转入口是在线用户卡、服务器卡（→ `/dashboard/servers`）和工单卡（→ `/dashboard/ticket`），重启按钮在系统服务卡 | 点击跳转 + 重启对话框取消，restart 请求 0 次 |
| 10 | 改写 | 四种状态可区分：失败的卡片显示失败文案和重试，不显示 0、空状态或「无待处理」；成功的卡片照常显示真实结果，不受其他模块失败影响。A 没有整体健康徽标，原第 10 条中关于整体徽标的一项不再适用 | 逐模块构造失败 / 挂起响应 |
| 11 | 改写 | 键盘可以到达服务器卡、工单卡、在线用户卡的链接，**两张统计卡**的切换、**两张排行卡**的切换和重启按钮，有可见焦点；选中状态可被辅助技术识别；图表提供可读取的数据说明。不指定读屏软件 | 真实键盘 Tab / 方向键 + 无障碍树 |
| 12 | 改写 | 1440 和 390 下检查 **KPI 卡**、长名称和空状态：首屏异常卡可读；长名称截断但能读到全名；数值完整显示；窄屏无页面级横向溢出 | 尺寸测量 + 截图，含赞助区有效数据场景 |

### 和「运行状态优先」的冲突

B 阶段的需求写的是「运行状态先于收入」。A 把服务器和工单放在 KPI 网格第二行，和流量指标等权，不再「先于」其他信息。Board 改选 A 就是接受了这一点，所以：

- 原 README「已确认的设计决定」里「采用 B 运维优先，运行状态先于收入」以及「B 的关键流程」第 1 步，在 A 下**不再适用**，只保留为历史记录。
- 保留的是验收 4：异常项仍然必须在首屏内、并且有颜色提示。A 靠卡片颜色满足它，不靠位置优先。

### 证据复用

B 的浏览器证据（run3）是在 B 布局上取得的，下面这些和布局无关，A 实现后可以复用结论，但仍要在 A 的页面上抽样重测一次，确认没被改坏：token 对比度（2、7）、tabular-nums（6）、admin 作用域（8）、重启流程和请求次数（9 的重启部分）。

下面这些依赖布局，必须在 A 上重新取证，不能把 B 的截图改个名当作 A 通过：1、3、4、5、9 的跳转入口、10、11、12。

## 测试后端联调

Board 已在确认卡 `15bad64a-6b33-4606-8efa-43938cc83d17` 中同意不做测试后端联调（2026-10-27 09:49 UTC）。A 的浏览器证据仍用构造响应取得，只能证明前端在这些响应下的行为。

## 不在本方案内

- 合并、发布、部署：A 的实现 PR 合并到 main 会像 B 一样触发公开镜像发布和测试集群 Flux 滚动更新，需要按当时的授权另行确认。
- 可用性研究：仍是后续可选研究，不是门禁，也不声称 A 提高了效率。
- PR #34 的原型文件不改。
