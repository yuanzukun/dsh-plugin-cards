/** ---- 分类与样式辅助（2026-10-11 从 createCommunitySection 外提）----
 * 全部为无状态纯函数/常量，不依赖组件渲染期变量；提升到闭包作用域后
 * 各组件共享单一实现（原先在组件体内，每次渲染重建闭包）。
 * 依赖：classifyItem（30-market-pure，函数声明提升，跨块可见）。 */

// 0.5.1：仅保留「分类」单行（0.4.4~0.4.5 的推荐行/话题行按用户决策移除）
function matchCat(item, cat) {
  if (!cat) return true
  return classifyItem(item) === cat
}

// 0.9.28 UI 巡检：控件高度统一基准 26px——此前 chip 22px / 搜索行 26px（显式覆盖）混排，
// 统一由 CHIP_STYLE_BASE 定高（border-box），搜索行的显式 height:26 覆盖保留但变为冗余无害。
var CHIP_STYLE_BASE = { padding: '2px 10px', borderRadius: '12px', fontSize: '12px', height: '26px', boxSizing: 'border-box', cursor: 'pointer', border: '1px solid var(--dsw-alias-border-l1)', background: 'var(--dsw-alias-bg-layer-1)', color: 'var(--dsw-alias-label-primary)', whiteSpace: 'nowrap', flexShrink: 0 }
function chipStyle(active) {
  var s = {}
  for (var k in CHIP_STYLE_BASE) s[k] = CHIP_STYLE_BASE[k]
  if (active) { s.background = 'var(--dsw-alias-brand-primary)'; s.borderColor = 'var(--dsw-alias-brand-primary)'; s.color = 'var(--dsw-alias-label-primary-inverted)' }
  return s
}
// 0.9.10 分类 chip 紧凑变体 → 0.9.28 UI 巡检收回：与全站 chip 统一 26px 基准
//（折叠行 max-height 30px 仍容得下 26px 单行；字号/内边距不再差异化，视觉一致性优先）。
function catChipStyle(active) {
  return chipStyle(active)
}

/** 0.9.28 UI 巡检：星数紧凑格式化（GitHub 风格）——≥1000 缩写为 11.5k（一位小数、去尾 .0），
 * 1000→1k、11527→11.5k、999→999；非法输入返回空串（调用方不渲染）。 */
function fmtStars(n) {
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) return ''
  if (n < 1000) return String(n)
  var k = n / 1000
  var s = k >= 100 ? String(Math.round(k)) : (Math.round(k * 10) / 10).toFixed(1)
  return s.replace(/\.0$/, '') + 'k'
}

/** 0.9.23：折叠态选中分类提位（纯函数，不改输入）——分类行默认单行折叠（overflow:hidden），
 * chips 按条数降序排列，低频分类被选中时高亮 chip 藏进折叠区、状态反馈丢失。
 * 折叠态把 active chip 移到「全部」之后保证首行恒可见；展开态 / active 为「全部」或不在列表时原序返回。 */
function promoteActiveCat(chips, activeCat) {
  if (!Array.isArray(chips) || chips.length < 2 || !activeCat || activeCat === chips[0].value) return chips
  var ai = -1
  for (var i = 1; i < chips.length; i++) if (chips[i].value === activeCat) { ai = i; break }
  if (ai < 0 || ai === 1) return chips // 不在列表或已在「全部」后首位 → 原序返回，免重建触发无谓重渲染
  var out = [chips[0], chips[ai]]
  for (var j = 1; j < chips.length; j++) if (j !== ai) out.push(chips[j])
  return out
}

/** 生成等价的面板外 CLI 安装命令（npm 双源卡片 spec 已优先 npm 名，最快路径）。 */
function cliCmdFor(spec) {
  return 'dsh plugin add ' + spec
}

/** ---- 0.9.23：宿主网络类预检失败识别（纯函数，供 friendlyManageError / changeResultMessage 共用）----
 * 2026-10-12 真机取证：installBundle 对 git 来源 spec 先跑 checkGithubConnection
 * （git ls-remote，宿主 githubConnectionTimeoutMs 默认 5000ms），超时原文
 * 「dsh: connection to github.com timed out after 5000ms」经结果卡片直出英文天书；
 * registry view 超时 / DNS 失败同类。命中 → 调用方换成人话 + 自救引导（重试/查代理/CLI 安装）。
 * github 键须排在 net 前——'connection to github.com timed out' 也含 'timed out after'。
 * 0.9.24 补 git CLI 文案（真机二次踩坑：预检通过后 clone 阶段报
 * 「fatal: unable to access 'https://github.com/x/y/': Recv failure: Connection was reset」，
 * 上一版只认 Node 错误码 ECONNRESET，git 人话文案漏匹配 → 天书直出）。
 * 0.9.24c 补 pnpm fetch 文案（真机三踩：pnpm 抓 codeload tarball 中断重试耗尽后报
 * 「TimeoutError: The operation was aborted due to timeout」——既非 Node 错误码也非 git 文案，
 * 梯子整级没跑，用户白等 4 分钟 pnpm 重试周期后直接天书报错）。 */
var NET_ERR_PATTERNS = [
  // github 键：消息里带 github.com 的连接失败（超时 / unable to access / Recv failure）
  { key: 'github', re: /connection to (?:[a-z0-9.-]+\.)*github\.com timed out|unable to access '[^']*github\.com[^']*'/i },
  { key: 'net', re: /timed out after|aborted due to timeout|TimeoutError|error \(23\)|Could not resolve host|getaddrinfo|ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|EAI_AGAIN|Failed to connect|network (?:failure|unavailable)|Recv failure|Connection was reset|connection reset/i },
]
function classifyNetError(m) {
  var s = String(m == null ? '' : m)
  for (var i = 0; i < NET_ERR_PATTERNS.length; i++) {
    if (NET_ERR_PATTERNS[i].re.test(s)) return NET_ERR_PATTERNS[i].key
  }
  return ''
}

/** 0.9.24b：宿主 ChangeResult{application:'failed'} → 网络分类键（''=非网络类）。
 *  必须从原始 diagnostic 分类——checkChange 抛出的 Error.message 已被 changeResultMessage
 *  翻成中文人话，classifyNetError 的英文正则对译文必然 miss（17:05 真机踩坑：梯子整体跳过）。 */
function netKeyFromChange(res) {
  var diag = res && res.error && res.error.diagnostic ? String(res.error.diagnostic) : ''
  return classifyNetError(diag.replace(/\x1B\[[0-9;]*[A-Za-z]/g, ''))
}

/** ---- 0.9.24：github spec → npm 降级候选（纯函数，配合 install 网络失败自动降级）----
 * 'github:owner/repo' → { owner, repo, npmName }；非 github: 形态返回 null。
 * npmName 取仓库名——dsh 插件惯例 npm 包名与仓库名一致（hub 快照 2846/13748 已挂 npm 链，
 * 未挂链但 npm 实际存在的（如 Ebony-Vinyl/dsh-our-free-model）正是本降级链的目标）。 */
function npmCandidateFromGithubSpec(spec) {
  var m = /^github:([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?$/i.exec(String(spec == null ? '' : spec).trim())
  if (!m) return null
  return { owner: m[1], repo: m[2], npmName: m[2] }
}

/** ---- 0.9.24：npm 候选校验（纯函数，防投毒）----
 * package.json 存在且 name 一致才算候选；带 repository 字段时必须指向同一 owner/repo
 * （不一致 → 拒绝，防同名抢注包）；无 repository 字段降级为「仅同名」弱信号。
 * 返回 'verified'（仓库字段一致）/ 'name-only'（仅同名）/ ''（不可用）。 */
function verifyNpmCandidate(pkgJson, owner, repo) {
  if (!pkgJson || typeof pkgJson !== 'object' || pkgJson.name !== repo) return ''
  var r = pkgJson.repository
  var url = r && typeof r === 'object' ? r.url : r
  if (!url) return 'name-only'
  return String(url).toLowerCase().indexOf((owner + '/' + repo).toLowerCase()) !== -1 ? 'verified' : ''
}

/** ---- 0.9.24：网络失败降级梯子的计划对象（纯函数）----
 * 真机实测（2026-10-12，无 VPN 直连）：codeload.github.com tarball 端点与 github.com 主站
 * 走不同网络路径——主站 clone 间歇被 RST 的同一时段 codeload 5/5 全通（小仓 625KB/1.3s）；
 * api.github.com 的 tarball 端点仅 302 回 codeload，无独立价值不入梯。
 * P2（Zotero 中文社区模式）：hub CI 把 github 独源插件 tarball 预构建进仓库 public/tgz/
 * 经 jsDelivr 国内可达分发，快照条目带 tgz 文件名 → 梯子优先走镜像；无 tgz 字段自动跳过。
 * （TGZ_BASE 定义在 30 块：SNAPSHOT_URLS 同源派生；var 赋值不提升，须在 30 导出前定义。） */

/** (快照条目|null, 安装spec) → 降级梯计划 { ghSpec, owner, repo, npmName, tgzUrl, cdlUrl }；
 * 非 github: spec 返回 null（调用方退化为原通道重试）。 */
function fbPlanFor(item, spec) {
  var s = String(spec == null ? '' : spec)
  if (s.indexOf('github:') !== 0) return null
  var cand = npmCandidateFromGithubSpec(s)
  if (!cand) return null
  var full = item && item.full_name ? String(item.full_name) : cand.owner + '/' + cand.repo
  return {
    ghSpec: s,
    owner: cand.owner,
    repo: cand.repo,
    npmName: cand.npmName,
    tgzUrl: item && item.tgz ? TGZ_BASE + item.tgz : '',
    // 0.9.26 修复（真机三踩 2026-10-12）：宿主 TARBALL_SPEC = /\.(?:tgz|tar\.gz)(?:#.*)?$/i
    // 要求 spec 以 .tgz/.tar.gz 结尾，裸 codeload URL（…/tar.gz/HEAD）被拒
    // 「a URL must point at a git repository or a tarball」。追加 URL 片段 #.tar.gz：
    // HTTP 请求忽略片段（仍走 codeload 独立网络路径），字符串却以 .tar.gz 结尾通过校验。
    cdlUrl: 'https://codeload.github.com/' + full + '/tar.gz/HEAD#.tar.gz',
  }
}

/** ---- 0.9.27：降级梯执行层决策（纯函数，从 80 块 install catch 外提）----
 * 输入：netHit（classifyNetError/netKeyFromChange 产物，''=非网络类）、fb（install 的 opts：
 *   netFbDone=①级 npm 已命中不再降级、netSeq=当前梯级 0=①npm 1=②tgz 2=③cdl 3/4=④⑤重试、
 *   fbPlan=随失败卡片续用的梯计划）、spec（本次安装 spec）。
 * 输出：下一动作对象或 null（梯子止步）：
 *   { kind:'probe', plan, delay }                          —— ① 级 npm 同名探测（异步探测由调用方做）
 *   { kind:'install', spec, fb, delay, msgKey?, repoFallback? } —— 换 spec 重装（delay=0 立即执行）
 *     msgKey: 'tgz'|'cdl'|'retry'（调用方映射 T() 文案；undefined=静默重试）
 *     repoFallback: tgz/cdl 级 op 卡显示名兜底（调用方 repoName || repoFallback；保真原实现）
 * 走位矩阵（单测 tests/pure.test.mjs「降级梯执行层」逐级断言，勿凭记忆改）：
 *   有 plan：probe(800) → ②tgz(800，无 tgz 字段原 spec 立即) → ③cdl(800) → ④retry(800)
 *            → ⑤retry(3000) → null。①级探测命中 → netFbDone 止梯。
 *   无 plan（非 github: spec）：原通道重试 ×3（seq0→1→2，3000ms/立即/立即）→ seq3 null。
 *     ⚠️ 旧注释「无梯退化重试 ×2」与实现不符——实际 ×3（seq1/2 走 install 分支原 spec 立即重试），
 *     0.9.27 外提时以实现为准修正注释并固化单测。
 *   netHit 空 / fb.netFbDone → 恒 null（非网络类失败与 npm 已换道不走梯）。
 */
function ladderNext(netHit, fb, spec) {
  if (!netHit) return null
  if (fb && fb.netFbDone) return null
  var p = (fb && fb.fbPlan) || fbPlanFor(null, spec) || null
  var seq = (fb && fb.netSeq) || 0
  if (seq === 0 && p) return { kind: 'probe', plan: p, delay: 800 }
  if (seq === 1) {
    return p && p.tgzUrl
      ? { kind: 'install', spec: p.tgzUrl, fb: { netSeq: 2, fbPlan: p }, delay: 800, msgKey: 'tgz', repoFallback: p.repo }
      : { kind: 'install', spec: spec, fb: { netSeq: 2, fbPlan: p }, delay: 0 }
  }
  if (seq === 2) {
    return p && p.cdlUrl
      ? { kind: 'install', spec: p.cdlUrl, fb: { netSeq: 3, fbPlan: p }, delay: 800, msgKey: 'cdl', repoFallback: p.repo }
      : { kind: 'install', spec: spec, fb: { netSeq: 3, fbPlan: p }, delay: 0 }
  }
  if (seq < 5 && (p ? true : seq < 2)) {
    return { kind: 'install', spec: p ? p.ghSpec : spec, fb: { netSeq: seq + 1, fbPlan: p }, delay: seq === 3 ? 800 : 3000, msgKey: 'retry' }
  }
  return null
}

var TAB_BASE = { padding: '6px 14px', fontSize: '13px', cursor: 'pointer', border: 'none', background: 'transparent', color: 'var(--dsw-alias-label-secondary)', borderBottom: '2px solid transparent', fontWeight: 500 }
function tabStyle(active) {
  var s = {}
  for (var k in TAB_BASE) s[k] = TAB_BASE[k]
  if (active) { s.color = 'var(--dsw-alias-brand-primary)'; s.borderBottomColor = 'var(--dsw-alias-brand-primary)' }
  return s
}

/** 0.9.28：ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED 报错解析（pnpm 11 git 依赖构建授权拦截）。
 * pnpm 源码级报错形态（2026-10-12 网络核验）：
 *   ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED
 *   The git-hosted package "name@version" needs to execute build scripts but is not in the "allowBuilds" allowlist.
 *   hint: … For example: allowBuilds: <depPath>: true
 * 其中 depPath 为含来源的精确授权键（如 name@github:owner/repo#commit 或 name@git+https://…），裸包名对 git 依赖无效。
 * 返回 { keys: [depPath…], pkg: 'name@version'|'' }；非该类报错返回 { keys: [], pkg: '' }。
 * ⚠️ depPath 内部含冒号（github: / git+https:），只能以尾部 ': true' 为终结符（非贪婪 + 空白界）。 */
function extractGitDepInfo(text) {
  var s = String(text || '')
  var isGitPrepare = s.indexOf('ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED') !== -1 ||
    s.indexOf('needs to execute build scripts') !== -1
  if (!isGitPrepare) return { keys: [], pkg: '' }
  var keys = []
  var re = /allowBuilds:\s*([^\s]+?):\s*true\b/g
  var m
  while ((m = re.exec(s)) !== null) { if (keys.indexOf(m[1]) === -1) keys.push(m[1]) }
  var pm = /git-hosted package "([^"\s]+)" needs/.exec(s)
  return { keys: keys, pkg: pm ? pm[1] : '' }
}

/** 0.9.28：repo → 实际 bundle 名映射合并（纯函数，写时复制）。
 * 一仓多包场景（root 包名 ≠ 仓库名，如 routing-suite 实装 @dsh-external/dsh-super-injector）：
 * 已安装判定候选键 [npm, name] 全 miss，需凭安装成功时学到的映射补第三键。
 * repo/name 任一为空或已同值 → 原引用原样返回（不复制，免无谓重渲染）。 */
function mergeRepoPkg(map, repo, name) {
  if (!repo || !name) return map
  if (map && map[repo] === name) return map
  var out = {}
  for (var k in map) out[k] = map[k]
  out[repo] = name
  return out
}

/** 0.9.28：市场卡已安装判定（候选键扩展版）。
 * 候选顺序：item.npm（bundle 名 = npm 包名）→ item.name（仓库名）→ repoPkg[item.full_name]（安装时学到的实际包名）。
 * 返回 { name: bundle名|null, via: 'npm'|'name'|'map'|'' }；installed 未就绪（null）返回未安装。 */
function installedNameFor(item, installed, repoPkg) {
  if (!installed) return { name: null, via: '' }
  var cands = [
    item && item.npm ? item.npm : null,
    item && item.name ? item.name : null,
    item && item.full_name && repoPkg ? repoPkg[item.full_name] : null,
  ]
  var vias = ['npm', 'name', 'map']
  for (var i = 0; i < cands.length; i++) {
    if (cands[i] && installed[cands[i]]) return { name: cands[i], via: vias[i] }
  }
  return { name: null, via: '' }
}
