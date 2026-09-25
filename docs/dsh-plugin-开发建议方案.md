# dsh-plugin 开发建议方案

> 基于 2026-09-25 官方文档（quickstart / develop/basic / publish）+ 社区生态（github topics/dsh-plugin、awesome-dsh-plugin）调研，结合本机 DSH Desktop 2.0.4 / dsh 0.1.2-alpha.1 实测经验。

---

## 一、官方文档核心结论（开发必须遵守的 8 条）

| # | 规则 | 出处 |
|---|------|------|
| 1 | 插件 = 导出 `apply(ctx)` 的 TS 模块，可选 `name` / `inject`；三种形态：函数（推荐）、对象、类（Service） | develop/basic |
| 2 | `inject` 数组声明依赖服务（如 `['tools','llm']`），框架保证就绪后才调 `apply`；未声明就访问 `ctx.tools` 得 undefined | develop/basic |
| 3 | `ctx` 上注册的一切（事件/工具/定时器）卸载时**自动清理**；手动资源用 `ctx.effect(() => { …; return cleanup })` | develop/basic |
| 4 | **组合包**（`dsh.bundle`，你分发的）与 **profile**（`dsh.profile`，用户启动的）是两个概念，**没有包同时是两者** | develop/basic/publish |
| 5 | bundle 的 `cordis.patch.yml` 中插件行按**包名**引用（非源码路径）；`--patch` 本地调试才用绝对路径 | publish |
| 6 | 后应用层**按行胜出**，patch 替换整行 `config` 值而非深合并 → 覆盖别人行时必须**重述全部键** | publish |
| 7 | git 安装拉源码不构建：作者必须提供**自包含 `prepare` 脚本**；pnpm≥10 用户还需在 `pnpm-workspace.yaml` 写 `allowBuilds` 授权 | publish |
| 8 | 免构建分发两条路：**npm 发布**（publish 前构建好 `lib/`）或 **tarball**（`pnpm pack`）——首选 npm | publish |

## 二、社区生态分层与空白点

| 层 | 代表 | 对本项目的意义 |
|----|------|---------------|
| 宿主 | deepseek-ai/deepseek-harness（Cordis，Everything is a Plugin） | API 唯一来源，peer 版本对齐目标 |
| 桌面壳 | anywhere-labs/dsh-desktop、dataelement/dsh-desktop | 本机运行环境；插件最终装进 profile bundle 层 |
| 插件目录 | awesome-dsh-plugin（279 条目）+ dsh-market | 入驻渠道；**会自动扫描并披露 capabilities / capabilityRedLines**，提交 PR 前先自查能力声明 |
| 聚合 bundle | @linxin666/dsh-web-all（20+ web-ui 子插件打成一个包） | 参考其 bundle patch 组织方式；注意它有 0.1.1-rc.x 版本代差问题，**不要**直接 opt-in 其 disabled 条目（如 web-ui-session-rdb，会抢 `ctx.sessionPersistence` 导致整树加载失败） |

**空白点确认**：你规划的「设置卡片 + 对话节点」属于 Web UI 扩展类插件（归属表：*添加 Web Client Chat 节点 → 注册 ConversationNodeDefinition + keyed renderer*），生态中这类成品少、需求真实，方向成立。

## 三、技术路线选型

| 决策点 | 建议 | 理由 |
|--------|------|------|
| 插件形态 | 函数插件为主；仅当对外提供服务时用 Service 类 | 官方推荐；Service 类抢注册服务名有整树崩溃风险（坑位 13） |
| 设置卡片 | 导出 `interface Config` + `const Config: Schema = Schema.object({...})`（Schemastery），`apply(ctx, config)` 拿校验后配置 | 官方 config 机制；HMR 热替换无残留 |
| 对话节点 | 注册 `ConversationNodeDefinition` + keyed renderer，从 `session/event` 渲染；持久状态走扩展 `SessionEventMap` | 归属表官方路径 |
| **所见即所记** | 新增模型可见输入 ⇒ 必须新增对应 `SessionEvent` | 官方不变量，违反则回放/UI 失真 |
| 构建 | tsdown 专用配置直接转译 `src/`，不做类型检查、不用项目引用（参考官方 turtle-ui） | 保证 git 安装的 `prepare` 自包含 |
| 分发 | ① npm publish（首选，免构建授权）② tarball 备选 ③ git 安装（需 prepare + allowBuilds，锁 commit `#<sha>`） | publish 文档 |
| 版本锚定 | **目标锚定上游最新 `dsh-v0.1.7-rc.2`**（2026-09-24 发布）；本机验证双轨：① 源码跑 `pnpm dsh web`（0.1.7-rc.2，主验证环境）② 本机 DSH Desktop 2.0.4 内置运行时仍是 0.1.2-alpha.1，仅作兼容性副验证，待桌面版跟进 0.1.7 后切换 | 上游已到 0.1.7 系列，0.1.2 已落后两代；npm 上 `deepseek-harness` 是占位包，真实版本线在 GitHub Releases |

## 四、分阶段实施计划

### P0 · 脚手架与调试通路（半天）
1. 在 `D:/导航/dsh-plugin` 建单包仓库：`package.json`（`type: module`，`main: lib/index.js`，peer 声明 `dsh: 0.1.7-rc.2`）+ `src/` + `cordis.patch.yml`
2. 主验证环境为**源码运行 0.1.7-rc.2**（`pnpm dsh web`）；本地调试走 `--patch` overlay：`pnpm dsh web --patch ./cordis.patch.yml`（此时插件行用**绝对路径**）
3. 验证工具：`dsh --profile web --dump-config` 查看配置树是否出现你的层；UI 在 `http://127.0.0.1:3080`
4. 兼容性副验证：装进本机 DSH Desktop 2.0.4（dsh 0.1.2-alpha.1）确认不崩；0.1.7 新 API 不可用时做特性降级

### P1 · 设置卡片（1 天）
1. Schemastery 定义全部可调字段并 `.default()`，**禁止硬编码任何部署可变参数**
2. schema 约束表达完备（错误在加载时响亮暴露，优于运行时怪异）
3. HMR 验证：改 config 热替换插件实例，确认注册被自动清理后重建

### P2 · 对话节点（2–3 天，核心工作量）
1. `inject` 声明所需 web/ui 相关服务，注册 `ConversationNodeDefinition` + keyed renderer
2. 渲染数据一律来自 `session/event`，不从内存旁路取
3. 如需持久会话状态：扩展 `SessionEventMap`，保证日志回放可复现
4. 回归项：禁用/卸载插件后节点消失且无残留

### P3 · 打包发布（半天）
1. `package.json` 加 `"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }`，patch 行改为**按包名**引用；`files` 只含 `lib/` + `cordis.patch.yml`
2. `pnpm publish` 前构建 `lib/`
3. 用户侧安装即 `dsh plugin --profile <name> add <包名>`，验证 `--dump-config` 出现 `# == <你的包>` 层

### P4 · 生态入驻（半天）
1. 提交 awesome-dsh-plugin PR：如实填写 capabilities（会被自动扫描比对，漏报/虚报都会在 dsh-market 卡片上露馅）
2. 同步收录进你自己的 dsh-plugin-hub 聚合页（中文描述、分类、复制安装）
3. README 给出 profile 安装命令 + 最小配置示例

## 五、风险清单（本机实测坑位 + 0.1.7 破坏性变更，开发期就要规避）

### 0.1.7 系列与本方案直接相关的破坏性变更

| 变更 | 对本插件的影响 |
|------|---------------|
| Agent 预设与设置改由**插件组合包 / Profile 管理** | 设置卡片正是走这条新通道——按 0.1.7 文档实现而非旧 Schemastery 单插件配置的写法 |
| `agent/session-start` 改为异步串行的 `agent/created`；弃用 `snapshotEvents` / `eventAt` / `ownEvents` | 对话节点若监听这些事件/API，一律用新名 |
| Session 日志升级 **V4** | 扩展 `SessionEventMap` 时按 V4 日志格式设计，勿按旧格式 |
| 工具输出预算 `maxInlineBytes` → `maxInlineTokens` | 若涉及工具输出展示，用新字段 |
| PTC 包名统一 `ptc-runtime` 系列、工作流执行器改 `workflow-ptc` | 依赖相关能力时用新包名 |
| 插件管理页上线（安装/配置/启停/运行时卸载） | 分发验证可直接用插件管理页，不必只靠 `dsh plugin` CLI |

### 本机实测坑位

| 风险 | 规避动作 |
|------|---------|
| 忘写 `inject` → undefined/崩溃 | lint 阶段强制检查 export |
| 裸 import `@deepseek-ai/*` 在 DSH Desktop 解析失败 | 只 import 宿主运行时确认存在的包；装后扫 `profiles/*/node_modules` 链接 |
| Service 同名注册 → 整树加载失败 | 不注册与宿主/常见插件同名服务；发版前 grep 冲突 |
| patch 覆盖丢键 | 覆盖行必须重述全部键 |
| 旧服务/旧 API 依赖（apiProxy 已被 TypertGatewayService 取代；上述 0.1.7 弃用项） | `inject` 与事件名全部对齐 0.1.7-rc.2 源码清单，装前 grep 复核 |
| profile `package.json` 被 BOM 污染 | 构建脚本统一 UTF-8 无 BOM 输出（已有 strip-bom 工具兜底） |
| 健康快照回滚撤销手工配置 | 排障时走 Recovery 窗口选 Skip，不选回滚 |

## 六、下一步

确认方案后从 P0 起步：先建脚手架打通 `--patch` 调试通路，再逐阶段推进。每阶段结束用 `--dump-config` + 重启验证，不批量合并。
