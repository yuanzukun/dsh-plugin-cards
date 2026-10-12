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
├── assets/                # cards-snapshot.json 快照原料（assemble-client 裁剪后注入 lib/client.js 成出厂快照）
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

市场目录**唯一来源**为官方社区仓库 [github.com/topics/dsh-plugin](https://github.com/topics/dsh-plugin)：

- 发现条件：`topic:dsh-plugin` + 近 12 个月有更新 + 名称/描述/标签含 `dsh`（★ 不限，完整覆盖官方 topic 页）
- 分层合规：L1 声明 `dsh.bundle` 才可安装（宿主硬门禁）→ L2 `dsh.engine` 与桌面端 0.2.0-rc.2 semver 兼容（不兼容默认隐藏）→ L3 展示规范三件套（icon/locale/package.json exports）计 0-3 分仅作排序
- 目录按 GitHub 仓库身份（`full_name`）去重（0.9.10）：同一仓库被多个 npm 镜像/抢注包回挂时收敛为一条（npm-only 条目按包名天然唯一）；保留优先级 可安装 > npm 名与仓库名一致 > 展示合规分 > 星数 > 来源 both>github>npm
- 描述中文优先级（0.9.10）：快照自带 `description_zh`（hub 侧 LLM 预翻译，就绪后离线也全中文）> 运行时翻译（LLM 批量 → MyMemory 兜底）> 原文；搜索域包含译文（0.9.14），中文关键词可命中英文描述插件
- 未翻译可见化（0.9.14）：本页存在未译出的英文描述时工具行显示「⚠ {n} 条未翻译」，点击重置翻译通道并重试（翻译按页懒执行）
- 二级分类（0.9.11）：六个大类（智能体与技能/界面与桌面/记忆与知识/工具与自动化/框架与宿主集成/模型与多模态）选中后浮出子类 chips 行，与父类 AND 过滤、精确计数；分类兜底阶段 `dsh-`/`dsh_` 名称前缀归入框架与宿主集成，「其他」长尾实测 682 → 56 条
- npm 渠道仅作富化（版本/可安装性），不在官方 topic 页的纯 npm 条目默认显示（0.9.5 起默认开，可关回官方 topic 纯口径）；宿主本体仓不借星
- 安装/更新/启停/卸载的生效语义对齐官方：宿主无 HMR 时返回 `restart-required`，界面明确提示「下次启动 DeepSeek Harness 后加载」（桌面端安装后需重启宿主生效，刷新页面无效）
- 数据通道：hub 每日 02:30/14:30 快照（jsDelivr）+ 面板常驻每 30 分钟静默检查 +「官方源同步」实时全量直采兜底；发版时内联出厂快照作离线首屏（**0.9.8 起按星裁剪：GitHub/both Top 1500，约 0.8MB；✏️ 0.9.20 起原料为 hub 1.4.2 新口径（无 npm-only 条目，`--npm-keep` 保留仅防御），出厂原料 13721 条 / 内联 0.77MB；完整目录打开市场后由在线链路自动补齐**，裁剪参数见 `scripts/assemble-client.cjs --keep/--npm-keep`）
- 缓存配额适配（0.9.20）：1.4 万条目下 localStorage 同源共享配额（~5.24M chars）必超——`zhmap`（full_name→descZh 翻译映射）优先写入保住 0.9.16 反英文固化链路；catidx 全量缓存超限后按设计放弃持久化（旧缓存原子保留，jsDelivr HTTP 缓存承接重拉 + 重建 ~230ms 兜底）；容量探针 `scripts/verify-snapshot-capacity.cjs` 可复现实测
- 中文全覆盖（0.9.21）：市场全部条目描述均为中文显示——CI 翻译 + 原文即中文 + 空描述/占位描述渲染弱化「暂无描述」（无英文残留入口，全量 13650 条审计 enResidual=0）；出厂快照刷新至全中文口径（hub 修复 tx-cache 英文污染后重建，重要数据更新后需 purge jsDelivr CDN 缓存）
- 快照新鲜度守卫（0.9.22）：多源候选拉取校验 `builtAt`（SNAP_STALE_MS=13h，对齐 hub 02:30/14:30 双跑间隔）——jsDelivr fastly/gcore 镜像域不响应 purge、缓存滞后 12-24h，超龄源不再直接采用而继续尝试下一候选，全源耗尽取最新陈旧版兜底（离线可用性优先）；顺带修复 trySnap 递归调用丢失 `minBuiltAt` 导致缓存被更旧快照降级覆盖的问题
- UI 审计批次 B（0.9.23）：工具行控件高度统一 26px（chip 按钮原 22px 与 ghost 26px 混排）；分类行默认单行折叠 69→30px（「更多 ▾」展开全量）；未翻译 chip 明示 MyMemory 429 退避剩余分钟；卡片常驻 subtle 阴影 + avatar 38→30px 紧凑化（卡高 151→143）；窄屏 ≤480px 分类/子类 chips 墙（432px）替换为下拉选择器
- 安装失败文案友好化（0.9.23）：网络类预检失败不再直出宿主英文天书——git 来源插件会被宿主安装前 GitHub 连接预检拒装（`connection to github.com timed out after 5000ms`，宿主 `githubConnectionTimeoutMs` 默认 5000ms、无镜像 fallback，国内网络抖动/代理中断必现；2026-10-12 desktop/web 双端真机取证），超时/DNS/连接重置类错误统一换为中文人话 + 自救引导（点重试 / 查代理 / CLI 命令安装）；识别逻辑为纯函数 `classifyNetError`（单测覆盖），环境侧可在 profile `cordis.patch.yml` 以 `- id: plugin-manager` 调大 `githubConnectionTimeoutMs`（本机双 profile 已设 20000）
- 安装失败自动降级 + git 文案补匹配（0.9.24）：① 0.9.23 分类正则只认 Node 错误码（`ECONNRESET`），git CLI 人话文案（`Recv failure: Connection was reset` / `unable to access 'https://github.com/...'`）漏匹配仍直出天书（真机二次踩坑）——补入正则；② 网络类失败自动降级链：`github:` spec 失败 → 探测 npm 同名包（jsDelivr CDN 拉候选 package.json，`repository` 字段一致性校验防同名抢注；命中则用 npm 名重装，宿主 npm 通道自带 npmmirror 兜底，大陆免 VPN 稳定）→ 无候选/校验不过 → 原通道自动重试一次（间歇性故障重试命中率高）；`opts` 标记防降级循环，npm 版本可能略滞后于仓库（结果卡片有提示）
- 网络失败降级梯 + hub tgz 镜像池（0.9.24，Zotero 中文社区模式）：降级链升级为五级梯（`netSeq` 严格递增防循环）——① npm 同名探测 → ② hub 镜像 tarball（快照条目带 `tgz` 字段时，`cdn.jsdelivr.net/gh/yuanzukun/dsh-plugin-hub@master/public/tgz/{owner}__{repo}.tgz`，hub CI 预构建、sha256 锚定）→ ③ codeload tarball URL（真机实测与 github.com 主站不同网络路径：主站 clone 间歇被 RST 的同一时段 codeload 5/5 全通；宿主/pnpm 均原生接受 tarball URL spec，已实测装通）→ ④⑤ 原通道重试 ×2（退避 0.8s/3s）。配套 hub 侧 `fetch-cards-snapshot.mjs` 1.6.0 tgz 池：github 独源条目 star 降序 + `--tgz-limit`（默认 2000/轮）预构建，`pushedAt` 未变走 `data/tgz-cache.json` 零下载复用，>20MB 跳过（jsDelivr gh 单文件上限），失败记录下轮重试、不阻断构建
- 降级梯三连盲区终局修复（0.9.25，2026-10-12 真机三踩复盘）：① 分类正则补 pnpm fetch 文案（`TimeoutError` / `aborted due to timeout` / `error (23)`）——此前 pnpm 抓 codeload 中断重试耗尽后梯子整级不触发，白等完整 pnpm 周期后直出天书；② 梯子 npm 探测 promise 补 `.catch`（探测自身网络失败不再静默死亡，自动落到下一级）；③ **失败周期 4:19→~50s**：pnpm 11 设置必须写 profile `pnpm-workspace.yaml`（camelCase `fetchTimeout: 25000` + `fetchRetries: 1`，.npmrc 会被无视），双 profile 已生效（真机日志确认 "1 retries left"）。方法论沉淀：错误分类必须在翻译前完成并随异常对象传递（ChangeResult 译文 / pnpm 文案 / 探测 promise 三个断点均已闭合）；宿主 inspect 拒绝（如 `declares no dsh.bundle`）属供应链硬门禁非网络故障，梯子正确止步
- **梯子分类译文盲区修正（0.9.25，17:05 真机踩坑）**：宿主预检失败不走 RPC reject 而是返回 `ChangeResult{failed}` → `checkChange` 抛错时消息已被 `changeResultMessage` 翻成**中文** → catch 里 `classifyNetError(m)` 的英文正则认不出自己的译文 → **梯子整体不触发**，报错却写着「自动降级未成功」（预言自我实现）。修复：`netKeyFromChange(res)` 从原始 diagnostic 重分类并随 `Error.netKey` 传递，catch 优先取 `e.netKey`（单测含「中文译文不参与分类」回归用例）
- 分类前缀兜底修正（0.9.23）：`classifyItem` 的 dsh- 前缀漏斗原测 `item.name`——npm scoped 镜像名会覆盖 name（`@owner/dsh-xxx`，13668 条全量审计实测 619 条面 / 564 条仓库段实为 dsh- 开头），`@` 开头永不命中前缀 → 37 条漏进「其他」（占该桶 30%）；另有 dedup 胜出包名无 dsh- 前缀形态。改测 `full_name` 仓库段（GitHub 仓库名恒定，两形态同治）后「其他」123→87（0.9%→0.6%）；边界保持（`DSHdesktop`/`dshplugin`/纯 `DSH` 不算前缀，6 个边界单测）
- 折叠态选中分类提位（0.9.23）：分类行默认单行折叠后，低频分类被选中时高亮 chip 藏进折叠区、筛选状态反馈丢失——折叠时把 active chip 移到「全部」之后保证首行恒可见（已在首位的原序返回不重建，免无谓重渲染）；展开态保持条数降序不动。纯函数 `promoteActiveCat`（单测覆盖）+ 真机 DOM 断言闭环（折叠提位/展开恢复降序/真实鼠标点击提位 chip 过滤正常）
- 界面文案只显示中文（EN 词典引用 ZH，完整走官方 locale 服务）

## License

[MIT](./LICENSE) © yuanzukun
