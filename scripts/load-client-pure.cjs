#!/usr/bin/env node
/**
 * load-client-pure.cjs —— 在 Node 侧装载客户端纯逻辑分块（测试与脚本共用）
 *
 * 原理：src/client/ 的分块共享同一闭包作用域（组装时按序 '\n' 连接），Node 无法逐块
 * require（会割裂作用域）。本装载器用 new Function 复刻同一语义：
 *   拼接 10-runtime.js + 30-market-pure.js + 40-market-helpers.js → 包一层函数
 *   （require=stub、window=undefined）→ 30 块末尾的「Node 测试出口」guard 生效，
 *   纯函数集合挂在 module.exports 返回（40 块的函数声明提升，导出口可见）。
 * 注意：must 与 assemble-client.cjs 的 CHUNKS 顺序/分隔符保持一致。
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const PURE_CHUNKS = ['10-runtime.js', '30-market-pure.js', '40-market-helpers.js']

function loadPure() {
  const code = PURE_CHUNKS
    .map((c) => fs.readFileSync(path.join(ROOT, 'src', 'client', c), 'utf8'))
    .join('\n')
  const module = { exports: {} }
  const fakeRequire = () => ({}) // react/jsx-runtime 等浏览器依赖：纯函数用不到，stub 即可
  // window 传 undefined → 30 块的 Node 测试出口 guard 条件成立
  new Function('require', 'module', 'exports', 'window', code)(fakeRequire, module, module.exports, undefined)
  if (!module.exports || !module.exports.classifyItem) throw new Error('纯函数装载失败：测试出口未生效')
  return module.exports
}

module.exports = { loadPure, PURE_CHUNKS }
