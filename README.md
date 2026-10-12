# dsh-plugin-cards

DeepSeek Harness (dsh) 插件：**设置卡片 + 对话节点 + 插件市场**（社区插件发现 / 安装 / 管理）。

版本锚定：`dsh >= 0.1.7-rc.2`（上游最新，见 `docs/dsh-plugin-开发建议方案.md`）。

## 结构

```
├── package.json           # dsh.bundle manifest（组合包）
├── cordis.patch.yml       # 发布形态 patch（按包名引用）
├── cordis.dev.patch.yml   # 本地调试 patch（绝对路径，勿随包发布）
├── src/index.ts           # 插件入口（tsdown 只编译此文件 → lib/index.js）
├── src/client/            # 客户端源码真相源（按域分块：00-wrapper/10-runtime/20-node-ui/30-market-pure/40-market-helpers/80-market-section/99-apply）
├── lib/                   # 纯产物：lib/index.js（编译）+ lib/client.js（assemble-client.cjs 分块拼接组装）
├── assets/                # cards-snapshot.json 快照原料（assemble-client 裁剪后注入 lib/client.js 成出厂快照）——不入库（2026-10-12 方案 A）：本地 node scripts/refresh-factory-snapshot.cjs 拉取，CI 发版时自动从 hub 拉取
├── scripts/               # 工具脚本：assemble-client.cjs 组装 + load-client-pure.cjs 纯逻辑装载（测试/脚本共用）+ simulate-client-apply.cjs 客户端冒烟（CI 门禁）+ fetch-all-dsh.cjs 官方源收割复算（URL 构造与客户端同源）等
├── tests/                 # 纯逻辑单测（node:test 零依赖，pnpm test；已接入 release.yml 门禁）
├── .github/workflows/     # release.yml：tag 触发的全自动发布流水线
├── tsdown.config.ts       # 构建（esm → lib/，clean:true；client.js 由组装步骤在清空后重建）
└── docs/                  # 开发建议方案
```

## 本地调试（P0）

```sh
pnpm install
pnpm build
# 在 deepseek-harness 源码 checkout 根目录执行：
pnpm dsh web --patch D:/导航/dsh-plugin/cordis.dev.patch.yml
# 验证配置树：
pnpm dsh --profile web --dump-config   # 应出现 "# == dsh-plugin-cards" 层
```

启动后终端应打印 `[dsh-plugin-cards] plugin loaded!`，UI 在 `http://127.0.0.1:3080`。

## 其他人的安装方式（最终形态：桌面端）

普通用户不需要命令行，全程在桌面端 UI 完成：

1. 打开 DSH 桌面端（DSH Desktop / `dsh web` 面板）
2. 进入 **设置 → 插件 → 插件市场**
3. 搜索 `dsh-plugin-cards` → 点击 **安装**
   （市场目录来自官方社区仓库 [github.com/topics/dsh-plugin](https://github.com/topics/dsh-plugin)，本插件已收录；新插件最迟次日快照自动收录，缓存 miss 时静默收割约 6 分钟内可达）
4. 安装后自动启用：**设置卡片**出现在插件详情页内，**对话节点**渲染于 chat 目标

更新同样在市场内完成：已安装插件有新版本时卡片显示「有更新」，一键升级。

> 命令行备选（CI / 无头环境）：
> ```sh
> dsh plugin --profile desktop add dsh-plugin-cards    # 桌面端固定用 desktop profile
> dsh plugin --profile <name>  add dsh-plugin-cards    # 其他 profile（web 等）
> ```
>
> - ✅ **dsh 0.2.0+**：桌面端菜单栏「Manage dsh command」可内置 dsh 命令并管理插件，**无需另装 Node / pnpm**（官方 0.2.0-rc.2 起）；`dsh` 已在 PATH 时 CLI 与桌面端默认都用 `~/.dsh`，装完重启桌面端生效
> - ⚠️ 以下为 **0.1.x 旧版用户**备注：`dsh` 命令需在 deepseek-harness 源码 checkout 根目录执行 `pnpm dsh plugin ...`（本机无全局 dsh）；必须用与桌面端一致的 pnpm（v12），旧 pnpm 重建 modules 会假成功；若 npm 装到偏旧版本，多为 pnpm metadata 缓存陈旧，删除 `%LOCALAPPDATA%/pnpm-cache/v11/metadata/registry.npmjs.org/dsh-plugin-cards.jsonl` 后重试

## 发布（tag 流水线）

```sh
# ① bump package.json 版本 → commit → push main
# ② 打 tag 推送，其余全自动（版本门禁 → build → 语法检查 → lib 漂移守卫 → npm publish → npmmirror sync → GitHub Release）
git push origin main && git tag v0.9.4 && git push origin v0.9.4
```

前置：仓库 Secret `NPM_TOKEN`（granular token，勾选 Bypass 2FA for API and CI）。✅ 2026-09-26 已配置并跑通（v0.8.16 起全自动发布）。

## 内置插件市场的数据口径

市场目录**唯一来源**为官方社区仓库 [github.com/topics/dsh-plugin](https://github.com/topics/dsh-plugin)。本节只描述**当前生效口径**；版本演进与踩坑史见 [docs/dsh-plugin-开发建议方案.md](./docs/dsh-plugin-开发建议方案.md) 的版本状态流水。

### 宿主版本要求

- `dsh.engine` 声明为 `>=0.1.7-rc.2`（偏宽）：**完整功能（设置卡片 / 对话节点 / locale 服务）需宿主 ≥0.2.0**；旧宿主上 inject 硬依赖项 fail-fast 拒载，代码内另有防御（能力检查 + 中文回退）。

### 数据来源与合规

- 发现条件：`topic:dsh-plugin` + 近 12 个月有更新 + 名称/描述/标签含 `dsh`（★ 不限，完整覆盖官方 topic 页）
- 分层合规：L1 声明 `dsh.bundle` 才可安装（宿主硬门禁）→ L2 `dsh.engine` 与桌面端 0.2.0-rc.2 semver 兼容（不兼容默认隐藏）→ L3 展示规范三件套（icon/locale/package.json exports）计 0-3 分仅作排序
- 目录按 GitHub 仓库身份（`full_name`）去重：同一仓库被多个 npm 镜像/抢注包回挂时收敛为一条（npm-only 条目按包名天然唯一）；保留优先级 可安装 > npm 名与仓库名一致 > 展示合规分 > 星数 > 来源 both>github>npm
- npm 渠道仅作富化（版本/可安装性），不在官方 topic 页的纯 npm 条目默认显示（可关回官方 topic 纯口径）；宿主本体仓不借星

### 分类与展示

- 六大类（智能体与技能/界面与桌面/记忆与知识/工具与自动化/框架与宿主集成/模型与多模态）+ 二级分类 chips 行，与父类 AND 过滤、精确计数；规则版本 `CATIDX_RULES_VER` 调整时 +1 使旧缓存失效
- 分类兜底：`dsh-`/`dsh_` 前缀漏斗测 `full_name` 仓库段（npm scoped 镜像 `@owner/dsh-xxx` 两形态同治）；全量 13748 条实测「其他」87 条（0.6%），剩余长尾基本为无描述/模板仓库
- 折叠态选中分类提位：分类行默认单行折叠，低频分类被选中时高亮 chip 提到「全部」之后保证首行恒可见（纯函数 `promoteActiveCat` + 单测）；窄屏 ≤480px chips 墙替换为下拉选择器
- 描述中文优先级：快照自带 `description_zh`（hub 侧 LLM 预翻译）> 运行时翻译（LLM 批量 → MyMemory 兜底）> 原文；搜索域包含译文，中文关键词可命中英文描述插件；本页有未译出条目时工具行显示「⚠ {n} 条未翻译」可点击重试
- 界面文案只显示中文（EN 词典引用 ZH，完整走官方 locale 服务）；工具行控件统一 26px，卡片常驻 subtle 阴影

### 安装与网络降级

- 安装/更新/启停/卸载的生效语义对齐官方：宿主无 HMR 时返回 `restart-required`，界面提示「下次启动 DeepSeek Harness 后加载」（桌面端安装后需重启宿主生效，刷新页面无效）
- 网络类失败文案友好化：宿主 GitHub 连接预检 / git clone / pnpm fetch 的超时·DNS·RST 类错误统一换中文人话 + 自救引导（识别逻辑纯函数 `classifyNetError`，单测覆盖；环境侧可在 profile `cordis.patch.yml` 调大 `githubConnectionTimeoutMs`）
- **网络失败自动降级梯**（`netSeq` 严格递增防循环，走位决策已外提为纯函数 `ladderNext`，逐级走位有单测）：
  ① npm 同名探测（jsDelivr 拉 package.json，`repository` 字段一致性校验防同名抢注；命中换 npm 名重装，宿主 npm 通道自带 npmmirror 兜底）→ ② hub 镜像 tarball（快照条目带 `tgz` 字段时走 `dsh-plugin-hub` tgz 池，hub CI 预构建）→ ③ codeload tarball URL（与主站不同网络路径；spec 以 `#.tar.gz` 片段结尾通过宿主 `TARBALL_SPEC` 校验）→ ④⑤ 原通道重试 ×2（退避 0.8s/3s）；非 github: spec 退化为原通道重试 ×3
- 关键不变量（真机四踩沉淀）：错误分类必须在翻译前完成并随异常对象传递——`netKeyFromChange(res)` 从 ChangeResult 原始 diagnostic 分类（中文译文不参与分类，随 `Error.netKey` 传递）；pnpm 11 降级配置须写 profile `pnpm-workspace.yaml`（`fetchTimeout`/`fetchRetries`，.npmrc 会被无视）；宿主 inspect 拒绝（如 `declares no dsh.bundle`）属供应链硬门禁非网络故障，梯子正确止步

### 数据通道与缓存

- 快照通道：hub 每日 02:30/14:30 快照（jsDelivr 三镜像）+ 面板常驻每 30 分钟静默检查 +「官方源同步」实时全量直采兜底；新鲜度守卫 `SNAP_STALE_MS=13h` 对齐 hub 双跑间隔，超龄源不采用继续试下一候选，全源耗尽取最新陈旧版兜底（离线可用性优先）
- 出厂快照：发版时内联按星裁剪的 GitHub/both Top 1500（约 0.77MB，原料 13748 条；完整目录打开市场后在线补齐），裁剪参数见 `scripts/assemble-client.cjs --keep/--npm-keep`；**原料 `assets/cards-snapshot.json` 不入库**（git 体积治理，2026-10-12 方案 A）——CI 发版自动拉取，本地用 `node scripts/refresh-factory-snapshot.cjs`（候选清单与客户端 `SNAPSHOT_URLS` 单一来源）
- 缓存配额适配：1.4 万条目下 localStorage 同源共享配额必超——`zhmap`（翻译映射）优先写入保住反英文固化链路；catidx 全量缓存超限按设计放弃持久化（jsDelivr HTTP 缓存承接重拉 + 重建 ~230ms 兜底）；容量探针 `scripts/verify-snapshot-capacity.cjs` 可复现实测
- 重要数据更新后需 purge jsDelivr CDN 缓存（fastly/gcore 镜像域不响应 purge、缓存滞后 12-24h）

## License

[MIT](./LICENSE) © yuanzukun
