/* 模拟宿主浏览器环境调用 dsh-plugin-cards 客户端 apply，暴露被吞的异常。
 * 用法：node scripts/simulate-client-apply.cjs   （失败时退出码非 0，可作发布门禁）
 *
 * 0.9.8 重写：
 *   - react 改为内置 stub（此前 REACT_DIR 硬编码指向 deepseek-harness-src，本机/CI 均不存在，
 *     脚本实际不可运行）；apply 阶段仅触达 jsx runtime 与极少量 hooks，stub 足以覆盖。
 *   - client.js 路径改为相对仓库根解析（此前硬编码绝对路径）。
 *   - INJECT 白名单补齐 0.9.0 起实际注入的 locale 系服务与 effect 根方法。
 *   - 断言注册点齐全（对话节点 / chat 槽位 / 配置卡片 / 设置区），缺失即失败。
 */
const path = require('path')

const CLIENT_PATH = path.join(__dirname, '..', 'lib', 'client.js')

const jsxStub = () => null
const reactStub = {
  useSyncExternalStore: () => null,
  useState: (v) => [v, () => {}],
  useCallback: (f) => f,
  useRef: (v) => ({ current: v }),
  jsx: jsxStub,
  jsxs: jsxStub,
  Fragment: 'Fragment',
}

let mod = null
global.window = { __ModuleLoader__: { load: (pkg) => { mod = pkg.factory(mockRequire) } } }

function mockRequire(name) {
  if (name === 'react') return reactStub
  if (name === 'react/jsx-runtime') return { jsx: jsxStub, jsxs: jsxStub, Fragment: 'Fragment' }
  throw new Error('未知模块: ' + name)
}

const calls = []
const INJECT = new Set([
  'effect',
  'uiConversation', 'uiConversation.events', 'uiConversation.events.register',
  'slots', 'slots.inject', 'slots.register',
  'configForms', 'configForms.get', 'configForms.whileServed',
  'remote', 'remote.pluginManager', 'remote.pluginManager.listBundles',
  'remote.pluginManager.installBundle', 'remote.pluginManager.inspect',
  'locale', 'locale.register', 'locale.bind', 'locale.getSnapshot', 'locale.subscribe',
])

// 模拟 cordis 严格注入守卫：访问未 inject 的服务属性即抛错（真实环境语义）
function guarded(target, path) {
  return new Proxy(target, {
    get(t, k) {
      if (typeof k !== 'string' || k === 'inspect') return t[k]
      const full = path ? path + '.' + k : k
      if (k in t && typeof t[k] === 'object' && t[k] !== null) return guarded(t[k], full)
      if (!INJECT.has(full)) throw new Error('cannot get property "' + full + '" without inject')
      return t[k]
    },
  })
}

const form = {
  subscribe: () => () => {},
  getSnapshot: () => ({ status: 'ready', value: {}, writable: true }),
  set: () => {},
}
const ctx = guarded({
  uiConversation: { events: { register: (d) => calls.push('node:' + d.kind) } },
  slots: {
    inject: (n, p) => { calls.push('slots.inject ' + n); return p() },
    register: (k) => calls.push('slot:' + (k.name || k.key || k.id)),
  },
  configForms: {
    get: (ns) => { calls.push('configForms.get ' + ns); return form },
    whileServed: (ns, reg) => { calls.push('whileServed ' + ns.join(',')); return reg(new Set(ns)) },
  },
  remote: { pluginManager: { inspect: () => {}, installBundle: () => {}, listBundles: () => Promise.resolve([]) } },
  locale: { register: () => () => {}, bind: () => (k) => k, getSnapshot: () => ({ revision: 1 }), subscribe: () => () => {} },
  effect: (fn, name) => {
    calls.push('effect:' + name)
    try { const d = fn(); if (typeof d === 'function') d() } catch (e) {
      calls.push('‼️ effect ' + name + ' 抛错: ' + e.message)
    }
    return () => {}
  },
}, '')

require(CLIENT_PATH) // 触发 window.__ModuleLoader__.load（Node ≥22.12 支持 require ESM；无 TLA 安全）

// 与 src/index.ts Config 默认值对齐的配置
const CONFIG = {
  enabled: true,
  cardTitle: 'Plugin Cards',
  maxRecentEvents: 20,
  density: 'compact',
  catalogUrl: '',
  llmEndpoint: '',
  llmModel: '',
  llmApiKey: '',
}

try {
  mod.apply(ctx, CONFIG)
} catch (e) {
  console.log('‼️ apply 抛异常:', e.message)
  console.log((e.stack || '').split('\n').slice(0, 8).join('\n'))
  console.log('异常前轨迹:', calls.join(' | '))
  process.exit(1)
}

// 断言注册点齐全
const REQUIRED = ['node:cards-annotation', 'slot:conversation.chat.node', 'slot:plugins.bundle.config', 'slot:settings.section']
const missing = REQUIRED.filter((r) => !calls.includes(r))
if (missing.length) {
  console.log('‼️ 注册点缺失:', missing.join(', '))
  console.log('实际轨迹:', calls.join(' | '))
  process.exit(1)
}
console.log('✅ apply 全程无异常，注册点齐全。调用轨迹:')
console.log(calls.map((c) => '  ' + c).join('\n'))
