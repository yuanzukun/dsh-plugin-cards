#!/usr/bin/env node
/**
 * 全量抓取 topic:dsh-plugin（Search API 单查询仅返回前 1000 条 → 逐轮收割递归）。
 * 每轮取页 1..10（1000 条），以末位星数为新上界 stars:<=S 递归；同星数堆积无进展时按 pushed 日期中点拆分。
 * --quality 加上与插件一致的质量限定符（★>=0 近 12 月更新 含 dsh），对齐插件实际口径。
 * 1.1.0（2026-09-30 用户决策）：★>=3 → ★>=0（不限星数），完整覆盖官方 topic 页。
 * 未认证限流 10 次/分钟 → 页间 7s；403/429 退避 65s；按 full_name 去重。
 */
const fs = require('fs')
const path = require('path')
const OUT = path.join(__dirname, 'dsh-all.json')
const TOPIC = 'topic:dsh-plugin'
const QUALITY = process.argv.includes('--quality')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let reqCount = 0

function searchUrl(bucket, page) {
  let q = TOPIC
  // 同类型限定符在 GitHub Search API 中后者覆盖前者（不取交集）→ 必须合并成单一区间
  const smin = QUALITY ? 0 : null // ★>=0 = 不限星数（0 时不发 stars 限定符）
  const smax = bucket.smax != null ? bucket.smax : null
  if (smin != null && smin > 0 && smax != null) q += ' stars:' + smin + '..' + smax
  else if (smin != null && smin > 0) q += ' stars:>=' + smin
  else if (smax != null) q += ' stars:<=' + smax
  const qDate = QUALITY ? new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString().slice(0, 10) : null
  const pmin = [qDate, bucket.pmin].filter(Boolean).sort().pop() // 取更晚（更严格）的下界
  const pmax = bucket.pmax || null
  if (pmin && pmax) q += ' pushed:' + pmin + '..' + pmax
  else if (pmin) q += ' pushed:>=' + pmin
  else if (pmax) q += ' pushed:<' + pmax
  if (QUALITY) q += ' dsh in:name,description,topics'
  return `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=100&page=${page}`
}

async function api(url, attempt = 0) {
  reqCount++
  const r = await fetch(url, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'dsh-plugin-cards-dev' } })
  if (r.status === 403 || r.status === 429) {
    if (attempt >= 3) throw new Error('rate limited x4')
    console.log(`  HTTP ${r.status}, backoff 65s (attempt ${attempt + 1})`)
    await sleep(65000)
    return api(url, attempt + 1)
  }
  if (r.status === 422) return { __unavailable: true }
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`)
  return r.json()
}

const seen = new Map()
let cum = 0
function absorb(list) {
  let added = 0
  for (const it of list) {
    if (!it || it.fork || it.archived || seen.has(it.full_name)) continue
    seen.set(it.full_name, it)
    added++
  }
  cum += added
  return added
}

async function harvest(bucket, depth) {
  const first = await api(searchUrl(bucket, 1))
  if (first.__unavailable) { console.log(`  bucket unavailable, skip: ${JSON.stringify(bucket)}`); return }
  const total = first.total_count || 0
  const list1 = (first.items || []).filter((it) => it && !it.fork && !it.archived)
  absorb(list1)
  const before = seen.size // 本轮起始（第 1 页后）
  console.log(`bucket ${JSON.stringify(bucket)} total=${total} cum=${seen.size} depth=${depth}`)
  if (total === 0) return
  const pages = Math.min(Math.ceil(total / 100), 10)
  let lastList = list1
  for (let p = 2; p <= pages; p++) {
    await sleep(7000)
    const d = await api(searchUrl(bucket, p))
    if (d.__unavailable) break
    lastList = (d.items || []).filter((it) => it && !it.fork && !it.archived)
    absorb(lastList)
    console.log(`  page ${p}/${pages} cum=${seen.size}`)
  }
  if (total <= 1000 || pages < 10) return // 本桶已收完
  const added = seen.size - before + list1.length // 本轮新增（含第 1 页）
  const s = lastList.length ? lastList[lastList.length - 1].stargazers_count : 0
  if (added > 0 && s != null && (bucket.smax == null || s < bucket.smax)) {
    console.log(`  next round: stars<=${s}`)
    await sleep(7000)
    await harvest({ smax: s, pmin: bucket.pmin, pmax: bucket.pmax }, depth)
  } else if (depth < 10) {
    const mid = new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString().slice(0, 10)
    console.log(`  no progress via stars, split by pushed at ${mid}`)
    await sleep(7000)
    await harvest({ smax: bucket.smax, pmax: mid }, depth + 1)
    await sleep(7000)
    await harvest({ smax: bucket.smax, pmin: mid }, depth + 1)
  } else {
    console.log('  depth guard hit, partial data kept')
  }
}

;(async () => {
  await harvest({}, 0)
  const list = [...seen.values()].sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))
  fs.writeFileSync(OUT, JSON.stringify(list.map((it) => ({
    full_name: it.full_name, name: it.name, stars: it.stargazers_count,
    topics: it.topics || [], description: it.description || '', updated_at: it.updated_at,
  }))))
  console.log(`DONE: ${list.length} unique items, ${reqCount} requests -> ${OUT}`)
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1) })
