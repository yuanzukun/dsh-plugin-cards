#!/usr/bin/env node
/** inject-snapshot.cjs — 把 assets/cards-snapshot.json 内联进 lib/client.js 的出厂快照标记行。
 * 用法：node scripts/inject-snapshot.cjs [assets/cards-snapshot.json]
 * 每次快照刷新（hub 重新产出）后执行一次 + node --check + npm pack。 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const snapPath = process.argv[2] || path.join(ROOT, 'assets', 'cards-snapshot.json')
const clientPath = path.join(ROOT, 'lib', 'client.js')

const snap = JSON.parse(fs.readFileSync(snapPath, 'utf8'))
if (!Array.isArray(snap.items) || snap.items.length < 1000) throw new Error('快照不合法：items < 1000')

const MARKER = /var FACTORY_SNAPSHOT = .*?\/\*__FACTORY_SNAPSHOT__\*\//
const src = fs.readFileSync(clientPath, 'utf8')
if (!MARKER.test(src)) throw new Error('client.js 中找不到 FACTORY_SNAPSHOT 标记行')

const next = src.replace(MARKER, 'var FACTORY_SNAPSHOT = ' + JSON.stringify(snap) + ' /*__FACTORY_SNAPSHOT__*/')
fs.writeFileSync(clientPath, next)
console.log('✅ 出厂快照已内联：', snap.items.length, '条，builtAt', new Date(snap.builtAt).toISOString(), '，client.js', (next.length / 1048576).toFixed(2) + 'MB')
