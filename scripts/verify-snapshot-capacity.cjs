#!/usr/bin/env node
/**
 * verify-snapshot-capacity.cjs —— 快照承载容量探针（2026-10-11 #42 验收用，可复用）
 *
 * 背景：hub 快照切 1.4 万口径后（实测 #42 = 13721 条 / 7.34MB），客户端 catidx 缓存
 * 整体序列化可能超 localStorage ~5MB 配额（30-market-pure.js catIdxCacheSave 降级链）。
 * 本脚本在 Node 侧用真实快照跑客户端纯逻辑 catIdxFromSnapshot，用带配额的内存版
 * localStorage 模拟浏览器行为，实测：
 *   ① 索引构建耗时（compact+classify+dedup+sort 全链路）
 *   ② 缓存首写载荷体积 vs 配额
 *   ③ 触发配额后自带降级链（剥已译条目 EN description）能否兜住
 *   ④ 各字段序列化占比（为下一步瘦身方案提供数据）
 *
 * 用法：node scripts/verify-snapshot-capacity.cjs <snapshot.json> [quotaChars]
 *   quotaChars 默认 5242880（Chrome 每源 ~5MB，按 UTF-16 码元计）
 */
const fs = require('fs')
const path = require('path')
const { loadPure } = require('./load-client-pure.cjs')

const snapPath = process.argv[2] || path.join(require('os').tmpdir(), 'snap42.json')
const QUOTA = Number(process.argv[3]) > 0 ? Number(process.argv[3]) : 5242880

const data = JSON.parse(fs.readFileSync(snapPath, 'utf8'))
console.log('快照:', snapPath)
console.log('  total(header):', data.total, '| items:', data.items.length, '| builtAt:', new Date(data.builtAt).toISOString())

// ---- 内存版 localStorage（带同源共享配额——catidx/zhmap/tx 同池，超限抛错并记录载荷）----
const attempts = [] // { key, chars, accepted, usedBefore }
let mem = {}
let used = 0
globalThis.localStorage = {
  setItem(k, v) {
    const s = String(v)
    const before = k in mem ? mem[k].length : 0
    const accepted = used - before + s.length <= QUOTA
    attempts.push({ key: k, chars: s.length, accepted: accepted, usedBefore: used })
    if (!accepted) {
      const e = new Error('QuotaExceededError (simulated, used=' + used + ' new=' + s.length + ' quota=' + QUOTA + ')')
      e.name = 'QuotaExceededError'
      throw e
    }
    used = used - before + s.length
    mem[k] = s
  },
  getItem(k) { return k in mem ? mem[k] : null },
  removeItem(k) { if (k in mem) { used -= mem[k].length; delete mem[k] } },
  clear() { mem = {}; used = 0 },
}

const pure = loadPure()

// ---- ① 索引构建计时（参数对齐在线快照路径：质量开/npm 开/引擎开，新鲜度跳过便于复用旧快照）----
const t0 = process.hrtime.bigint()
const idx = pure.catIdxFromSnapshot(data, true, data.total, null, true, true)
const t1 = process.hrtime.bigint()
if (!idx) { console.error('❌ catIdxFromSnapshot 返回 null（快照被客户端校验拒绝）'); process.exit(1) }
console.log('\n① 索引构建:', idx.items.length, '条（去重后）, counts 类目数:', Object.keys(idx.counts).length,
  ', 耗时', Number(t1 - t0) / 1e6, 'ms')

// ---- ②③ 缓存写入尝试（catIdxFromSnapshot 内部已调 catIdxCacheSave → 触发降级链）----
console.log('\n② 缓存写入尝试（配额', QUOTA, 'chars = 5MB/UTF-16）:')
for (const a of attempts) {
  console.log('   ', a.accepted ? '✅ 接受' : '❌ 超限', a.key, '=', a.chars, 'chars',
    '(' + (a.chars / 1048576).toFixed(2) + 'MB chars)', a.accepted ? '' : '→ 触发降级')
}
const catAttempts = attempts.filter((a) => a.key.indexOf('catidx') !== -1)
const zhAttempts = attempts.filter((a) => a.key.indexOf('zhmap') !== -1)
const zhOk = zhAttempts.length > 0 && zhAttempts[zhAttempts.length - 1].accepted
if (catAttempts.length === 0) {
  console.log('   结论: （未发生 catidx 写入）')
} else if (catAttempts[0].accepted) {
  console.log('   结论: ✅ catidx 全量直接入库')
} else if (catAttempts[catAttempts.length - 1].accepted) {
  console.log('   结论: ⚠️ 全量超限，降级链兜住 catidx')
} else {
  console.log('   结论: ℹ️ catidx 按设计放弃（1.4 万口径超同源配额）→ HTTP 缓存重拉 + 索引重建兜底')
}
console.log('   zhmap（反英文固化映射）:', zhOk ? '✅ 已持久化' : '🚨 未持久化')

// ---- ④ 字段序列化占比（对 compactItem 后的条目逐字段求和）----
const items = data.items.map((it) => pure.compactItem ? null : null) // compactItem 未导出则手工复刻
let compacted
if (pure.compactItem) compacted = data.items.map(pure.compactItem)
else {
  // 复刻 compactItem（与 30-market-pure.js:279 一致，仅用于体积分析）
  compacted = data.items.map((it) => ({
    full_name: typeof it.full_name === 'string' ? it.full_name : '', name: it.name || '',
    npm: typeof it.npm === 'string' ? it.npm : '', version: typeof it.version === 'string' ? it.version : '',
    installable: typeof it.installable === 'boolean' ? it.installable : null,
    ec: typeof it.engineCompat === 'number' ? it.engineCompat : null,
    ms: typeof it.metaScore === 'number' ? it.metaScore : 0,
    source: typeof it.source === 'string' ? it.source : '',
    stargazers_count: it.stargazers_count || 0,
    updated_at: typeof it.updated_at === 'string' ? it.updated_at : '',
    description: typeof it.description === 'string' ? it.description.slice(0, 500) : '',
    descZh: typeof it.description_zh === 'string' && it.description_zh ? it.description_zh.slice(0, 600) : '',
    topics: Array.isArray(it.topics) ? it.topics.slice(0, 20) : [],
  }))
}
const fieldSums = {}
let totalLen = 0
for (const it of compacted) {
  for (const [k, v] of Object.entries(it)) {
    const n = JSON.stringify([k, v]).length
    fieldSums[k] = (fieldSums[k] || 0) + n
    totalLen += n
  }
}
console.log('\n④ 字段序列化占比（按占比降序）:')
const rows = Object.entries(fieldSums).sort((a, b) => b[1] - a[1])
for (const [k, v] of rows) {
  const bar = '█'.repeat(Math.round((v / totalLen) * 40))
  console.log('   ', k.padEnd(18), String(v).padStart(9), 'chars', ((v / totalLen) * 100).toFixed(1).padStart(5) + '%', bar)
}
console.log('    合计', totalLen, 'chars（items 部分）')

// ---- 瘦身组合模拟（配额为同源共享：catidx+zhmap 合计判定）----
// S0 现行降级：已译条目剥 EN desc
// S1 = S0 + 未译条目 EN desc 截 80
// S2 = S1 + descZh 截 250
// S3 = S0 + 未译 EN desc 截 60 + descZh 截 250
const ZH_LEN = JSON.stringify({}).length + 0 // zhmap 单独算：full_name→descZh 映射
const zhmapLen = (() => {
  let zm = {}
  for (const it of compacted) if (it.full_name && it.descZh) zm[it.full_name] = it.descZh
  return JSON.stringify(zm).length
})()
const len = (arr) => arr.reduce((s, it) => s + JSON.stringify(it).length, 0)
const mk = (fn) => compacted.map(fn)
const s0 = mk((it) => ({ ...it, description: it.descZh && it.description ? '' : it.description }))
const s1 = mk((it) => ({ ...it, description: it.descZh ? '' : it.description.slice(0, 80) }))
const s2 = mk((it) => ({ ...it, description: it.descZh ? '' : it.description.slice(0, 80), descZh: it.descZh.slice(0, 250) }))
const s3 = mk((it) => ({ ...it, description: it.descZh ? '' : it.description.slice(0, 60), descZh: it.descZh.slice(0, 250) }))
console.log('\n瘦身组合模拟（catidx + zhmap 合计 vs 配额', QUOTA, 'chars）:')
console.log('    zhmap（full_name→descZh）        ', zhmapLen, 'chars')
const cases = [
  ['S0 现行降级（已译剥EN desc）', s0],
  ['S1 = S0 + 未译EN desc截80', s1],
  ['S2 = S1 + descZh截250', s2],
  ['S3 = 未译EN desc截60 + descZh截250', s3],
]
for (const [name, arr] of cases) {
  const n = len(arr)
  const total = n + zhmapLen
  console.log('   ', name.padEnd(24), 'catidx', String(n).padStart(8), '+ zhmap', String(zhmapLen).padStart(7),
    '=', String(total).padStart(8), total <= QUOTA ? '✅ 合计≤配额' : '🚨 合计仍超')
}
