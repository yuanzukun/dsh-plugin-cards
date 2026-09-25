/* 0.3.1 最终验证：弹窗关闭 → 设置 → 社区插件 → 中文描述翻译 */
const puppeteer = require('C:/Users/54622/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core')
const URL = 'http://127.0.0.1:3080/?token=9X-7lzzjWshk5wLc2b9TYAX_5_aUhqOTj_3mD_mRSOs'
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'

async function main() {
  const browser = await puppeteer.launch({
    executablePath: EDGE, headless: 'new',
    defaultViewport: { width: 1440, height: 900 }, args: ['--no-sandbox'],
  })
  const page = await browser.newPage()
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 })
  await new Promise((r) => setTimeout(r, 6000))

  // 1) 关闭 API Key 引导弹窗（真实坐标点击）
  const pos = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((e) => /稍后配置/.test(e.textContent || ''))
    if (!btn) return null
    const r = btn.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  })
  if (pos) await page.mouse.click(pos.x, pos.y)
  await new Promise((r) => setTimeout(r, 2000))
  console.log('弹窗已关')

  // 2) 侧边栏点击「设置」（文本匹配）
  const clickedSettings = await page.evaluate(() => {
    const el = [...document.querySelectorAll('*')].find((e) => e.childElementCount === 0 && (e.textContent || '').trim() === '设置')
    if (el) { el.click(); return true } return false
  })
  console.log('点击设置:', clickedSettings)
  await new Promise((r) => setTimeout(r, 2500))

  // 3) 点击「社区插件」
  const clickedCommunity = await page.evaluate(() => {
    const el = [...document.querySelectorAll('*')].find((e) => e.childElementCount === 0 && /社区插件/.test(e.textContent || ''))
    if (el) { el.click(); return true } return false
  })
  console.log('点击社区插件:', clickedCommunity)

  // 4) 等目录 + 翻译批次（35 秒）
  await new Promise((r) => setTimeout(r, 35000))

  const results = await page.evaluate(() => {
    const t = document.body.innerText
    const entries = performance.getEntriesByType('resource').map((e) => e.name)
    let cache = {}
    try { cache = JSON.parse(localStorage.getItem('dsh-plugin-cards.tx') || '{}') } catch (e) {}
    const zhCards = [...document.querySelectorAll('p')]
      .map((e) => e.innerText)
      .filter((x) => /[\u4e00-\u9fff]{8,}/.test(x) && !/开始使用|工作区|配置 DeepSeek|描述你想要|探索未至/.test(x))
    return {
      marketOpen: /数据源：/.test(t),
      count: (/匹配 \d+ 个，已加载 \d+ 个/.exec(t) || [])[0] || null,
      zhToggle: t.includes('中文描述：开'),
      ghReq: entries.filter((n) => n.includes('api.github.com')).length,
      mmReq: entries.filter((n) => n.includes('mymemory')).length,
      txCacheEntries: Object.keys(cache).length,
      zhCount: zhCards.length,
      zhSample: zhCards.slice(0, 4),
    }
  })
  console.log(JSON.stringify(results, null, 1))
  await page.screenshot({ path: 'D:/导航/dsh-plugin/scripts/verify-0.3.1.png' })
  await browser.close()
}
main().catch((e) => { console.error('FATAL', e); process.exit(1) })
