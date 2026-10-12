#!/usr/bin/env node
/**
 * refresh-factory-snapshot.cjs —— 出厂快照原料刷新（2026-10-12 方案 A：assets 出库配套）
 *
 * 背景：assets/cards-snapshot.json（hub 全量快照镜像，13.7k 条 / ~7.5MB 且持续增长）
 *   曾随每次刷新整文件入 git 历史（9 个 blob 47MB 原始量），是仓库体积的无界增长源。
 *   方案 A 起该文件出库（.gitignore），本脚本负责把它拉回本地：
 *     - 本地构建：node scripts/refresh-factory-snapshot.cjs（或 --from-file 指定已有文件）
 *     - CI 发版：release.yml 在 build 前执行同样候选拉取（见 workflow 内联实现）
 *   裁剪（Top 1500）仍由 assemble-client.cjs 在 build 时进行，本脚本只做「拉取 + 校验 + 原子落盘」。
 *
 * 候选清单与 src/client/30-market-pure.js 的 SNAPSHOT_URLS 同源（客户端在线快照通道）；
 * 两处改动须同步。校验口径与 assemble-client.cjs 一致：items ≥ 1000 且 builtAt 为数字。
 *
 * 用法：
 *   node scripts/refresh-factory-snapshot.cjs                 # 按候选顺序拉取
 *   node scripts/refresh-factory-snapshot.cjs --url <u>       # 追加自定义候选（置首，测试/内网镜像）
 *   node scripts/refresh-factory-snapshot.cjs --from-file <p> # 离线：校验本地文件并落盘（免网络）
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const OUT = path.join(ROOT, 'assets', 'cards-snapshot.json')
// 与 src/client/30-market-pure.js SNAPSHOT_URLS 同源（jsDelivr 主域 + fastly/gcore 镜像）
const CANDIDATES = [
  'https://cdn.jsdelivr.net/gh/yuanzukun/dsh-plugin-hub@master/public/cards-snapshot.json',
  'https://fastly.jsdelivr.net/gh/yuanzukun/dsh-plugin-hub@master/public/cards-snapshot.json',
  'https://gcore.jsdelivr.net/gh/yuanzukun/dsh-plugin-hub@master/public/cards-snapshot.json',
]
const args = process.argv.slice(2)
const argVal = (name) => {
  const i = args.indexOf('--' + name)
  return i !== -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : null
}
const mb = (n) => (n / 1048576).toFixed(2) + 'MB'

/** 校验快照结构（与 assemble-client.cjs 同口径）；返回 { items, builtAt } 或抛错。 */
function validate(jsonText, source) {
  let d
  try { d = JSON.parse(jsonText) } catch (e) { throw new Error('JSON 解析失败 (' + source + '): ' + e.message) }
  if (!d || !Array.isArray(d.items) || d.items.length < 1000) {
    throw new Error('快照不合法 (' + source + ')：items < 1000')
  }
  if (typeof d.builtAt !== 'number') throw new Error('快照不合法 (' + source + ')：builtAt 非数字')
  const ageH = (Date.now() - d.builtAt) / 3600000
  if (ageH > 26) {
    // jsDelivr 镜像域 12-24h 缓存滞后为已知现象（客户端 SNAP_STALE_MS=13h 运行时另有守卫）；
    // 构建原料超龄只警告不阻断——出厂快照本就是离线兜底，在线链路会自动补新。
    console.log('::warning::快照原料已 ' + ageH.toFixed(1) + 'h 未构建（jsDelivr 镜像滞后？），建议 purge 或稍后重试：' + source)
  }
  return d
}

;(async () => {
  let text = null
  let used = null
  const fromFile = argVal('from-file')
  if (fromFile) {
    text = fs.readFileSync(path.resolve(fromFile), 'utf8') // 读失败直接抛，属明确用法错误
    used = 'file:' + fromFile
  } else {
    const urls = args.includes('--url') ? [argVal('url'), ...CANDIDATES].filter(Boolean) : CANDIDATES
    for (const u of urls) {
      try {
        console.log('拉取候选:', u)
        const r = await fetch(u, { headers: { Accept: 'application/json' }, redirect: 'follow' })
        if (!r.ok) { console.log('  HTTP ' + r.status + '，跳过'); continue }
        const t = await r.text()
        validate(t, u) // 先校验再落盘：坏响应不得覆盖本地好缓存
        text = t
        used = u
        break
      } catch (e) {
        console.log('  失败:', e.message)
      }
    }
  }
  if (text === null) {
    console.error('FAIL: 所有候选均未取得合法快照，本地缓存未被改动')
    process.exit(1)
  }
  const d = validate(text, used) // from-file 路径在此统一校验
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  const tmp = OUT + '.tmp'
  fs.writeFileSync(tmp, text)
  fs.renameSync(tmp, OUT) // 原子替换，中断不损缓存
  const ageH = ((Date.now() - d.builtAt) / 3600000).toFixed(1)
  console.log('✅ 出厂快照原料已就绪:', OUT, mb(text.length), '/', d.items.length, '条，builtAt',
    new Date(d.builtAt).toISOString(), '（' + ageH + 'h 前），来源:', used)
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1) })
