#!/usr/bin/env node
/**
 * assemble-client.cjs —— 组装 lib/client.js（0.9.18 后引入；2026-10-11 起支持多块拼接）
 *
 * 客户端源码真相源 = src/client/ 目录（按域分块）：
 *   00-wrapper / 10-runtime / 20-node-ui / 30-market-pure / 40-market-helpers / 80-market-section / 99-apply
 * 本脚本：按文件名序读入各块 → 用 '\n' 连接（分块边界处的换行属于分隔符，
 *   直拼空串会丢行间换行——2026-10-11 拆分时实测踩坑）→ 把 __FACTORY_SNAPSHOT__
 *   占位行替换为 assets/cards-snapshot.json 裁剪出的出厂快照 → 写 lib/client.js
 *   → node --check 语法校验。
 * tsdown clean:true 由此变得安全：tsdown 清空 lib/ 后由本脚本重建 client.js。
 *
 * 裁剪规则（自 0.9.8 M1，沿用 inject-snapshot 时代口径）：
 *   - GitHub/both 条目按 ★ 降序（同星按 updated_at 降序保证确定性）取前 keepGh（默认 1500）
 *   - npm-only 且 installable 的条目按 updated_at 降序取前 keepNpm（默认 100，无星数可排）
 *   - 消费端硬约束（client.js catIdxFromSnapshot）：items ≥ 1000，且 npm 关/引擎过滤剔除后仍须 ≥ 1000
 *     → 故 github/both 保留量低于 1100 时报错拒组装（留过滤余量）
 *   - 完整目录由 hub 快照（jsDelivr）/ 官方源同步 / 静默收割三条在线链路补齐，出厂快照仅为离线兜底首屏
 *
 * 用法：node scripts/assemble-client.cjs [--keep=1500] [--npm-keep=100]
 * 接入：pnpm build = tsdown + 本脚本；快速单独重组可用 pnpm assemble。
 */
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const ROOT = path.join(__dirname, '..')
const SRC_DIR = path.join(ROOT, 'src', 'client')
const OUT_PATH = path.join(ROOT, 'lib', 'client.js')
const CHUNKS = ['00-wrapper.js', '10-runtime.js', '20-node-ui.js', '30-market-pure.js', '40-market-helpers.js', '80-market-section.js', '99-apply.js']
const args = process.argv.slice(2)
const snapPath = args.find((a) => !a.startsWith('--')) || path.join(ROOT, 'assets', 'cards-snapshot.json')
const opt = (name, dft) => {
  const a = args.find((x) => x.startsWith('--' + name + '='))
  const n = a ? Number(a.split('=')[1]) : NaN
  return Number.isInteger(n) && n > 0 ? n : dft
}
const KEEP_GH = opt('keep', 1500)
const KEEP_NPM = opt('npm-keep', 100)
const CONSUMER_FLOOR = 1000 // client.js catIdxFromSnapshot 的 items 下限
const GH_MARGIN = 1100 // github/both 保留量下限（为 npm 关/引擎过滤留余量）

// ---- 1. 分块拼接：按文件名序，块间以 '\n' 连接（还原拆分时归属边界的换行符）----
for (const c of CHUNKS) {
  if (!fs.existsSync(path.join(SRC_DIR, c))) throw new Error('缺少源码分块: ' + c)
}
const src = CHUNKS.map((c) => fs.readFileSync(path.join(SRC_DIR, c), 'utf8')).join('\n')

// ---- 2. 占位标记行必须唯一 ----
const PLACEHOLDER = 'var FACTORY_SNAPSHOT = null /*__FACTORY_SNAPSHOT__*/'
const occurrences = src.split(PLACEHOLDER).length - 1
if (occurrences !== 1) throw new Error('分块拼接结果中占位标记行应为唯一 1 处，实际 ' + occurrences)

// ---- 3. 快照原料校验 ----
const snap = JSON.parse(fs.readFileSync(snapPath, 'utf8'))
if (!Array.isArray(snap.items) || snap.items.length < 1000) throw new Error('快照不合法：items < 1000')
if (typeof snap.builtAt !== 'number') throw new Error('快照不合法：builtAt 非数字')

// ---- 4. 裁剪（M1）：只影响内联产物，assets 原料保持全量 ----
const rawTotal = snap.items.length
const ghBoth = snap.items.filter((i) => i && i.source !== 'npm')
const npmOnly = snap.items.filter((i) => i && i.source === 'npm' && i.installable === true)
const keptGh = ghBoth.slice().sort(byStars).slice(0, KEEP_GH)
const keptNpm = npmOnly.slice().sort(byUpdated).slice(0, KEEP_NPM)
if (keptGh.length < GH_MARGIN) throw new Error('github/both 保留 ' + keptGh.length + ' < ' + GH_MARGIN + '（消费端过滤后须保持 ≥' + CONSUMER_FLOOR + '），拒绝组装')
const kept = keptGh.concat(keptNpm).sort(byStars)

const out = Object.assign({}, snap, {
  items: kept,
  factoryTrimmed: true,
  factoryKeep: { githubBoth: keptGh.length, npmOnly: keptNpm.length, rawTotal: rawTotal },
})

// ---- 5. 组装 + 校验 ----
// 用函数式 replacement：JSON 串里若含 $&/$' 等序列，字符串 replacement 会被 String.replace
// 当作特殊模式展开（inject-snapshot 时代的潜在数据损坏 bug，此处修复）。
const next = src.replace(PLACEHOLDER, () => 'var FACTORY_SNAPSHOT = ' + JSON.stringify(out) + ' /*__FACTORY_SNAPSHOT__*/')
fs.writeFileSync(OUT_PATH, next)
execFileSync(process.execPath, ['--check', OUT_PATH], { stdio: 'inherit' })
const mb = (n) => (n / 1048576).toFixed(2) + 'MB'
console.log(
  '✅ lib/client.js 组装完成（' + CHUNKS.length + ' 块拼接 + 出厂快照 M1 裁剪）：',
  kept.length, '条（github/both', keptGh.length, '+ npm-only', keptNpm.length, '；原料', rawTotal, '条），',
  '内联体积', mb(JSON.stringify(out).length), '（原全量', mb(JSON.stringify(snap).length), '），',
  'builtAt', new Date(snap.builtAt).toISOString(), '，产物', mb(next.length), '，node --check 通过',
)

function byStars(a, b) {
  return (b.stargazers_count || 0) - (a.stargazers_count || 0) ||
    String(b.updated_at || '').localeCompare(String(a.updated_at || ''))
}
function byUpdated(a, b) {
  return String(b.updated_at || '').localeCompare(String(a.updated_at || ''))
}
