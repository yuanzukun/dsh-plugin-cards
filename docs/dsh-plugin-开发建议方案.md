# dsh-plugin 开发建议方案

> 基于 2026-09-25 官方文档（quickstart / develop/basic / publish）+ 社区生态（github topics/dsh-plugin、awesome-dsh-plugin）调研，结合本机 DSH Desktop 2.0.4 / dsh 0.1.2-alpha.1 实测经验。

---

## 一、官方文档核心结论（开发必须遵守的 8 条）

> ✏️ 2026-09-30：以下基于 0.1.x 文档；**0.2.0 起的官方规则清单（SKILL.md + references 五件）以《0.2.0-官方规则审计与修复方案.md》附录为准**，本文 8 条为开发期底板，冲突处从新。

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

> ✏️ 2026-09-30：本节数据截至 09-25，此后 5 天 topic 仓 5.5 倍增长且被灌水污染，格局已变天；**最新生态真相源见《插件市场分析-2026-09-30.md》**。另外 awesome 入驻路线已作废（用户决策：市场唯一来源 = github.com/topics/dsh-plugin），见第七节 P4。

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
| 设置卡片 | 导出 `interface Config` + `const Config: Schema = Schema.object({...})`（Schemastery），`apply(ctx, config)` 拿校验后配置 | 官方 config 机制；HMR 热替换无残留<br>✏️ **2026-09-30 已演进**：实际落地改为 **plugins.bundle.config 页**（0.2.2 起对齐官方 WebSearchCard 模式：`inject=['locale']` + `ctx.configForms` + form subscribe），Schemastery 方案未采用 |
| 对话节点 | 注册 `ConversationNodeDefinition` + keyed renderer，从 `session/event` 渲染；持久状态走扩展 `SessionEventMap` | 归属表官方路径 |
| **所见即所记** | 新增模型可见输入 ⇒ 必须新增对应 `SessionEvent` | 官方不变量，违反则回放/UI 失真 |
| 构建 | tsdown 专用配置直接转译 `src/`，不做类型检查、不用项目引用（参考官方 turtle-ui） | 保证 git 安装的 `prepare` 自包含 |
| 分发 | ① npm publish（首选，免构建授权）② tarball 备选 ③ git 安装（需 prepare + allowBuilds，锁 commit `#<sha>`） | publish 文档 |
| 版本锚定 | **目标锚定上游最新 `dsh-v0.1.7-rc.2`**（2026-09-24 发布）；本机验证双轨：① 源码跑 `pnpm dsh web`（0.1.7-rc.2，主验证环境）② 本机 DSH Desktop 2.0.4 内置运行时仍是 0.1.2-alpha.1，仅作兼容性副验证，待桌面版跟进 0.1.7 后切换 | 上游已到 0.1.7 系列，0.1.2 已落后两代；npm 上 `deepseek-harness` 是占位包，真实版本线在 GitHub Releases<br>✏️ **2026-09-30 已演进**：宿主现行为 **0.2.0-rc.2**（本机桌面端运行时即此版本），主验证环境 = 桌面端本尊；本插件 `dsh.engine` 保持 `>=0.1.7-rc.2` 兼容写法，见第七节 |

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

> ✏️ 2026-09-30：本表针对 0.1.7，宿主现行为 0.2.0-rc.2，**0.2.0 起的规则与破坏性变更以《0.2.0-官方规则审计与修复方案.md》为准**（如 V4 日志、locale 服务、ui-plugin 规则）。

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

---

## 七、状态同步（2026-09-30，上文为 09-25 立项时原始方案，以下为落地对照）

### 分阶段实施结果

| 阶段 | 状态 | 说明 |
|---|---|---|
| P0 脚手架与调试通路 | ✅ 完成 | `--patch` 调试通路 + `--dump-config` 验证按原方案落地；主验证环境后来切换为本机 DSH Desktop 0.2.0-rc.2 本尊（宿主已升级） |
| P1 设置卡片 | ✅ 完成 | 后演进为 plugins.bundle.config 页（0.2.2 对齐官方 WebSearchCard 模式），0.9.3 起分 3 组 |
| P2 对话节点 | ✅ 完成 | 所见即所记走 `user/message` 事件，0.9.4 色条胶囊容器 |
| P3 打包发布 | ✅ 完成 | tag 触发全自动流水线（v0.8.16 起）：build → npm publish → npmmirror sync → GitHub Release；当前 v0.9.11（流水线新增客户端冒烟门禁） |
| P4 生态入驻 | ⚠️ 部分变更 | dsh-plugin-hub 聚合页 ✅ 已建并每日构建；**awesome-dsh-plugin PR 作废**（用户决策 2026-09-30：市场唯一来源 = github.com/topics/dsh-plugin，不做外部渠道收录） |

### 立项后新增的能力（原方案未预见）

- **内置插件市场**（0.3.0 起萌芽，0.8.x 成型，0.9.1-0.9.2 分层合规，0.9.6 安装进度卡片化 + 安装队列，0.9.7 pnpm 24h 冷却拦截友好化）：发现/搜索/分类/一键安装/更新检测/已安装管理/自定义安装/批量排队安装（串行执行，失败暂停）；安装全程有进度卡片（步骤条 + pnpm 计数人读化 + 结果卡片/失败重试）；数据口径见 README「内置插件市场的数据口径」节
- **pnpm 11 供应链冷却应对**（0.9.7）：桌面端内置 pnpm 11.7.0 默认 `minimum-release-age=24h`，卸载/更新会重校验整个 lockfile 且 exclude 豁免不生效（pnpm 11 设计缺口，temp 副本实测）→ 客户端检测 `ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION` 给原因 + 自救指引（profile yaml 加 `minimumReleaseAge: 0`）；根治需上游（官方 plugin-manager 或 pnpm）处理
- **出厂快照裁剪 + 冒烟门禁**（0.9.8）：发版内联快照由全量 10607 条（≈5MB，npm 包 5.19MB）改为按星 Top 1500 + npm-only 可安装 100（client.js 0.91MB，npm 包约 1.1MB），完整目录仍由 hub 快照/官方源同步/静默收割在线补齐；simulate-client-apply.cjs 重写为可运行冒烟（内置 react stub + 注册点断言）并纳入 release.yml 门禁；locale meta.title 修复为插件名（宿主规则 meta.title ?? 包名，口号归 description），en 词典与 zh 分写
- **市场说明文案结构化**（0.9.8/0.9.9）：说明长文统一为「加粗标签 + 说明」卡片列表（noteUl 助手按全角冒号切分 + .dcards-note token 化样式），并按 Tab 归属拆分——market 目录口径/安装确认、installed 管理/构建/生效、custom 三种来源、settings 数据源明细，各页只显示自己的说明
- **目录去重 + 描述中文化前置 + 排版修复**（0.9.10）：① hub 快照内同一 GitHub 仓库被多个 npm 镜像/抢注包回挂（实测 dsh-market/dsh-market 同名 4 条、全量收敛 2704 条重复），catIdxFromSnapshot 按 full_name 去重（npm-only 按 npm 名），保留优先级 可安装>npm名与仓库名一致>ms>stars>both>github>npm（确定性）；② 卡片描述读取快照 `description_zh` 字段（hub 侧 LLM 预翻译，字段就绪即全量中文，运行时翻译降级为兜底）；③ 排版：分类 chips 自适应排列（紧凑 11px 变体 + 自动换行铺满行宽 +「全部」恒居首其余按条数降序自动排，弃横滚方案）、desc 区 min-height 54px 齐底、描述连续「\|」分隔符清洗为「·」、scope 说明第 2 行去掉行首「；」；CATIDX_RULES_VER → 6（旧索引缓存自动失效）
- **二级分类 + 漏斗修补**（0.9.11）：① 六个大类（≥300 条）配子类——智能体与技能（多智能体/技能包/提示词与角色扮演/智能体框架）、界面与桌面（桌宠与桌面应用/可视化与侧边栏/移动端/Web 界面）、记忆与知识（长期记忆/RAG 与知识库/联网搜索）、工具与自动化（MCP 服务器/科研与写作/终端与 CLI/效率与账单）、框架与宿主集成（DSH 生态/Cordis 生态/其他宿主/通用集成）、模型与多模态（图像与视觉/语音与识别/供应商与用量）；子类 chips 仅在选中父类后浮出一行（与父类 AND 过滤，换父类重置，取消即收起），精确计数随索引现算，子类 topics 优先 kw 兜底首中即止 + catchall 承接；② 漏斗修补：classifyItem 兜底阶段补 `dsh-`/`dsh_` 名称前缀 → 框架与宿主集成、`dsh-plugin-market` topic 移交合集与市场，实测「其他」682 → 56 条；CATIDX_RULES_VER → 7
- **locale 服务接入**（0.9.0）：对齐官方 `dsh-client-locale`；0.9.2 起只显示中文（EN 词典引用 ZH）
- **主题 token 化**（0.9.0）：全部引用宿主 `--dsw-alias-*`（0.2.0-rc.2 运行宿主 asar 取证 120 token）
- **上游快照链路**（dsh-plugin-hub）：每日两次构建 + 出厂快照内联（inject-snapshot.cjs）

### 版本锚定演进

0.1.7-rc.2（立项时）→ 宿主已发布 **0.2.0-rc.2**（桌面端本机运行时即此版本）；本插件 `dsh.engine` 声明保持 `>=0.1.7-rc.2`（向下兼容写法，semver 判定与 0.2.0-rc.2 相交）。官方规则审计与后续修复详见《0.2.0-官方规则审计与修复方案.md》第六节。

### 已修复问题索引

0.2.0 规则审计 6 项（A 主题 token / B 元数据 / C locale / D 回归 / E 剪贴板 / F README）+ 引擎判定 bug + UI 美化 7 项 + P0 均已关闭，逐项记录见《0.2.0-官方规则审计与修复方案.md》。
