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
> - ⚠️ **CLI 本地路径安装陷阱**（2026-10-12 实测，宿主 0.2.0-rc.2）：`dsh plugin --profile <name> add <本地路径>`（link 模式）只写 dependencies，**不写 `dsh.profile.bundles` 激活清单** → 插件 UI 仅在当前实例存活，实例重启后**静默消失**（`dsh plugin list` 只看 dependencies，极难察觉）。修复：手动把插件名加进 `~/.dsh/profiles/<name>/package.json` 的 `dsh.profile.bundles` 数组后重启。**市场 UI 安装的插件不受影响**（宿主自动补写 bundles）

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

- `engines.dsh` 声明为 `>=0.1.7-rc.2`（偏宽）：**完整功能（设置卡片 / 对话节点 / locale 服务）需宿主 ≥0.2.0**；旧宿主上 inject 硬依赖项 fail-fast 拒载，代码内另有防御（能力检查 + 中文回退）。官方版本兼容字段为 `engines.dsh`（SemVer range），`dsh.engine` 宿主不读（宿主二进制检索 0 命中实证）。

### 数据来源与合规

- 发现条件：`topic:dsh-plugin` + 近 12 个月有更新 + 名称/描述/标签含 `dsh`（★ 不限，完整覆盖官方 topic 页）
- 分层合规：L1 声明 `dsh.bundle` 才可安装（宿主硬门禁）→ L2 官方 `engines.dsh`（缺失回退 `@deepseek-ai/dsh*` peerDependencies）与桌面端 0.2.1-rc.5 semver 兼容（空/非法 range 判不兼容，不兼容默认隐藏）→ L3 展示规范三件套（icon/locale/package.json exports）计 0-3 分仅作排序，其中 **icon 合规从「字段存在」升级为「可加载」**（相对路径无 scheme/绝对/`..` + 扩展名限 svg/png/jpeg/webp，或导出 `./icon`；体积/`files` 覆盖待后续）
- 平台兼容（1.4.0）：插件声明 `dsh.bundle.platforms`（官方 Node 平台名数组，省略=全平台）时，不含当前系统的条目默认隐藏——宿主 `bundle-platform.ts` 对该组合包抛错跳过（装上即被跳过）；声明格式非法（空数组/含非 Node 平台名/非数组）恒隐藏。**判定在客户端按 `navigator.platform` 做**：hub 快照是跨平台分发产物（CI 构建机是 linux），在数据源侧按构建机平台过滤会整批删掉其它平台专用插件；`platformOk` 纯函数对无法判定的宿主返回 true 不误伤
- 目录按 GitHub 仓库身份（`full_name`）去重：同一仓库被多个 npm 镜像/抢注包回挂时收敛为一条（npm-only 条目按包名天然唯一）；保留优先级 可安装 > npm 名与仓库名一致 > 展示合规分 > 星数 > 来源 both>github>npm
- npm 渠道仅作富化（版本/可安装性），不在官方 topic 页的纯 npm 条目默认显示（可关回官方 topic 纯口径）；宿主本体仓不借星

### 分类与展示

- 六大类（智能体与技能/界面与桌面/记忆与知识/工具与自动化/框架与宿主集成/模型与多模态）+ 二级分类 chips 行，与父类 AND 过滤、精确计数；规则版本 `CATIDX_RULES_VER` 调整时 +1 使旧缓存失效
- 分类兜底：`dsh-`/`dsh_` 前缀漏斗测 `full_name` 仓库段（npm scoped 镜像 `@owner/dsh-xxx` 两形态同治）；全量 13748 条实测「其他」87 条（0.6%），剩余长尾基本为无描述/模板仓库
- 折叠态选中分类提位：分类行默认单行折叠，低频分类被选中时高亮 chip 提到「全部」之后保证首行恒可见（纯函数 `promoteActiveCat` + 单测）；窄屏 ≤480px chips 墙替换为下拉选择器
- 描述中文优先级：快照自带 `description_zh`（hub 侧 LLM 预翻译）> 运行时翻译（LLM 批量 → MyMemory 兜底）> 原文；搜索域包含译文，中文关键词可命中英文描述插件；本页有未译出条目时工具行显示「⚠ {n} 条未翻译」可点击重试
- 界面文案只显示中文（EN 词典引用 ZH，完整走官方 locale 服务）；工具行控件统一 26px，卡片常驻 subtle 阴影
- 平台兼容开关（1.4.0）：工具行与引擎兼容开关并列，默认开；关闭后被隐藏的「平台不支持」插件回到列表（排序沉底），与引擎开关同为客户端本地口径（缓存键含开关位）

### 安装与网络降级

- 安装/更新/启停/卸载的生效语义对齐官方：宿主无 HMR 时返回 `restart-required`，界面提示「下次启动 DeepSeek Harness 后加载」（桌面端安装后需重启宿主生效，刷新页面无效）
- **热更新宿主更新自动降级**（0.9.32）：宿主激活 Web 客户端热更新（`@deepseek-ai/dsh-client-hmr`）时，`installBundle` 对已装包一律抛 `already-installed`（HMR 下官方更新语义 = 先卸载再安装，见宿主 plugin-manager README；非 HMR 才是覆盖安装 + `restart-required`）——旧更新流程只跳过 inspect 预检，直接撞死在 install 拒绝上，已装插件全部无法更新（2026-11-04 真机：dsh-purge 更新 0:01 秒失败）。修复：`checkChange` 随 Error 传递宿主原始错误码 `changeCode`（0.9.25 方法论，译文不可二次识别），`updateBundle` 捕获 `already-installed` 后自动降级 `removeBundle → installBundle → 恢复启用`；HMR 下卸载不受 `stop-profile` 限制（宿主该检查 hmr 存在即跳过），两种宿主模式全覆盖
- **更新操作互斥 + 失败自动回滚**（0.9.33）：桌面端发版夜日志实证——更新梯子的卸载/重装被并发操作或页面刷新打断时，插件会停在「已卸载未装回」孤儿态（dsh-purge / dsh-think-translate 双双丢失，降级梯把「更新失败」放大成「插件消失」）。三件套修复：① install/update/build/uninstall 全部入客户端互斥链串行（排队时进度卡停「准备中」）；② 梯子重装失败自动回滚——registry 源退回精确旧版（warn 卡「已回滚到旧版」），git/tgz 源无法锁旧 HEAD → 同 spec 再试一次，仍失败给「孤儿 + 重装指引」fail 卡；③ 整页刷新统一 `requestPageReload` 门禁——有在飞/排队操作时延迟到最后一个操作收尾（成功后的 1.5s reload 曾在连续更新场景打断下一梯子的在飞 RPC），进度卡常驻「请勿刷新」提示。顺带：`opFailLabel` 补空格（「更新 xxx失败」→「更新 xxx 失败」）+ 宿主 `incompatible-version` 拒绝映射人话卡（此前英文码直出）
- **安装成功横幅带实装版本**（0.9.28）：横幅从宿主 `BundleInfo.version` 取本地真实版本（如 `已安装并启用：github:o/r（v1.1.71；…）`）——市场卡版本来自快照元数据（最长滞后一个快照周期），git HEAD 安装实装的是实时最新，卡面与横幅口径分裂会误导用户
- **市场路由状态持久化**（0.9.28）：搜索词/Tab/分类/子分类存 `dcards.mktview.v1`（localStorage，形状校验后恢复）——卸载/安装完成后宿主整页刷新会重挂载面板，不持久化则搜索词清空、被踢出市场上下文（真机 E2E 实证）；「清除筛选」同步清存储
- **git 依赖构建授权拦截**（0.9.28）：pnpm 11 对 git 托管依赖的 prepare 构建脚本默认硬拒绝（`ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED`），客户端识别该错误并换人话 + 展示 pnpm hint 打印的精确授权键；该路径程序化授权重试**结构性不可用**（宿主 `approveBuilds` 只批 pnpm 预写进 pnpm-workspace.yaml 的占位条目，硬失败路径无占位——真机两轮 + asar 源码双证），自救 = 把精确键（**两侧加英文双引号**，`@` 是 YAML 保留字符）写入 `allowBuilds:` 段后重试，或改走 npm 渠道（免授权）。generic 构建拦截（registry 包 Ignored build scripts）保留「授权构建并重试」流，且载荷已修正为宿主 wire schema 要求的字符串数组（旧对象载荷被边界校验拒绝，该流此前在宿主 0.2.0-rc.2 上整体失效）
- 网络类失败文案友好化：宿主 GitHub 连接预检 / git clone / pnpm fetch 的超时·DNS·RST 类错误统一换中文人话 + 自救引导（识别逻辑纯函数 `classifyNetError`，单测覆盖；环境侧可在 profile `cordis.patch.yml` 调大 `githubConnectionTimeoutMs`）
- **网络失败自动降级梯**（`netSeq` 严格递增防循环，走位决策已外提为纯函数 `ladderNext`，逐级走位有单测）：
  ① npm 同名探测（jsDelivr 拉 package.json，`repository` 字段一致性校验防同名抢注；命中换 npm 名重装，宿主 npm 通道自带 npmmirror 兜底）→ ② hub 镜像 tarball（快照条目带 `tgz` 字段时走 `dsh-plugin-hub` tgz 池，hub CI 预构建）→ ③ codeload tarball URL（与主站不同网络路径；spec 以 `#.tar.gz` 片段结尾通过宿主 `TARBALL_SPEC` 校验）→ ④⑤ 原通道重试 ×2（退避 0.8s/3s）；非 github: spec 退化为原通道重试 ×3
- 关键不变量（真机四踩沉淀）：错误分类必须在翻译前完成并随异常对象传递——`netKeyFromChange(res)` 从 ChangeResult 原始 diagnostic 分类（中文译文不参与分类，随 `Error.netKey` 传递）；pnpm 11 降级配置须写 profile `pnpm-workspace.yaml`（`fetchTimeout`/`fetchRetries`，.npmrc 会被无视）；宿主 inspect 拒绝（如 `declares no dsh.bundle`）属供应链硬门禁非网络故障，梯子正确止步

### 数据通道与缓存

- 快照通道：hub 每日 02:30/14:30 快照（jsDelivr 三镜像）+ 面板常驻每 30 分钟静默检查 +「官方源同步」实时全量直采兜底；新鲜度守卫 `SNAP_STALE_MS=13h` 对齐 hub 双跑间隔，超龄源不采用继续试下一候选，全源耗尽取最新陈旧版兜底（离线可用性优先）
- 出厂快照：发版时内联按星裁剪的 GitHub/both Top 1500（约 0.83MB，原料随 hub 批次增长；完整目录打开市场后在线补齐），裁剪参数见 `scripts/assemble-client.cjs --keep/--npm-keep`；**原料 `assets/cards-snapshot.json` 不入库**（git 体积治理，2026-10-12 方案 A）——CI 发版自动拉取，本地用 `node scripts/refresh-factory-snapshot.cjs`（候选清单与客户端 `SNAPSHOT_URLS` 单一来源）
- **出厂裁剪去重前置 + 去重双口径**（0.9.30 去重前置 / 0.9.31 拆分口径）：hub 快照同一仓库可被多个 npm 镜像/抢注包回挂（2026-10-30 批次实测 22274 raw → 19208 唯一，重复行 13.76%），旧裁剪直接对原始行按星取 Top1500 → 唯一仓库只剩 **1080**（28% 槽位被重复行挤占，离线首屏白丢 420 个插件）。修复：裁剪前先 `dedupByRepo` 收敛为每仓库一条再取星序 Top1500 → 唯一仓库恢复到 **1500**。**0.9.31 起去重拆双口径**：离线裁剪用仓库级 `dedupByRepo`（每仓一条，最大化唯一仓库覆盖）；在线市场视图用 `dedupItems`（npm 卡身份=npm 包名，monorepo 多包各占一卡，与 hub `dedupAfterProbe` 对齐；gh 裸卡在仓库存在可装 npm 卡时丢弃）。纯函数 `factoryTrim`/`dedupItems`/`dedupByRepo`（30 块，可单测）+ 单测覆盖。发版固定顺序不变：`node scripts/refresh-factory-snapshot.cjs` → `pnpm build` → 提交 `lib/` → 打 tag
- 缓存配额适配：1.4 万条目下 localStorage 同源共享配额必超——`zhmap`（翻译映射）优先写入保住反英文固化链路；catidx 全量缓存超限按设计放弃持久化（jsDelivr HTTP 缓存承接重拉 + 重建 ~230ms 兜底）；容量探针 `scripts/verify-snapshot-capacity.cjs` 可复现实测
- 重要数据更新后需 purge jsDelivr CDN 缓存（fastly/gcore 镜像域不响应 purge、缓存滞后 12-24h）

## License

[MIT](./LICENSE) © yuanzukun
