/**
 * 客户端纯逻辑单测（node:test 内置运行器，零依赖）。
 * 被测对象 = src/client/ 分块（经 scripts/load-client-pure.cjs 拼接装载，与组装产物同源）。
 * 运行：pnpm test（node --test tests/）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const pure = require('../scripts/load-client-pure.cjs').loadPure()

// ---------- 版本比较 ----------
test('cmpVersion: 数值逐段比较', () => {
  assert.ok(pure.cmpVersion('0.9.9', '0.9.10') < 0)
  assert.ok(pure.cmpVersion('1.0.0', '1.0.0') === 0)
  assert.ok(pure.cmpVersion('2.0.0', '1.9.9') > 0)
  assert.ok(pure.cmpVersion('0.10.0', '0.9.0') > 0) // 字符串比较会错的经典案例
})
test('cmpVersion: prerelease 后缀被忽略', () => {
  assert.ok(pure.cmpVersion('1.0.0-rc.1', '1.0.0') === 0)
  assert.ok(pure.cmpVersion('1.0.0-rc.1', '1.0.1') < 0)
})
test('cmpVersion: 空值与非数值段兜底', () => {
  assert.ok(pure.cmpVersion('', '1.0.0') < 0)
  assert.ok(pure.cmpVersion('1.0.0', '') > 0)
  assert.ok(pure.cmpVersion('', '') === 0)
  assert.ok(pure.cmpVersion('abc', 'abd') !== 0) // 字符串比较兜底
})

// ---------- 相对时间 / 时间戳 ----------
test('relTime: 各档位文案（固定 now 消除时钟依赖）', () => {
  const now = Date.parse('2026-10-11T06:00:00Z')
  assert.equal(pure.relTime(new Date(now - 30 * 1000).toISOString(), now), '刚刚')
  assert.equal(pure.relTime(new Date(now - 5 * 60000).toISOString(), now), '5 分钟前')
  assert.equal(pure.relTime(new Date(now - 3 * 3600000).toISOString(), now), '3 小时前')
  assert.equal(pure.relTime(new Date(now - 2 * 86400000).toISOString(), now), '2 天前')
  assert.equal(pure.relTime(new Date(now - 45 * 86400000).toISOString(), now), '1 个月前')
  assert.equal(pure.relTime(new Date(now - 400 * 86400000).toISOString(), now), '1 年前')
})
test('relTime: 无效输入返回空串；未来时间钳为刚刚', () => {
  assert.equal(pure.relTime('not-a-date', Date.now()), '')
  assert.equal(pure.relTime(NaN, Date.now()), '')
  const now = Date.parse('2026-10-11T06:00:00Z')
  assert.equal(pure.relTime(new Date(now + 3600000).toISOString(), now), '刚刚')
})
test('fmtStamp: 格式 MM-DD HH:mm；无效输入空串', () => {
  assert.match(pure.fmtStamp(Date.parse('2026-09-26T15:27:00')), /^\d{2}-\d{2} \d{2}:\d{2}$/)
  assert.equal(pure.fmtStamp(NaN), '')
})

// ---------- 计时 / 计数 ----------
test('fmtMMSS: 毫秒转 m:ss', () => {
  assert.equal(pure.fmtMMSS(65000), '1:05')
  assert.equal(pure.fmtMMSS(0), '0:00')
  assert.equal(pure.fmtMMSS(-5), '0:00')
  assert.equal(pure.fmtMMSS(3660000), '61:00') // 不进位到小时
})
test('parsePnpmCounts: 计数行结构化；非计数行返回 null', () => {
  assert.deepEqual(pure.parsePnpmCounts('Progress: resolved 100, reused 80, downloaded 10, added 20'),
    { resolved: 100, reused: 80, downloaded: 10, added: 20 })
  assert.equal(pure.parsePnpmCounts('Packages are hard linked from the store'), null)
  assert.equal(pure.parsePnpmCounts(''), null)
})

// ---------- 安装 spec ----------
test('specOf: npm / full_name / owner 登录名三态', () => {
  assert.equal(pure.specOf({ npm: 'dsh-usage-badge' }), 'dsh-usage-badge')
  assert.equal(pure.specOf({ full_name: 'o/r' }), 'github:o/r')
  assert.equal(pure.specOf({ owner: { login: 'o' }, name: 'r' }), 'github:o/r')
  assert.equal(pure.specOf('github:o/r'), 'github:o/r')
})
test('shortSpecName: github 前缀 / git URL / scoped npm 名取短名', () => {
  assert.equal(pure.shortSpecName('github:owner/repo'), 'repo')
  assert.equal(pure.shortSpecName('https://example.com/foo/bar.git'), 'bar')
  assert.equal(pure.shortSpecName('@scope/pkg@1.2.3'), '@scope/pkg') // scoped 名不能按首个 @ 截
  assert.equal(pure.shortSpecName('dsh-usage-badge@0.1.4'), 'dsh-usage-badge')
})

// ---------- 分类 ----------
test('classifyItem: dsh-market 系恒归合集与市场（优先于 topics）', () => {
  assert.equal(pure.classifyItem({ name: 'dsh-market', topics: ['mcp'] }), '合集与市场')
  assert.equal(pure.classifyItem({ name: 'x', npm: '@p-dsh-market/cco-market', topics: ['memory'] }), '合集与市场')
})
test('classifyItem: topics 优先、kw 兜底、dsh- 前缀漏斗、其他收尾', () => {
  assert.equal(pure.classifyItem({ name: 'a', topics: ['mcp'] }), '工具与自动化')
  assert.equal(pure.classifyItem({ name: 'b', topics: ['agent-memory'] }), '记忆与知识')
  assert.equal(pure.classifyItem({ name: 'dsh-usage-badge' }), '框架与宿主集成')
  assert.equal(pure.classifyItem({ name: 'zzz', description: 'a stock market ticker' }), '其他') // 0.9.11b: market kw 已收窄为插件市场
  assert.equal(pure.classifyItem({ name: 'c', description: 'awesome list of plugins' }), '合集与市场')
})
test('classifyItem: dsh- 前缀兜底测 full_name 仓库段（0.9.23 审计修正：npm scoped 名覆盖 name 不再漏网）', () => {
  // 形态①：npm scoped 镜像名覆盖 name（@owner/dsh-xxx，真机审计 37 条漏网样本）
  assert.equal(pure.classifyItem({ full_name: 'weibaohui/dsh-thinktank', name: '@weibaohui/dsh-thinktank', description: '思维模型全方位分析库' }), '框架与宿主集成')
  // 形态②：dedup 胜出包名无 dsh- 前缀（dsh-reasoning-slider → name=reasoning-slider）
  assert.equal(pure.classifyItem({ full_name: 'qjcnmd/dsh-reasoning-slider', name: 'reasoning-slider', description: '' }), '框架与宿主集成')
  // 原形态保持：无 full_name 时 name 顶上
  assert.equal(pure.classifyItem({ name: 'dsh-usage-badge' }), '框架与宿主集成')
  // 边界不误收：dsh 后无 -/_ 分隔（DSHdesktop / dshplugin / 纯 DSH）不算前缀
  assert.equal(pure.classifyItem({ full_name: 'TixAn9/DSHdesktop-restart-bottom', name: 'DSHdesktop-restart-bottom', description: '给桌面写的重启插件' }), '其他')
  assert.equal(pure.classifyItem({ full_name: 'toustifer/dshplugin', name: 'dshplugin', description: '' }), '其他')
  assert.equal(pure.classifyItem({ full_name: 'Sean-Gao/DSH', name: 'DSH', description: '' }), '其他')
})
test('subsOf: 有 subs 的父类返回数组、无 subs 返回 null', () => {
  assert.ok(Array.isArray(pure.subsOf('记忆与知识')))
  assert.equal(pure.subsOf('合集与市场'), null)
  assert.equal(pure.subsOf('不存在的类'), null)
})

// ---------- 压缩 / 排序 / 去重 ----------
test('compactItem: 字段规整 + 描述截断 + description_zh → descZh', () => {
  const long = 'x'.repeat(600)
  const c = pure.compactItem({
    full_name: 'o/r', npm: 'pkg', version: '1.0.0', installable: true, engineCompat: 1, metaScore: 2,
    source: 'both', stargazers_count: 7, updated_at: '2026-01-01', description: long,
    description_zh: '中文', topics: Array(25).fill('t'),
  })
  assert.equal(c.description.length, 500)
  assert.equal(c.descZh, '中文')
  assert.equal(c.topics.length, 20)
  assert.equal(c.ec, 1)
  assert.equal(c.ms, 2)
})
test('compactItem: 缺字段兜底默认值', () => {
  const c = pure.compactItem({ name: 'n' })
  assert.equal(c.full_name, 'n') // 无 owner 时 name 顶上（specOf 同源逻辑）
  assert.equal(c.installable, null)
  assert.equal(c.ec, null)
  assert.equal(c.ms, 0)
})
test('rankSort: 可装优先；不可装与引擎不兼容同罚位桶内按星数平局决胜', () => {
  const yes = { installable: true, stargazers_count: 1 }
  const no = { installable: false, stargazers_count: 99999 }
  const ec0 = { installable: true, ec: 0, stargazers_count: 5 }
  const arr = [no, ec0, yes].sort(pure.rankSort)
  assert.equal(arr[0], yes) // 可装 + 兼容恒第一
  // no 与 ec0 同罚位（ra=1）：星数高者在前
  assert.deepEqual(arr.slice(1).map((x) => x.stargazers_count), [99999, 5])
})
test('dedupItems: 同 GitHub 仓库多 npm 镜像收敛为一条，可安装优先', () => {
  const base = { full_name: 'OwNer/Repo', name: 'repo', source: 'github', stargazers_count: 10 }
  const items = [
    { ...base, npm: 'mirror-a', installable: false },
    { ...base, npm: 'repo', installable: true }, // npm 名与仓库名一致 → 胜出
  ]
  const out = pure.dedupItems(items)
  assert.equal(out.length, 1)
  assert.equal(out[0].npm, 'repo')
})
test('dedupItems: npm-only 按包名去重；无身份条目防御性保留', () => {
  const out = pure.dedupItems([
    { npm: 'Pkg', name: 'p', source: 'npm' },
    { npm: 'pkg', name: 'p', source: 'npm' },
    { name: 'ghost' },
  ])
  assert.equal(out.length, 2)
})

// ---------- 搜索 URL ----------
test('buildSearchUrl: 非质量口径为纯 topic 查询（确定性全等）', () => {
  assert.equal(
    pure.buildSearchUrl('dsh-plugin', 3, false, 100, 'stars'),
    'https://api.github.com/search/repositories?q=' + encodeURIComponent('topic:dsh-plugin') +
    '&sort=stars&order=desc&per_page=100&page=3',
  )
})
test('buildSearchUrl: 质量口径含近 12 月 pushed 下界与 dsh 关键词', () => {
  const url = pure.buildSearchUrl('dsh-plugin', 1, true, 100, 'stars')
  assert.match(url, /pushed%3A%3E%3D\d{4}-\d{2}-\d{2}/)
  assert.ok(url.includes(encodeURIComponent(' dsh in:name,description,topics')))
})
test('buildSearchUrl: bucket 星数/日期区间合并为单区间（Search API 同类限定符后者覆盖前者）', () => {
  const url = pure.buildSearchUrl('dsh-plugin', 1, false, 100, 'stars', { smin: 10, smax: 50, pmin: '2026-01-01', pmax: '2026-06-01' })
  assert.ok(url.includes(encodeURIComponent('stars:10..50')))
  assert.ok(url.includes(encodeURIComponent('pushed:2026-01-01..2026-06-01')))
})
test('buildSearchUrl: 0.9.18 created 维度（pushed 无切点时的替代拆分）', () => {
  const url = pure.buildSearchUrl('dsh-plugin', 1, false, 100, 'stars', { cmin: '2026-09-01', cmax: '2026-09-02' })
  assert.ok(url.includes(encodeURIComponent('created:2026-09-01..2026-09-02')))
})
test('buildSearchUrl: perPage 截断 100、page 兜底 1、sort 白名单', () => {
  assert.match(pure.buildSearchUrl('t', 0, false, 500, 'stars'), /per_page=100&page=1/)
  assert.match(pure.buildSearchUrl('t', 2, false, 100, 'nonsense'), /sort=stars/) // 非法 sort 回退 stars
})
test('topicOfSearchUrl / isGithubSearchApi: 编码与未编码双向识别', () => {
  assert.equal(pure.isGithubSearchApi(pure.buildSearchUrl('dsh-plugin', 1, false, 100, 'stars')), true)
  assert.equal(pure.isGithubSearchApi('https://example.com/?q=topic:x'), false)
  assert.equal(pure.topicOfSearchUrl(pure.buildSearchUrl('dsh-plugin', 1, false, 100, 'stars')), 'dsh-plugin')
  assert.equal(pure.topicOfSearchUrl('https://api.github.com/search/repositories?q=topic:dsh-plugin&x=1'), 'dsh-plugin')
  assert.equal(pure.topicOfSearchUrl('https://example.com/?q=topic:other'), 'other') // 非 GitHub 源也能解析 topic
  assert.equal(pure.topicOfSearchUrl('https://api.github.com/search/repositories?q=foo:bar'), null)
})

// ---------- 翻译辅助 ----------
test('llmUrl: base 补 /chat/completions；已有则不重复；尾斜杠归一', () => {
  assert.equal(pure.llmUrl('https://api.deepseek.com/v1'), 'https://api.deepseek.com/v1/chat/completions')
  assert.equal(pure.llmUrl('https://x.cn/v1/'), 'https://x.cn/v1/chat/completions')
  assert.equal(pure.llmUrl('https://x.cn/v1/chat/completions'), 'https://x.cn/v1/chat/completions')
  assert.equal(pure.llmUrl(''), '')
})
test('isPlaceholderDesc: 包名同文 / topic token 串判占位；自然语言不判', () => {
  assert.equal(pure.isPlaceholderDesc('dsh-usage-badge', 'dsh-usage-badge'), true)
  assert.equal(pure.isPlaceholderDesc('usage-badge', 'dsh-usage-badge'), true) // dsh- 前缀差异
  assert.equal(pure.isPlaceholderDesc('dsh-at-file.', 'x'), true)
  assert.equal(pure.isPlaceholderDesc('deepseek dsh dsh-plugin', 'x'), true)
  assert.equal(pure.isPlaceholderDesc('A great tool for daily work', 'x'), false)
  assert.equal(pure.isPlaceholderDesc('这是一个中文描述', 'x'), false) // 中文原文不占位
  assert.equal(pure.isPlaceholderDesc('', 'x'), false)
})
test('hashStr: 确定性 + 差异输入不碰撞（样本级）', () => {
  assert.equal(pure.hashStr('abc'), pure.hashStr('abc'))
  assert.notEqual(pure.hashStr('abc'), pure.hashStr('abd'))
  assert.equal(pure.hashStr(''), pure.hashStr(''))
})

// ---------- RPC / 构建键 ----------
test('unwrapRpc: 信封解包、错误抛出、直连透传', () => {
  assert.equal(pure.unwrapRpc({ ok: true, value: 42 }), 42)
  assert.throws(() => pure.unwrapRpc({ ok: false, error: { code: 'E_DENY' } }), /E_DENY/)
  assert.equal(pure.unwrapRpc({ plain: 1 }).plain, 1) // 直连形态透传
})
test('extractBuildKeys: 抽取 包@tarball 构建键并去重', () => {
  const text = 'err for foo@https://reg.example/f/-/f-1.0.0.tar.gz and foo@https://reg.example/f/-/f-1.0.0.tar.gz again'
  assert.deepEqual(pure.extractBuildKeys(text), ['foo@https://reg.example/f/-/f-1.0.0.tar.gz'])
  assert.deepEqual(pure.extractBuildKeys('no tarball here'), [])
})

// ---------- 0.9.28：git 依赖构建授权报错解析（extractGitDepInfo）----------
test('extractGitDepInfo: 从 pnpm 报错提取 commit 锚定授权键与包名', () => {
  // 形态核验自 pnpm 源码（@pnpm/exec.prepare-package GIT_DEP_PREPARE_NOT_ALLOWED，2026-10-12）
  const text = [
    'ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED',
    'The git-hosted package "dsh-routing-suite@1.2.0" needs to execute build scripts but is not in the "allowBuilds" allowlist.',
    'hint: Add the package to "allowBuilds" in your project\'s pnpm-workspace.yaml to allow it to run scripts. For example: allowBuilds: dsh-routing-suite@github:Ebony-Vinyl/dsh-routing-suite#abc1234: true',
  ].join('\n')
  const info = pure.extractGitDepInfo(text)
  assert.deepEqual(info.keys, ['dsh-routing-suite@github:Ebony-Vinyl/dsh-routing-suite#abc1234'])
  assert.equal(info.pkg, 'dsh-routing-suite@1.2.0')
})
test('extractGitDepInfo: 仓库 URL 键形态（git+https，v11.11+）也命中', () => {
  const text = 'needs to execute build scripts but is not in the "allowBuilds" allowlist. For example: allowBuilds: foo@git+https://github.com/org/foo.git: true'
  const info = pure.extractGitDepInfo(text)
  assert.deepEqual(info.keys, ['foo@git+https://github.com/org/foo.git'])
  assert.equal(info.pkg, '')
})
test('extractGitDepInfo: 多键去重 + 非该类报错返回空', () => {
  const dup = 'needs to execute build scripts. allowBuilds: a@github:o/r#1: true and allowBuilds: a@github:o/r#1: true'
  assert.deepEqual(pure.extractGitDepInfo(dup).keys, ['a@github:o/r#1'])
  const other = 'ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION: foo@1.0.0 was published at ...'
  const none = pure.extractGitDepInfo(other)
  assert.deepEqual(none.keys, [])
  assert.equal(none.pkg, '')
  assert.deepEqual(pure.extractGitDepInfo('').keys, [])
})

// ---------- 0.9.28：repo→bundle 名映射（mergeRepoPkg / installedNameFor）----------
test('mergeRepoPkg: 写时复制 + 同值原引用 + 空参短路', () => {
  const m0 = { 'o/r': '@x/a' }
  const m1 = pure.mergeRepoPkg(m0, 'o/r2', '@x/b')
  assert.notEqual(m1, m0) // 变更时新对象（不污染旧状态）
  assert.equal(m1['o/r2'], '@x/b')
  assert.equal(pure.mergeRepoPkg(m1, 'o/r2', '@x/b'), m1) // 同值原引用（免重渲染）
  assert.equal(pure.mergeRepoPkg(m1, '', '@x/c'), m1) // 空参短路
  assert.equal(pure.mergeRepoPkg(m1, 'o/r3', ''), m1)
})
test('installedNameFor: npm → 仓库名 → 学习映射 三级候选', () => {
  const item = { npm: '', name: 'dsh-routing-suite', full_name: 'Owner/dsh-routing-suite' }
  const inst = { '@dsh-external/dsh-super-injector': true, 'dsh-web': true }
  // 前两键 miss → 映射命中（一仓多包核心场景）
  assert.deepEqual(pure.installedNameFor(item, inst, { 'Owner/dsh-routing-suite': '@dsh-external/dsh-super-injector' }),
    { name: '@dsh-external/dsh-super-injector', via: 'map' })
  // npm 键优先
  const itemNpm = { npm: 'dsh-web', name: 'dsh-web', full_name: 'o/dsh-web' }
  assert.deepEqual(pure.installedNameFor(itemNpm, inst, {}), { name: 'dsh-web', via: 'npm' })
  // 仓库名键次之
  const itemName = { npm: '', name: 'dsh-web', full_name: 'o/dsh-web' }
  assert.deepEqual(pure.installedNameFor(itemName, inst, {}), { name: 'dsh-web', via: 'name' })
  // 未安装 / installed 未就绪 / 无映射
  assert.deepEqual(pure.installedNameFor(item, inst, {}), { name: null, via: '' })
  assert.deepEqual(pure.installedNameFor(item, null, {}), { name: null, via: '' })
})

// ---------- 0.9.28：市场路由状态持久化（marketViewLoad/Save/Clear）----------
test('marketView: 保存-恢复闭环 + 空值清除维度 + sub 依附 cat', () => {
  const store = {}
  globalThis.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v) },
    removeItem: (k) => { delete store[k] },
  }
  try {
    assert.equal(pure.marketViewLoad(), null) // 空存储
    pure.marketViewSave({ q: 'routing', tab: 'market', cat: '智能体与技能', sub: '工作流' })
    assert.deepEqual(pure.marketViewLoad(), { q: 'routing', tab: 'market', cat: '智能体与技能', sub: '工作流' })
    pure.marketViewSave({ q: '' }) // 空值 = 清除该维度
    assert.deepEqual(pure.marketViewLoad(), { tab: 'market', cat: '智能体与技能', sub: '工作流' })
    pure.marketViewSave({ cat: '' }) // cat 清除 → sub 随之失效
    assert.deepEqual(pure.marketViewLoad(), { tab: 'market' })
    pure.marketViewSave({ cat: 'x', sub: 'y' })
    pure.marketViewSave({ tab: 'installed' }) // 部分更新不覆盖其他维度
    assert.deepEqual(pure.marketViewLoad(), { tab: 'installed', cat: 'x', sub: 'y' })
    pure.marketViewClear()
    assert.equal(pure.marketViewLoad(), null)
  } finally { delete globalThis.localStorage }
})
test('marketViewLoad: 脏数据形状校验（非法 tab/超长 q/无 cat 的 sub 全丢弃）', () => {
  const store = {}
  globalThis.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v) },
    removeItem: (k) => { delete store[k] },
  }
  try {
    store['dcards.mktview.v1'] = 'not-json'
    assert.equal(pure.marketViewLoad(), null)
    store['dcards.mktview.v1'] = JSON.stringify({ q: 'x'.repeat(120), tab: 'hacked', cat: 'c', sub: 's' })
    assert.deepEqual(pure.marketViewLoad(), { cat: 'c', sub: 's' }) // q 超长 / tab 非法丢弃
    store['dcards.mktview.v1'] = JSON.stringify({ q: 'ok', cat: '', sub: 'orphan' })
    assert.deepEqual(pure.marketViewLoad(), { q: 'ok' }) // 无 cat 的 sub 丢弃
    store['dcards.mktview.v1'] = JSON.stringify([1, 2])
    assert.equal(pure.marketViewLoad(), null) // 非对象
  } finally { delete globalThis.localStorage }
})

// ---------- rt 缓存分区 ----------
test('rtverPartition: fresh 直接用 / stale 用+后台刷 / expired 立即查 / 未装跳过', () => {
  const now = 1_800_000_000_000
  const cache = {
    fresh: { at: now - 60 * 1000 },            // < 2min
    stale: { at: now - 10 * 60 * 1000 },       // 2min~1h
    expired: { at: now - 2 * 3600 * 1000 },    // > 1h
  }
  const bundles = [
    { name: 'fresh', installed: true },
    { name: 'stale', installed: true },
    { name: 'expired', installed: true },
    { name: 'gone', installed: false },
  ]
  const p = pure.rtverPartition(cache, bundles, now)
  assert.deepEqual(Object.keys(p.seeded).sort(), ['fresh', 'stale'])
  assert.deepEqual(p.revalidate, ['stale'])
  assert.deepEqual(p.pending, ['expired'])
})

// ---------- locale 参数插值 ----------
test('tParams: {n} 占位替换', () => {
  assert.equal(pure.tParams('剩余 {n} 条', { n: 7 }), '剩余 7 条')
  assert.equal(pure.tParams('无参数', {}), '无参数')
})

// ---------- 40-market-helpers（外提组）----------
test('matchCat: 空分类全通过，指定分类走 classifyItem 精确匹配', () => {
  const gh = { name: 'dsh-usage-badge', topics: ['dsh-plugin'] }
  assert.equal(pure.matchCat(gh, ''), true)
  assert.equal(pure.matchCat(gh, null), true)
  assert.equal(pure.matchCat(gh, pure.classifyItem(gh)), true)
  assert.equal(pure.matchCat(gh, 'OtherCategory'), false)
})
test('chipStyle/catChipStyle/tabStyle: 激活态与变体样式', () => {
  const base = pure.chipStyle(false)
  const active = pure.chipStyle(true)
  assert.equal(base.background, 'var(--dsw-alias-bg-layer-1)')
  assert.equal(active.background, 'var(--dsw-alias-brand-primary)')
  assert.notEqual(active, base) // 激活态返回新对象，不改基础样式
  // 0.9.28 UI 巡检：catChipStyle 收回紧凑变体（11px/1px 8px → 与全站 chip 统一 26px 基准）
  const compact = pure.catChipStyle(true)
  assert.equal(compact.padding, '2px 10px')
  assert.equal(compact.fontSize, '12px')
  assert.equal(compact.height, '26px')
  const tab = pure.tabStyle(true)
  assert.equal(tab.borderBottomColor, 'var(--dsw-alias-brand-primary)')
  assert.equal(pure.tabStyle(false).borderBottom, '2px solid transparent')
})
test('cliCmdFor: CLI 安装命令拼接', () => {
  assert.equal(pure.cliCmdFor('github:owner/repo'), 'dsh plugin add github:owner/repo')
  assert.equal(pure.cliCmdFor('@scope/pkg'), 'dsh plugin add @scope/pkg')
})

// ---------- 折叠态选中分类提位（0.9.23，审计批次 C）----------
test('promoteActiveCat: 折叠态选中分类提位到「全部」后', () => {
  const chips = [
    { value: '', display: '全部' },
    { value: '工具与自动化', count: 5000 },
    { value: '记忆与知识', count: 800 },
    { value: '其他', count: 87 },
  ]
  // active 为「全部」/ 首个非「全部」chip / 不在列表 → 原数组原序返回（不复制）
  assert.equal(pure.promoteActiveCat(chips, ''), chips)
  assert.equal(pure.promoteActiveCat(chips, '工具与自动化'), chips)
  assert.equal(pure.promoteActiveCat(chips, '不存在'), chips)
  // 空表 / 单元素不炸
  assert.deepEqual(pure.promoteActiveCat([], 'x'), [])
  assert.deepEqual(pure.promoteActiveCat([chips[0]], 'x'), [chips[0]])
  // active 为末位低频类 → 提到「全部」后，其余保持原相对顺序，且不改输入数组
  const out = pure.promoteActiveCat(chips, '其他')
  assert.deepEqual(out.map(c => c.value), ['', '其他', '工具与自动化', '记忆与知识'])
  assert.deepEqual(chips.map(c => c.value), ['', '工具与自动化', '记忆与知识', '其他'])
})

// ---------- 网络类预检错误分类（0.9.23，真机取证 2026-10-12）----------
test('classifyNetError: GitHub 连接探测超时 → github（须先于通用 net 判定）', () => {
  assert.equal(pure.classifyNetError('dsh: connection to github.com timed out after 5000ms'), 'github')
  assert.equal(pure.classifyNetError('dsh: connection to gist.github.com timed out after 5000ms'), 'github')
  assert.equal(pure.classifyNetError('connection to ssh.github.com timed out after 5000ms'), 'github')
})
test('classifyNetError: registry 超时 / DNS / 连接重置 → net', () => {
  assert.equal(pure.classifyNetError('pnpm view timed out after 20000ms'), 'net')
  assert.equal(pure.classifyNetError("fatal: Could not resolve host: github.com"), 'net')
  assert.equal(pure.classifyNetError('getaddrinfo ENOTFOUND registry.npmjs.org'), 'net')
  assert.equal(pure.classifyNetError('request to https://registry.npmjs.org failed: ECONNRESET'), 'net')
  assert.equal(pure.classifyNetError('Failed to connect to registry'), 'net')
  assert.equal(pure.classifyNetError('getaddrinfo EAI_AGAIN github.com'), 'net')
})
test('classifyNetError: 0.9.24 git CLI 文案（clone 阶段 Recv failure / unable to access）', () => {
  // 真机原文（2026-10-12 15:10 web profile）：github.com URL → github 键
  assert.equal(
    pure.classifyNetError("安装 github:Ebony-Vinyl/dsh-our-free-model 失败: fatal: unable to access 'https://github.com/Ebony-Vinyl/dsh-our-free-model/': Recv failure: Connection was reset"),
    'github'
  )
  // 不带 github.com 的重置文案 → net 键
  assert.equal(pure.classifyNetError('Recv failure: Connection was reset'), 'net')
  assert.equal(pure.classifyNetError('connection reset by peer'), 'net')
  // 防回归：上一版正则漏匹配的三种形态
  assert.equal(pure.classifyNetError("unable to access 'https://github.com/x/y/': Recv failure"), 'github')
})
test('classifyNetError: 非网络类与空值返回空串（不误伤既有文案映射）', () => {
  assert.equal(pure.classifyNetError('already-installed'), '')
  assert.equal(pure.classifyNetError('ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION: pkg@1.0.0 was published at 2026-10-12'), '')
  assert.equal(pure.classifyNetError('stop-profile'), '')
  assert.equal(pure.classifyNetError(''), '')
  assert.equal(pure.classifyNetError(undefined), '')
  assert.equal(pure.classifyNetError(null), '')
})
test('npmCandidateFromGithubSpec: github spec → npm 候选（0.9.24）', () => {
  assert.deepEqual(pure.npmCandidateFromGithubSpec('github:Ebony-Vinyl/dsh-our-free-model'), { owner: 'Ebony-Vinyl', repo: 'dsh-our-free-model', npmName: 'dsh-our-free-model' })
  assert.deepEqual(pure.npmCandidateFromGithubSpec('github:owner/dsh-x.git'), { owner: 'owner', repo: 'dsh-x', npmName: 'dsh-x' })
  // 非 github: 形态一律 null（npm 包名 / 完整 URL / 空值不产候选）
  assert.equal(pure.npmCandidateFromGithubSpec('dsh-plugin-cards'), null)
  assert.equal(pure.npmCandidateFromGithubSpec('https://github.com/x/y'), null)
  assert.equal(pure.npmCandidateFromGithubSpec('github:no-slash'), null)
  assert.equal(pure.npmCandidateFromGithubSpec(''), null)
  assert.equal(pure.npmCandidateFromGithubSpec(undefined), null)
})
test('verifyNpmCandidate: 同名校验 + repository 字段防投毒（0.9.24）', () => {
  // name 不一致 → 拒绝
  assert.equal(pure.verifyNpmCandidate({ name: 'other' }, 'o', 'dsh-x'), '')
  assert.equal(pure.verifyNpmCandidate(null, 'o', 'dsh-x'), '')
  // 无 repository 字段 → 仅同名弱信号（放行，dsh 插件惯例包名=仓库名）
  assert.equal(pure.verifyNpmCandidate({ name: 'dsh-x' }, 'o', 'dsh-x'), 'name-only')
  // repository 一致（对象/字符串两种形态，大小写不敏感）→ verified
  assert.equal(pure.verifyNpmCandidate({ name: 'dsh-x', repository: { url: 'git+https://github.com/O/dsh-X.git' } }, 'o', 'dsh-x'), 'verified')
  assert.equal(pure.verifyNpmCandidate({ name: 'dsh-x', repository: 'https://github.com/o/dsh-x' }, 'o', 'dsh-x'), 'verified')
  // repository 指向别的仓库 → 拒绝（防同名抢注包）
  assert.equal(pure.verifyNpmCandidate({ name: 'dsh-x', repository: { url: 'https://github.com/attacker/other' } }, 'o', 'dsh-x'), '')
})
test('fbPlanFor: github spec → 降级梯计划（tgz 镜像 + codeload 端点，0.9.24）', () => {
  var p1 = pure.fbPlanFor({ full_name: 'Ebony-Vinyl/dsh-our-free-model', tgz: 'Ebony-Vinyl__dsh-our-free-model.tgz' }, 'github:Ebony-Vinyl/dsh-our-free-model')
  assert.equal(p1.ghSpec, 'github:Ebony-Vinyl/dsh-our-free-model')
  assert.equal(p1.npmName, 'dsh-our-free-model')
  assert.equal(p1.tgzUrl, pure.TGZ_BASE + 'Ebony-Vinyl__dsh-our-free-model.tgz')
  assert.equal(p1.cdlUrl, 'https://codeload.github.com/Ebony-Vinyl/dsh-our-free-model/tar.gz/HEAD#.tar.gz')
  // 快照无 tgz 字段 → tgzUrl 空（梯子自动跳级）
  var p2 = pure.fbPlanFor({ full_name: 'o/r' }, 'github:o/r')
  assert.equal(p2.tgzUrl, '')
  assert.equal(p2.cdlUrl, 'https://codeload.github.com/o/r/tar.gz/HEAD#.tar.gz')
  // item 缺失（自定义安装/队列）→ full_name 回退 spec 推导
  var p3 = pure.fbPlanFor(null, 'github:o/r.git')
  assert.equal(p3.cdlUrl, 'https://codeload.github.com/o/r/tar.gz/HEAD#.tar.gz')
  // 非 github: spec → null（退化为原通道重试）
  assert.equal(pure.fbPlanFor({ tgz: 'x' }, 'dsh-plugin-cards'), null)
  assert.equal(pure.fbPlanFor({}, 'https://github.com/o/r'), null)
})
test('netKeyFromChange: ChangeResult 原始 diagnostic 分类（0.9.24b 中文译文盲区修复）', () => {
  // 预检 Empty reply（17:05 真机原文）→ github
  assert.equal(pure.netKeyFromChange({ application: 'failed', error: { diagnostic: 'fatal: unable to access \'https://github.com/o/r/\': Empty reply from server' } }), 'github')
  // Recv failure / 超时 / DNS → net 或 github
  assert.equal(pure.netKeyFromChange({ error: { diagnostic: '\x1B[31mRecv failure: Connection was reset\x1B[0m' } }), 'net')
  assert.equal(pure.netKeyFromChange({ error: { diagnostic: 'dsh: connection to github.com timed out after 20000ms' } }), 'github')
  // 非网络类 / 无 diagnostic / 空值 → ''
  assert.equal(pure.netKeyFromChange({ error: { diagnostic: 'ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION' } }), '')
  assert.equal(pure.netKeyFromChange({ error: {} }), '')
  assert.equal(pure.netKeyFromChange(null), '')
  // 关键回归：中文译文本身不参与分类（分类只认原始 diagnostic）
  assert.equal(pure.netKeyFromChange({ error: { diagnostic: '网络不稳定：连接 github.com 失败' } }), '')
})
test('classifyNetError: pnpm fetch 文案（真机三踩，0.9.24c）', () => {
  // pnpm 抓 codeload tarball 重试耗尽后的原文（17:29 真机 operation-LJOjH6）
  assert.equal(pure.classifyNetError('TimeoutError: The operation was aborted due to timeout'), 'net')
  assert.equal(pure.classifyNetError('GET https://codeload.github.com/o/r/tar.gz/HEAD error (23). Will retry in 10 seconds.'), 'net')
  assert.equal(pure.classifyNetError('安装 github:o/r失败：TimeoutError: The operation was aborted due to timeout（完整日志：…）'), 'net')
})

// ---- 0.9.27：降级梯执行层逐级走位（ladderNext，40 块外提）----
// 背景：0.9.26 真机教训——③ 级失败被 ④ 级重试掩盖，E2E 只断言「最终成功」不够。
// 本组测试把梯子走位矩阵固化为逐级断言：每级输入 (netSeq, fbPlan) 必须产生唯一正确的下一动作。
test('ladderNext: 完整梯走位 ①probe → ②tgz → ③cdl → ④⑤retry → 止步（有 plan + tgz）', () => {
  var spec = 'github:o/r'
  var plan = pure.fbPlanFor({ full_name: 'o/r', tgz: 'o__r.tgz' }, spec)
  // ① 级（seq=0）：npm 同名探测（探测本身异步，由调用方做；命中 → netFbDone 止梯）
  var s0 = pure.ladderNext('net', {}, spec)
  assert.equal(s0.kind, 'probe')
  assert.equal(s0.plan.cdlUrl, plan.cdlUrl)
  assert.equal(s0.delay, 800)
  // 探测落空 → ② 级（seq=1）：换 hub 镜像 tgz
  var s1 = pure.ladderNext('net', { netSeq: 1, fbPlan: plan }, spec)
  assert.equal(s1.kind, 'install')
  assert.equal(s1.spec, plan.tgzUrl)
  assert.equal(s1.fb.netSeq, 2)
  assert.equal(s1.msgKey, 'tgz')
  assert.equal(s1.repoFallback, 'r')
  assert.equal(s1.delay, 800)
  // ③ 级（seq=2）：codeload tarball（0.9.26 修复后的 #.tar.gz 结尾 spec）
  var s2 = pure.ladderNext('net', { netSeq: 2, fbPlan: plan }, spec)
  assert.equal(s2.kind, 'install')
  assert.equal(s2.spec, plan.cdlUrl)
  assert.ok(/\.tar\.gz$/.test(s2.spec), '③ 级 spec 必须以 .tar.gz 结尾（0.9.26 宿主 TARBALL_SPEC 门禁）')
  assert.equal(s2.fb.netSeq, 3)
  assert.equal(s2.msgKey, 'cdl')
  // ④ 级（seq=3）：原通道（ghSpec）重试，退避 800ms
  var s3 = pure.ladderNext('net', { netSeq: 3, fbPlan: plan }, spec)
  assert.equal(s3.kind, 'install')
  assert.equal(s3.spec, 'github:o/r')
  assert.equal(s3.fb.netSeq, 4)
  assert.equal(s3.delay, 800)
  assert.equal(s3.msgKey, 'retry')
  // ⑤ 级（seq=4）：重试退避 3s
  var s4 = pure.ladderNext('net', { netSeq: 4, fbPlan: plan }, spec)
  assert.equal(s4.fb.netSeq, 5)
  assert.equal(s4.delay, 3000)
  // seq=5：梯子耗尽止步（netSeq 严格递增防循环的终态）
  assert.equal(pure.ladderNext('net', { netSeq: 5, fbPlan: plan }, spec), null)
})
test('ladderNext: 快照无 tgz 字段 → ② 级跳级走原 spec（真机 0.9.24 行为保真）', () => {
  var spec = 'github:o/r'
  var plan = pure.fbPlanFor({ full_name: 'o/r' }, spec)
  assert.equal(plan.tgzUrl, '')
  var s1 = pure.ladderNext('net', { netSeq: 1, fbPlan: plan }, spec)
  assert.equal(s1.kind, 'install')
  assert.equal(s1.spec, spec) // 原通道，非 tgzUrl
  assert.equal(s1.delay, 0) // 立即执行（无 setTimeout）
  assert.equal(s1.msgKey, undefined) // 静默跳级，无文案
  var s2 = pure.ladderNext('net', { netSeq: 2, fbPlan: plan }, spec)
  assert.equal(s2.spec, plan.cdlUrl) // cdlUrl 恒有（fbPlanFor 对 github: 必设）
})
test('ladderNext: 无梯计划（非 github: spec）→ 原通道重试 ×3 后止步', () => {
  var spec = 'dsh-plugin-cards'
  // seq=0 无 plan → 不走 probe，落重试分支（3000ms）
  var s0 = pure.ladderNext('net', {}, spec)
  assert.equal(s0.kind, 'install')
  assert.equal(s0.spec, spec)
  assert.equal(s0.fb.netSeq, 1)
  assert.equal(s0.fb.fbPlan, null)
  assert.equal(s0.delay, 3000)
  // seq=1/2 走 install 分支原 spec 立即重试（⚠️ 实现实为 ×3，旧注释「×2」有误，0.9.27 已修正）
  var s1 = pure.ladderNext('net', { netSeq: 1 }, spec)
  assert.equal(s1.spec, spec)
  assert.equal(s1.fb.netSeq, 2)
  assert.equal(s1.delay, 0)
  var s2 = pure.ladderNext('net', { netSeq: 2 }, spec)
  assert.equal(s2.spec, spec)
  assert.equal(s2.fb.netSeq, 3)
  assert.equal(s2.delay, 0)
  // seq=3 无 plan → seq<2 不满足 → 止步
  assert.equal(pure.ladderNext('net', { netSeq: 3 }, spec), null)
})
test('ladderNext: 止梯门禁——非网络类 / netFbDone（① 级 npm 已换道）/ netHit 空', () => {
  var spec = 'github:o/r'
  // 非网络类失败（如宿主 inspect 拒绝 declares no dsh.bundle，供应链硬门禁）不走梯
  assert.equal(pure.ladderNext('', {}, spec), null)
  assert.equal(pure.ladderNext(null, {}, spec), null)
  // ① 级探测命中换 npm 装（netFbDone）后再次失败 → 不再降级（npm 版本可能略滞后，重试无意义）
  assert.equal(pure.ladderNext('net', { netFbDone: true }, spec), null)
  assert.equal(pure.ladderNext('github', { netFbDone: true, netSeq: 3 }, spec), null)
})

// ---------- 0.9.28 UI 巡检：星数紧凑格式化 ----------
test('fmtStars: <1000 原样', () => {
  assert.equal(pure.fmtStars(0), '0')
  assert.equal(pure.fmtStars(999), '999')
  assert.equal(pure.fmtStars(1), '1')
})
test('fmtStars: ≥1000 缩写 k（一位小数去尾 0）', () => {
  assert.equal(pure.fmtStars(1000), '1k')
  assert.equal(pure.fmtStars(11527), '11.5k')
  assert.equal(pure.fmtStars(1200), '1.2k')
  assert.equal(pure.fmtStars(99876), '99.9k')
  assert.equal(pure.fmtStars(115000), '115k') // ≥100k 无小数
  assert.equal(pure.fmtStars(1234567), '1235k')
})
test('fmtStars: 非法输入返回空串', () => {
  assert.equal(pure.fmtStars(undefined), '')
  assert.equal(pure.fmtStars(null), '')
  assert.equal(pure.fmtStars(-5), '')
  assert.equal(pure.fmtStars(NaN), '')
  assert.equal(pure.fmtStars('123'), '')
})
// ---------- 0.9.28 UI 巡检：chip 高度统一（样式常量断言，防回归） ----------
test('chipStyle/catChipStyle: 26px 基准统一（border-box 定高）', () => {
  var c = pure.chipStyle(false)
  assert.equal(c.height, '26px')
  assert.equal(c.boxSizing, 'border-box')
  // catChipStyle 收回紧凑变体后与 chipStyle 同款（0.9.28 UI 巡检）
  var cc = pure.catChipStyle(false)
  assert.equal(cc.height, '26px')
  assert.equal(cc.fontSize, c.fontSize)
  assert.equal(cc.padding, c.padding)
  // active 态不改变高度语义
  assert.equal(pure.chipStyle(true).height, '26px')
})

// ---------- 0.9.29：宿主启用失败分类（import 失败人话化前置） ----------
test('classifyEnableFailure: failed to import 命中（大小写不敏感）', () => {
  assert.equal(pure.classifyEnableFailure('dsh-at-file (dsh-at-file): failed to import'), 'import')
  assert.equal(pure.classifyEnableFailure('dsh-foo: Failed to Import'), 'import')
})
test('classifyEnableFailure: 其他启用失败不误报', () => {
  assert.equal(pure.classifyEnableFailure('stop-profile'), '')
  assert.equal(pure.classifyEnableFailure('bundle-in-use'), '')
  assert.equal(pure.classifyEnableFailure(''), '')
  assert.equal(pure.classifyEnableFailure(null), '')
  assert.equal(pure.classifyEnableFailure(undefined), '')
})
