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
  const compact = pure.catChipStyle(true)
  assert.equal(compact.padding, '1px 8px')
  assert.equal(compact.fontSize, '11px')
  const tab = pure.tabStyle(true)
  assert.equal(tab.borderBottomColor, 'var(--dsw-alias-brand-primary)')
  assert.equal(pure.tabStyle(false).borderBottom, '2px solid transparent')
})
test('cliCmdFor: CLI 安装命令拼接', () => {
  assert.equal(pure.cliCmdFor('github:owner/repo'), 'dsh plugin add github:owner/repo')
  assert.equal(pure.cliCmdFor('@scope/pkg'), 'dsh plugin add @scope/pkg')
})
