/* 0.2.5 UI 验证：设置 → 社区插件 → 数据源显示友好地址 + 目录条目加载 */
const puppeteer = require('C:/Users/54622/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core')
const URL = 'http://127.0.0.1:3080/?token=TPBevvRBCHIBkf082DaLDCEMKobSq_TypTNB7Y-Cfp8'
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'

async function main() {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 })
  await new Promise((r) => setTimeout(r, 5000))

  const clickTitle = async (t) => page.evaluate((t) => {
    const el = document.querySelector(`[title="${t}"]`) ||
      [...document.querySelectorAll('[title],[aria-label]')].find((e) => (e.getAttribute('title') || e.getAttribute('aria-label')) === t)
    if (el) { el.click(); return true } return false
  }, t)

  const results = {}
  results.clickedSettings = await clickTitle('设置')
  await new Promise((r) => setTimeout(r, 2500))

  // 点击社区插件入口
  results.clickedCommunity = await page.evaluate(() => {
    const els = [...document.querySelectorAll('*')]
    const el = els.find((e) => e.childElementCount === 0 && /社区插件/.test(e.textContent || ''))
    if (el) { el.click(); return true } return false
  })
  await new Promise((r) => setTimeout(r, 5000)) // 等 GitHub API fetch

  const text = await page.evaluate(() => document.body.innerText)
  results.friendlySource = text.includes('数据源：https://github.com/topics/dsh-plugin')
  results.rawApiShown = text.includes('api.github.com')
  results.hasEntries = text.includes('安装') && /dsh-plugin|deepseek/i.test(text)
  // 取市场区域片段
  const idx = text.indexOf('数据源')
  results.snippet = idx >= 0 ? text.slice(idx - 100, idx + 300) : text.slice(0, 400)

  await page.screenshot({ path: 'D:/导航/dsh-plugin/scripts/verify-0.2.5.png' })
  console.log(JSON.stringify(results, null, 2))
  await browser.close()
}
main().catch((e) => { console.error('FATAL', e); process.exit(1) })
