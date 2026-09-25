/* 模拟宿主浏览器环境调用 dsh-plugin-cards 客户端 apply，暴露被吞的异常 */
const path = 'D:/导航/dsh-plugin/lib/client.js'
const REACT_DIR = 'D:/ruan/deepseek-harness-src/packages/client/web/node_modules'

let mod = null
global.window = { __ModuleLoader__: { load: (pkg) => { mod = pkg.factory(mockRequire) } } }

function mockRequire(name) {
  if (name === 'react') return require(REACT_DIR + '/react')
  if (name === 'react/jsx-runtime') return require(REACT_DIR + '/react/jsx-runtime')
  throw new Error('未知模块: ' + name)
}

const calls = []
const disposer = () => calls.push('dispose')
const INJECT = new Set(['uiConversation', 'slots', 'configForms', 'remote', 'remote.pluginManager'])

// 模拟 cordis 严格注入守卫：访问未 inject 的服务属性即抛错（真实环境语义）
function guarded(target, path) {
  return new Proxy(target, {
    get(t, k) {
      if (typeof k !== 'string' || k === 'inspect' || Symbol.for(k) !== undefined) return t[k]
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
const ctx = new Proxy({
  uiConversation: { events: { register: (d) => calls.push('events.register ' + d.kind) } },
  slots: { inject: (n, p) => { calls.push('slots.inject ' + n); return p() }, register: (k, c) => calls.push('slots.register ' + k.name + ':' + (k.key || k.id)) },
  configForms: { get: (ns) => { calls.push('configForms.get ' + ns); return form }, whileServed: (ns, reg) => { calls.push('whileServed ' + ns.join(',')); return reg(new Set(ns)) } },
  remote: { pluginManager: { inspect: () => {}, installBundle: () => {} } },
  effect: (fn, name) => { calls.push('effect ' + name); try { const d = fn(); calls.push('  effect 回调成功, 返回 ' + typeof d) } catch (e) { calls.push('  ‼️ effect 回调抛错: ' + e.message + '\n' + (e.stack || '').split('\n').slice(1, 4).join('\n')) } return () => {} },
}, {
  get(t, k) { if (k in t) return t[k]; return undefined },
})

require(path) // 触发 window.__ModuleLoader__.load，工厂被调用后 mod 赋值

try {
  mod.apply(guarded(ctx, ''))
  console.log('✅ apply 全程无异常。调用轨迹:')
  console.log(calls.map((c) => '  ' + c).join('\n'))
} catch (e) {
  console.log('‼️ apply 抛异常:', e.message)
  console.log((e.stack || '').split('\n').slice(0, 8).join('\n'))
  console.log('异常前轨迹:', calls.join(' | '))
}
