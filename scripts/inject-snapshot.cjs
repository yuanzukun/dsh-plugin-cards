#!/usr/bin/env node
/** inject-snapshot.cjs — 把 assets/cards-snapshot.json 裁剪后内联进 lib/client.js 的出厂快照标记行。
 *
 * 0.9.8 起出厂快照按星数 Top-N 裁剪（M1：此前全量 10607 条 ≈5MB 随包分发）：
 *   - GitHub/both 条目按 ★ 降序（同星按 updated_at 降序保证确定性）取前 keepGh（默认 1500）
 *   - npm-only 且 installable 的条目按 updated_at 降序取前 keepNpm（默认 100，无星数可排）
 *   - 消费端硬约束（client.js catIdxFromSnapshot）：items ≥ 1000，且 npm 关/引擎过滤剔除后仍须 ≥ 1000
 *     → 故 github/both 保留量低于 1100 时报错拒注入（留过滤余量）
 *   - 完整目录由 hub 快照（jsDelivr）/ 官方源同步 / 静默收割三条在线链路补齐，出厂快照仅为离线兜底首屏
 *
 * 用法：node scripts/inject-snapshot.cjs [assets/cards-snapshot.json] [--keep=1500] [--npm-keep=100]
 * 每次快照刷新（hub 重新产出）后执行一次 + node --check + npm pack。 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const args = process.argv.slice(2)
const snapPath = args.find((a) => !a.startsWith('--')) || path.join(ROOT, 'assets', 'cards-snapshot.json')
const clientPath = path.join(ROOT, 'lib', 'client.js')
const opt = (name, dft) => {
  const a = args.find((x) => x.startsWith('--' + name + '='))
  const n = a ? Number(a.split('=')[1]) : NaN
  return Number.isInteger(n) && n > 0 ? n : dft
}
const KEEP_GH = opt('keep', 1500)
const KEEP_NPM = opt('npm-keep', 100)
const CONSUMER_FLOOR = 1000 // client.js catIdxFromSnapshot 的 items 下限
const GH_MARGIN = 1100 // github/both 保留量下限（为 npm 关/引擎过滤留余量）

const byStars = (a, b) =>
  (b.stargazers_count || 0) - (a.stargazers_count || 0) ||
  String(b.updated_at || '').localeCompare(String(a.updated_at || ''))
const byUpdated = (a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || ''))

const snap = JSON.parse(fs.readFileSync(snapPath, 'utf8'))
if (!Array.isArray(snap.items) || snap.items.length < 1000) throw new Error('快照不合法：items < 1000')
if (typeof snap.builtAt !== 'number') throw new Error('快照不合法：builtAt 非数字')

// ---- 裁剪（M1）：只影响内联产物，assets 原料保持全量 ----
const rawTotal = snap.items.length
const ghBoth = snap.items.filter((i) => i && i.source !== 'npm')
const npmOnly = snap.items.filter((i) => i && i.source === 'npm' && i.installable === true)
const keptGh = ghBoth.slice().sort(byStars).slice(0, KEEP_GH)
const keptNpm = npmOnly.slice().sort(byUpdated).slice(0, KEEP_NPM)
if (keptGh.length < GH_MARGIN) throw new Error('github/both 保留 ' + keptGh.length + ' < ' + GH_MARGIN + '（消费端过滤后须保持 ≥' + CONSUMER_FLOOR + '），拒绝注入')
const kept = keptGh.concat(keptNpm).sort(byStars)

const out = Object.assign({}, snap, {
  items: kept,
  factoryTrimmed: true,
  factoryKeep: { githubBoth: keptGh.length, npmOnly: keptNpm.length, rawTotal: rawTotal },
})

const MARKER = /var FACTORY_SNAPSHOT = .*?\/\*__FACTORY_SNAPSHOT__\*\//
const src = fs.readFileSync(clientPath, 'utf8')
if (!MARKER.test(src)) throw new Error('client.js 中找不到 FACTORY_SNAPSHOT 标记行')

const next = src.replace(MARKER, 'var FACTORY_SNAPSHOT = ' + JSON.stringify(out) + ' /*__FACTORY_SNAPSHOT__*/')
fs.writeFileSync(clientPath, next)
const mb = (n) => (n / 1048576).toFixed(2) + 'MB'
console.log(
  '✅ 出厂快照已内联（裁剪 M1）：',
  kept.length, '条（github/both', keptGh.length, '+ npm-only', keptNpm.length, '；原料', rawTotal, '条），',
  '内联体积', mb(JSON.stringify(out).length), '（原全量', mb(JSON.stringify(snap).length), '），',
  'builtAt', new Date(snap.builtAt).toISOString(), '，client.js', mb(next.length),
)
