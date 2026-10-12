var jsx = require('react/jsx-runtime').jsx;
var react = require('react');
var useSyncExternalStore = react.useSyncExternalStore;
var useState = react.useState;
var useCallback = react.useCallback;
var useRef = react.useRef;

/** 本插件在 chat 目标下的节点 kind（渲染分发 key 与 definition.kind 一致） */
var CARDS_KIND = 'cards-annotation';

/** 预览文本最大长度 */
var PREVIEW_MAX = 80;

/** 本 bundle 的包名（= settings namespace = plugins.bundle.config 槽位 key） */
var PKG_NAME = 'dsh-plugin-cards';

/** ---- locale 接入（0.9.0，官方 ui-plugin.md「可见文本一律经 Client locale 服务」）----
 * 模式对齐官方 dsh-client-ui-plugin-manager：apply 里 ctx.locale.register(LOC_NS,{zh,en})
 * + ctx.locale.bind(LOC_NS) 拿稳定 translator；词典注册包 ctx.effect 卸载即回收。
 * 0.9.2 用户决策「只显示中文」：EN 直接引用 ZH——任何宿主语言下都显示中文文案，
 * 仍完整走 locale 服务（官方规则合规），宿主无 locale face 时 T 维持 ZH 回退。 */
var LOC_NS = 'dsh-plugin-cards'

var ZH = {
  // ---- 聊天注记节点 ----
  'node.badge': '🗂 插件卡片',
  // ---- 配置卡片（plugins.bundle.config）----
  'cfg.loading': '配置加载中…',
  'cfg.unavailable': '配置命名空间当前不可用（内存模式或宿主未提供）。',
  'cfg.fEnabled': '启用插件',
  'cfg.fCardTitle': '卡片标题',
  'cfg.fMaxEvents': '最近事件条数',
  'cfg.fDensity': '信息密度',
  'cfg.dCompact': 'compact（紧凑）',
  'cfg.dDetailed': 'detailed（详细）',
  'cfg.fCatalogUrl': '社区源地址',
  'cfg.catalogHint': '支持 GitHub topics 页面地址（自动转换为 Search API 取数）或直接填 API 端点。',
  'cfg.fLlmEndpoint': '翻译端点',
  'cfg.fLlmModel': '翻译模型',
  'cfg.fLlmKey': '翻译 Key',
  'cfg.llmKeyPh': '留空则用 MyMemory 免费通道',
  'cfg.llmHint': '描述翻译走 OpenAI 兼容 /chat/completions（填 base 地址即可，自动拼接）；Key 仅在浏览器本地使用。',
  'cfg.notePersist': '修改即时写回 Host 配置文档。',
  'cfg.noteMemory': '当前为内存模式，修改不会持久化。',
  'cfg.grpCard': '节点卡片',
  'cfg.grpCatalog': '数据来源',
  'cfg.grpLlm': '描述翻译（LLM）',
  // ---- 市场区：侧栏 / Tab ----
  'mk.section': '社区插件',
  'mk.tabMarket': '插件市场',
  'mk.tabInstalled': '已安装',
  'mk.tabCustom': '自定义安装',
  'mk.tabSettings': '设置',
  'mk.instTitleTip': '管理已安装插件（启用/停用/更新/卸载）',
  // ---- 0.9.12：视图与布局 ----
  'mk.viewGrid': '网格',
  'mk.viewList': '列表',
  'mk.viewTip': '切换目录视图（网格 / 列表）',
  'mk.txMissing': '⚠ {n} 条未翻译',
  'mk.noDesc': '暂无描述',
  'mk.txMissingTip': '本页有 {n} 条英文描述未译出（翻译通道之前失败或配额耗尽，已被本轮停用）；点击重置通道并重试。翻译按页懒执行：翻到哪页译哪页',
  'mk.loadMore': '加载更多（剩 {n}）',
  'mk.zeroStarTip': '暂无 star（社区热度信号缺失，排序按更新时间与规范合规分兜底）',
  // ---- 数据源 / 同步 ----
  'mk.syncTipBase': '当前目录数据生成于 {at}（hub 快照每日 02:30/14:30 自动构建；打开市场时后台自动刷新，面板常驻时每 30 分钟自动检查）',
  'mk.syncTipOfficial': '；官方源（github.com/topics/dsh-plugin）上次全量直采：{at}（每 24h 自动，或点「官方源同步」手动）',
  'mk.syncTipStale': '；⚠️ 数据已 {d} 天未更新（在线快照可能持续拉取超时），建议点右侧「官方源同步」强制直采',
  'mk.chipStale': '⏳ ',
  'mk.chipDirect': '📡 直采 ',
  'mk.chipTime': '📅 时间 ',
  'mk.osyncBtn': '官方源同步',
  'mk.osyncBusy': '同步中…',
  'mk.osyncTitle': '从官方源 github.com/topics/dsh-plugin 全量直采目录（Search API 分页抓取，未认证限流 10 次/分，约需数分钟；完成后自动替换当前列表）',
  'mk.osyncDone': '⟳ 正在从官方源（github.com/topics/dsh-plugin）全量同步目录…完成后自动替换',
  'mk.ssnapBtn': '同步快照',
  'mk.ssnapTitle': '立即重拉 hub 每日快照（jsDelivr CDN，秒级，绕过 1h 自动节流）。需实时抓官方 GitHub 全量（约 6-12 分钟）请用「官方源同步」',
  'mk.ssnapDoing': '⟳ 正在同步最新快照（hub 每日构建，秒级）…',
  'mk.ssnapFail': '快照已是最新或本次拉取未成功，可稍后重试；需实时全量请点「官方源同步」',
  // ---- 工具行 ----
  'mk.searchInCat': '在该分类 {n} 条中搜索…',
  'mk.searchAll': '在全部 {n} 条中搜索…',
  'mk.searchPage': '在当前页 {n} 条中搜索…',
  'mk.sortTip': '切换目录排序方式（服务端排序）：★ 最多 / 最近更新',
  'mk.sortUpdated': '排序：最近更新',
  'mk.sortStars': '排序：★ 最多',
  'mk.starTip': '过滤低星长尾噪音（三档循环：全部 → ≥10★ → ≥50★）。注意：纯 npm 来源条目（无 GitHub 仓库）没有星数，选门槛后会隐藏这批',
  'mk.starAll': '星数：全部',
  'mk.starMin': '星数：≥{n}★',
  'mk.loading': '加载中…',
  'mk.refresh': '刷新目录',
  // ---- 分类行 ----
  'mk.catLabel': '分类：',
  'mk.subLabel': '子类：',
  'mk.subAll': '全部',
  'mk.catAll': '全部',
  'mk.tipExactAll': '全量 {n} 个（逐条精确统计，已去除 fork/存档）',
  'mk.tipApiAll': '全源共 {n} 个（API 精确值）',
  'mk.tipExact': '全量精确统计：{n} 个；点击跨页筛选',
  'mk.tipExactRunning': '全量精确统计进行中（见下方进度）；点击暂只过滤当前页',
  'mk.scopeReady': '计数口径：全部与各分类均为全量精确统计（{n} 条逐条分类',
  'mk.scopeInst': '，仅可安装口径',
  'mk.scopeSnapshot': '数据源：',
  'mk.srcFactory': '插件出厂快照（后台静默刷新中）',
  'mk.srcHub': 'dsh-plugin-hub 每日快照',
  'mk.scopeAuto': '，每 24 小时自动刷新',
  'mk.scopeClose': '）',
  'mk.scopeClick': '；点击分类跨页筛选',
  'mk.idxLoading': '全量精确统计中：已抓取 {done} 条（GitHub 限流 10 次/分钟，全量约需数分钟，完成后缓存 24 小时）；期间点击分类仅过滤当前页',
  'mk.idxError': '全量精确统计失败（限流或网络异常），重新打开面板后自动重试；当前点击分类仅过滤当前页',
  'mk.idxLocal': '分类计数为本页口径（自建源或统计不可用时无全量数据）',
  // ---- 状态行 ----
  'mk.fetchFailed': '目录获取失败：',
  'mk.progLine': '⏳ {label} · {phase} · {s}s',
  'mk.pnpmExit': '（pnpm 退出码 {code}）',
  'mk.buildRetryBtn': '授权构建并重试：{spec}',
  'mk.buildRetryTip': '等效于把 pnpm 提示的包键写入 profile 的 pnpm-workspace.yaml allowBuilds，经 installBundle approvedBuilds 程序化授权（仅对该包生效）',
  'mk.ignore': '忽略',
  // ---- 已安装 Tab ----
  'mk.instLoading': '正在读取已安装列表…',
  'mk.instEmpty': '还没有已安装的插件。',
  'mk.goMarket': '去插件市场逛逛',
  'mk.hasUpdate': '有更新',
  'mk.hasUpdateTip': 'npm 实时检测：最新 v{latest}（已装 v{cur}）；点「更新到」重装',
  'mk.stOn': '已启用',
  'mk.stOff': '已停用',
  'mk.disableBtn': '停用',
  'mk.enableBtn': '启用',
  'mk.disableTip': '停用该 bundle（从 profile 组合列表移除，可再启用）',
  'mk.enableTip': '启用该 bundle',
  'mk.updateTo': '更新到 v{v}',
  'mk.updateTip': '更新 = 精确安装 v{v}（npm 实时检测，不走 @latest 避免镜像滞后）',
  'mk.uninstall': '卸载',
  'mk.uninstalling': '卸载中…',
  'mk.confirmUninstall': '确认卸载？',
  'mk.uninstallTip': '卸载该插件（两步确认）',
  'mk.uninstallTip2': '再点一次确认卸载（卸载立即生效，页面会自动刷新）',
  'mk.uninstallBlockedTip': '该 bundle 不允许卸载（profile 内置依赖或受宿主保护）',
  // ---- 卡片 ----
  'mk.unnamed': '(未命名)',
  'mk.installedBadge': '已安装',
  'mk.installedTip': '已安装（在「已安装」页管理：启用/停用/卸载）',
  'mk.updateCardTip': '已装 v{cur}，{src}最新 v{latest}；更新 = 按此卡片来源重装',
  'mk.updating': '更新中…',
  'mk.notInstallable': '不可安装',
  'mk.notInstallableTip': '快筛未在 package.json 发现 dsh.bundle 声明（官方插件硬要求），安装会被宿主拒绝',
  'mk.install': '安装',
  'mk.installing': '安装中…',
  'mk.badgeOfficial': '官方',
  'mk.verTipRt': 'npm 实时最新版（registry 直查）',
  'mk.verTipPkg': 'package.json version（快筛/registry 读取）',
  'mk.updatedAtTip': '仓库最近更新：{d}（GitHub 口径，目录数据日级新鲜；无 npm 发布时间语义）',
  'mk.updatedRel': '更新于 {rel}',
  'mk.emptyResult': '没有匹配的插件。',
  'mk.emptyTitle': '没有匹配的插件',
  'mk.emptyDesc': '当前筛选条件下没有结果，试试调整关键词或放宽过滤。',
  'mk.clearFilters': '清除全部筛选',
  'mk.srcRt': 'npm 实时',
  'mk.srcFast': '快筛',
  // ---- 分页 ----
  'mk.prev': '上一页',
  'mk.next': '下一页',
  'mk.perPage': '每页',
  'mk.perPageN': '{n} 个',
  'mk.pageInfo': '第 {p} / 共 {total} 页 · 共 {n} 个',
  'mk.pageInfoCat': '（{cat} 精确统计）',
  'mk.pageMatch': '（本页匹配 {n} 条）',
  // ---- 自定义安装 Tab ----
  'mk.customPh': 'npm 包名 / github:owner/repo 或完整 GitHub URL / 本地 tgz 绝对路径',
  'mk.installDots': '安装…',
  'mk.customNote1': 'npm 包名：最快，走 registry（如 dsh-palimpsest）',
  'mk.customNote2': 'github:owner/repo：也可直接粘贴完整仓库 URL 自动识别；克隆约 1 分钟，每个新 commit 首次安装/更新会弹一次 pnpm 构建授权，点允许即可（属安全设计）',
  'mk.customNote3': '本地 .tgz 绝对路径：离线安装；同版本重装可能被跳过，会给出警示',
  'mk.customNote4': '执行确认：提交后弹出确认层（安全提示 + 来源 + CLI 命令），确认后才执行安装；安装过程与实时进度和市场安装一致',
  // ---- 设置 Tab ----
  'mk.qualityTip': '仅显示近 12 个月有更新、名称/描述含 dsh 的仓库（★ 不限，完整覆盖官方 topic 页），压缩 topic 宽松匹配的噪音',
  'mk.quality': '质量过滤：{v}',
  'mk.on': '开',
  'mk.off': '关',
  'mk.onlyInstTip': '开：只显示可安装的插件（package.json 声明 dsh.bundle，官方硬要求）；关：显示全部（含不可安装与未快筛）。实时搜索兜底路径无快筛数据，不受此开关影响',
  'mk.onlyInst': '仅可安装：{v}',
  'mk.npmChanTip': '开（默认）：额外显示仅在 npm 收录、GitHub 仓库不在官方 topic 页（github.com/topics/dsh-plugin）的条目；关：只显示来自官方社区仓库的插件',
  'mk.npmChan': 'npm 渠道：{v}',
  'mk.engineTip': '开（默认）：隐藏 dsh.engine 与桌面端运行时不兼容的插件（装上即坏）；未声明引擎或未校验的条目不受影响，安装时由宿主终审。需要查看被隐藏的引擎不兼容插件时关闭',
  'mk.engine': '引擎兼容：{v}',
  'mk.engineBad': '引擎不兼容',
  'mk.engineBadTip': '该插件声明的 dsh.engine 范围与当前桌面端运行时（0.2.0-rc.2）不兼容，安装后可能无法加载；未声明引擎的插件不显示此徽章',
  'mk.srcNote1': '目录来源：官方社区仓库 github.com/topics/dsh-plugin（唯一默认来源：★ 不限 + 近 12 月更新 + 含 dsh）',
  'mk.srcNote2': 'npm 收录：仅在 npm 收录、仓库不在官方 topic 的条目默认隐藏（开「npm 渠道」才显示）',
  'mk.srcNote3': '可安装判定：package.json 声明 dsh.bundle（官方硬要求，安装时宿主终审）',
  'mk.srcNote4': '快照缓存：由 dsh-plugin-hub 每日构建，本地缓存 24 小时；快照全失败时自动降级实时搜索',
  'mk.llmLabel': '描述翻译：',
  'mk.llmOn': 'LLM（{model}）',
  'mk.llmOff': 'MyMemory 免费接口',
  'mk.scopeNote1': '分类计数：与「仅可安装」口径基于快照全量逐条统计',
  'mk.scopeNote2': '作用范围：分类行与搜索始终作用于插件市场页',
  'mk.scopeNote3': '本地存储：翻译缓存与快照缓存占用浏览器 localStorage，不影响宿主数据',
  'mk.note1': '目录口径：默认只显示可安装插件（package.json 声明 dsh.bundle，宿主安装时终审）',
  'mk.note2': '安全确认：安装前弹出确认层（安全提示 + 来源仓库 + CLI 命令），确认后才执行',
  'mk.note3': '已安装管理：支持 启用 / 停用 / 卸载 / 更新（更新 = 重装最新版）；git 来源插件建议在卡片上点「更新」按仓库地址重装',
  'mk.note4': '构建授权：含构建脚本的插件会被 pnpm 拦下，点「授权构建并重试」继续',
  'mk.note5': '生效语义：卸载 / 停用立即热生效（无需重启 profile），页面自动刷新完成清理',
  // ---- 安装确认弹窗 ----
  'mk.modalTitle': '确认安装',
  'mk.cancelTip': '取消安装',
  'mk.warnBox': '安装前请前往插件仓库仔细阅读源码，确认可信后再安装',
  'mk.rowPlugin': '插件',
  'mk.rowSource': '来源',
  'mk.copy': '复制',
  'mk.copyTip': '复制 CLI 安装命令',
  'mk.gitOnlyHint': '该插件仅有 git 来源：安装需克隆仓库（约 1 分钟），且可能触发 pnpm 构建授权确认。',
  'mk.copyCmd': '复制安装命令',
  'mk.directInstall': '直接安装',
  'mk.directInstallTip': '走与市场一致的两段式安装（安装后自动启用）',
  'mk.copied': '📋 已复制安装命令：',
  'mk.copyFail': '复制失败，请手动选择命令文本复制',
  'mk.reinstallWarn': '已安装 {name}@{ver}，目标版本 {target} 相同或更旧：重装可能被 pnpm lockfile 跳过（显示成功但内容未换），如需强制请先卸载再安装。',
  // ---- 操作反馈 / 错误 ----
  'mk.opInstall': '安装 {spec}',
  'mk.opInstallBuild': '安装 {spec}（授权构建）',
  'mk.opRemove': '卸载 {name}',
  'mk.opUpdate': '更新 {name}',
  'mk.opEnable': '启用 {name}',
  'mk.opDisable': '停用 {name}',
  'mk.preparing': '准备中',
  'mk.reject': '宿主拒绝该包：',
  'mk.reasonUnknown': '未知原因',
  'mk.stepVerify': '校验中',
  'mk.stepDownload': '下载安装中',
  'mk.stepEnable': '启用新插件',
  'mk.stepEnabling': '启用中',
  // ---- 0.9.6 安装进度卡片 / 结果卡片 ----
  'mk.stepFailed': '失败',
  'mk.sbarVerify': '校验',
  'mk.sbarDownload': '下载安装',
  'mk.sbarEnable': '启用',
  'mk.counts': '依赖解析 {resolved} · 已下载 {downloaded} · 缓存命中 {reused} · 新增 {added}',
  'mk.countsTip': '来自 pnpm 实时安装输出',
  'mk.rsOk': '成功',
  'mk.rsWarn': '部分成功',
  'mk.rsFail': '失败',
  'mk.rsElapsed': '耗时 {t}',
  'mk.rsFailedAt': '失败于「{step}」',
  'mk.rsExit': 'pnpm 退出码 {code}',
  'mk.rsRetry': '重试',
  'mk.rsRetryTip': '使用相同来源重新执行安装',
  // ---- 0.9.6 安装队列（多插件批量：串行执行防 pnpm 锁冲突） ----
  'mk.queueTitle': '安装队列（{n}）',
  'mk.queued': '排队中',
  'mk.queuedBadge': '已排队',
  'mk.queueAdd': '加入安装队列',
  'mk.queueAddTip': '当前有安装进行中：此插件加入队列，前一个完成后自动开始（失败时暂停等确认）',
  'mk.queueRemove': '从队列移除',
  'mk.queueContinue': '继续安装（{n}）',
  'mk.queuePaused': '队列已暂停（上个安装未成功完成）',
  'mk.installedOk': '✅ 已安装并启用：{spec}（宿主已即时生效，刷新页面后新插件界面可见）',
  'mk.installedOkRestart': '✅ 已安装并启用：{spec}（将在我下次启动 DeepSeek Harness 后加载；刷新页面不生效）',
  'mk.installedEnableFailed': '⚠️ 已安装：{spec}，但启用失败：{list}（可在「已安装」区块重试启用）',
  'mk.buildBlocked': '⚠️ 安装被 pnpm 构建授权拦下（插件带 prepare 构建脚本）：点下方「授权构建并重试」继续。',
  'mk.installFailed': '❌ 安装失败：',
  'mk.grantedOk': '✅ 已授权构建并安装：{spec}（宿主已即时生效，刷新页面后新插件界面可见）',
  'mk.grantedOkRestart': '✅ 已授权构建并安装：{spec}（将在我下次启动 DeepSeek Harness 后加载；刷新页面不生效）',
  'mk.enabledOk': '✅ 已启用：{name}（已即时生效）',
  'mk.enabledOkRestart': '✅ 已启用：{name}（将在下次启动 DeepSeek Harness 后加载）',
  'mk.disabledOk': '⏸ 已停用：{name}（已即时生效）',
  'mk.disabledOkRestart': '⏸ 已停用：{name}（将在下次启动 DeepSeek Harness 后停用）',
  'mk.opFailed': '❌ 操作失败：',
  'mk.removedOk': '🗑 已卸载：{name}（已立即生效；页面即将自动刷新完成清理）',
  'mk.removedOkRestart': '🗑 已卸载：{name}（将在下次启动 DeepSeek Harness 后完成移除；页面即将自动刷新）',
  'mk.removeFailed': '❌ 卸载失败：',
  'mk.updatedOk': '⬆️ 已更新到最新：{name}（已即时生效；页面即将自动刷新加载新版界面）',
  'mk.updatedOkRestart': '⬆️ 已更新到最新：{name}（将在下次启动 DeepSeek Harness 后加载新版界面）',
  'mk.updateFailed': '❌ 更新失败：',
  'mk.enableFailedItem': '{name}（{msg}）',
  'mk.opFailLabel': '{label}失败：',
  'mk.opCancelled': '{label}已取消（宿主已回滚变更）',
  'mk.rpcFailed': 'RPC 调用失败',
  'mk.errSource': '源返回异常: ',
  'mk.timeout': '请求超时（{s} 秒）——网络不通或源不可达',
  'mk.err403': 'HTTP 403——可能是 Search API 限流（未认证 10 次/分钟），请稍后重试',
  'mk.errAlreadyInstalled': '宿主预检认为该包已安装（更新流程会自动跳过此检查；若仍出现，请先卸载再安装）',
  'mk.errStopProfile': '该插件正被运行中的 profile 使用：请先停止对应 profile 再卸载（或改用「停用」）',
  'mk.errInUse': '该插件有正在运行的插件行：请先「停用」，或停止 profile 后再卸载',
  'mk.errNotRemovable': '该 bundle 不允许卸载（profile 内置依赖或受宿主保护）',
  'mk.errManaged': '该 bundle 受宿主管理保护，不允许在面板操作',
  'mk.errNoDetail': '宿主返回失败但无错误详情',
  // 0.9.7：pnpm 11 默认 24h 供应链冷却（minimum-release-age）拦截——实测锁文件重校验不看 exclude 豁免，
  // 「装完刚发布的版本再卸载/更新」必踩；给原因 + 可执行自救，替代天书报错
  'mk.errMinAge': 'pnpm 11 供应链保护拦截：{pkg} 发布不足 24 小时，卸载/更新时会重校验整个 lockfile（该检查不受 exclude 豁免）。',
  'mk.errMinAgeFix': '自救：在 ~/.dsh/profiles/<当前profile>/pnpm-workspace.yaml 里加一行 minimumReleaseAge: 0 后重试；或手动执行 pnpm remove <包名> --config.minimum-release-age=0',
  'mk.fullLog': '（完整日志：~/.dsh/profiles/<profile>/.plugin-manager/logs/）',
  'mk.buildsInvolved': '；涉及构建：',
  'mk.andMore': ' 等 {n} 个',
  // ---- 分类名（键为 CATEGORY_KEYS 的英文语义键；中文原名仅作逻辑键，不入词典）----
  'cat.agents': '智能体与技能',
  'cat.ui': '界面与桌面',
  'cat.memory': '记忆与知识',
  'cat.tools': '工具与自动化',
  'cat.framework': '框架与宿主集成',
  'cat.market': '合集与市场',
  'cat.theme': '主题与外观',
  'cat.model': '模型与多模态',
  'cat.data': '数据与安全',
  'cat.other': '其他',
}

var EN = ZH // 0.9.2：用户决策「只显示中文」——任何宿主语言下都显示中文文案（仍走 locale 服务，官方规则合规）

/** 分类中文名（逻辑键，缓存/过滤/色板均以它为键，保持不变）→ 词典英文语义键 */
var CATEGORY_KEYS = {
  '智能体与技能': 'agents',
  '界面与桌面': 'ui',
  '记忆与知识': 'memory',
  '工具与自动化': 'tools',
  '框架与宿主集成': 'framework',
  '合集与市场': 'market',
  '主题与外观': 'theme',
  '模型与多模态': 'model',
  '数据与安全': 'data',
}
/** 分类显示名：中文逻辑键 → 当前语言文本（未收录的原样返回，含「其他」走 cat.other） */
function catLabel(cn) {
  if (cn === '其他') return T('cat.other')
  var k = CATEGORY_KEYS[cn]
  return k ? T('cat.' + k) : cn
}

/** 参数替换：'{name}' → params.name（与官方 translate() 同款语义） */
function tParams(str, params) {
  if (!params) return str
  return String(str).replace(/\{(\w+)\}/g, function (m, name) {
    return Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : m
  })
}

/** Translator：apply 前回退查 ZH 词典（宿主无 locale face 时保持中文）；apply 里切换为 ctx.locale.bind(LOC_NS) */
var T = function (key, params) { return tParams(ZH[key] !== undefined ? ZH[key] : key, params) }

/** locale 响应源：apply 里接到 ctx.locale 的快照 revision 与 subscribe（官方 plugin-manager 同款） */
var LOCALE_GET = function () { return 0 }
var LOCALE_SUB = function (cb) { return function () {} }
function useLocaleTick() { useSyncExternalStore(LOCALE_SUB, LOCALE_GET) }

/** 社区目录默认数据源：官方社区插件仓库页面（用户语义入口；取数时自动转为 Search API） */