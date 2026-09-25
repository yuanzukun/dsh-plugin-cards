#!/usr/bin/env node
/** 用 lib/client.js 中最新的 CATEGORY_RULES 重算 dsh-all.json 分布（调优验证用）。 */
const fs = require('fs')
const data = require('./dsh-all.json')
const src = fs.readFileSync('D:/导航/dsh-plugin/lib/client.js', 'utf8')
const m = src.match(/var CATEGORY_RULES = \[[\s\S]*?\n\]/)
if (!m) { console.error('CATEGORY_RULES not found'); process.exit(1) }
const CATEGORY_RULES = eval('(function(){' + m[0] + '; return CATEGORY_RULES })()')
const CATEGORY_OTHER = '其他'
function classify(item) {
  var topics = Array.isArray(item.topics) ? item.topics : []
  for (var i = 0; i < CATEGORY_RULES.length; i++) {
    for (var j = 0; j < CATEGORY_RULES[i].topics.length; j++) if (topics.indexOf(CATEGORY_RULES[i].topics[j]) !== -1) return CATEGORY_RULES[i].label
  }
  var text = ((item.name || '') + ' ' + (item.description || '')).toLowerCase()
  for (var k = 0; k < CATEGORY_RULES.length; k++) {
    for (var mm = 0; mm < CATEGORY_RULES[k].kw.length; mm++) if (text.indexOf(CATEGORY_RULES[k].kw[mm]) !== -1) return CATEGORY_RULES[k].label
  }
  return CATEGORY_OTHER
}
const counts = {}
const other = []
for (const it of data) {
  const c = classify(it)
  counts[c] = (counts[c] || 0) + 1
  if (c === '其他') other.push(it)
}
console.log(JSON.stringify(counts))
const sum = Object.values(counts).reduce((a, b) => a + b, 0)
console.log('sum=' + sum, 'data=' + data.length)
other.sort((a, b) => b.stars - a.stars)
console.log('其他 top15:')
for (const o of other.slice(0, 15)) console.log(o.stars, o.full_name, (o.description || '(无描述)').slice(0, 60).replace(/\n/g, ' '))
