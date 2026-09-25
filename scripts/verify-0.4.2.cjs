/* 0.4.2 验证：推荐三层（⭐官方/🏆精品/🧩套件）chip + 过滤 + 精品徽章 */
const puppeteer = require('C:/Users/54622/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core')
const URL = 'http://127.0.0.1:3080/?token=lK4yQ8IQdjp_O0DOkFQ_ymwuy-C1W_RqZMHPGYnGG3Q'
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'

async function main() {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new',
    args: ['--no-sandbox'], defaultViewport: { width: 1440, height: 900 } })
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 })
  await new Promise((r) => setTimeout(r, 5000))
  const pinOf = (t) => page.evaluate((t) => {
    const el = [...document.querySelectorAll('button')].find((e) => (e.textContent || '').trim() === t)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return r.width > 0 ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null
  }, t)
  const clickAt = async (pin) => { if (pin) await page.mouse.click(pin.x, pin.y) }
  await clickAt(await pinOf('稍后配置'))
  await new Promise((r) => setTimeout(r, 800))
  const clickText = async (t) => {
    const q = await page.evaluate((t) => {
      const el = [...document.querySelectorAll('*')].find((e) => e.childElementCount === 0 && (e.textContent || '').trim() === t)
      if (!el) return null
      const r = el.getBoundingClientRect()
      return r.width > 0 ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null
    }, t)
    if (q) { await page.mouse.click(q.x, q.y); return true }
    return false
  }
  const results = {}
  results.clickedSettings = await clickText('设置')
  await new Promise((r) => setTimeout(r, 2000))
  results.clickedCommunity = await clickText('社区插件')
  await new Promise((r) => setTimeout(r, 7000))

  results.recChips = await page.evaluate(() =>
    [...document.querySelectorAll('button')]
      .map((b) => (b.textContent || '').trim())
      .filter((t) => /^⭐|^🏆|^🧩/.test(t) && /（\d+）$/.test(t)))
  results.chipTitles = await page.evaluate(() =>
    [...document.querySelectorAll('button[title]')]
      .map((b) => b.title).filter((t) => /官方出品|精品推荐|插件套件/.test(t)))

  const clickChip = async (pattern) => page.evaluate((p) => {
    const re = new RegExp(p)
    const b = [...document.querySelectorAll('button')].find((e) => re.test((e.textContent || '').trim()))
    if (b) { b.click(); return true } return false
  }, pattern)

  results.clickOfficial = await clickChip(String.raw`^⭐ 官方（\d+）$`)
  await new Promise((r) => setTimeout(r, 600))
  results.officialView = await page.evaluate(() => ({
    names: [...document.querySelectorAll('.dcards-name')].map((e) => e.textContent).slice(0, 3),
    badges: [...document.querySelectorAll('.dcards-badge')].map((e) => e.textContent),
  }))

  results.clickFeatured = await clickChip(String.raw`^🏆 精品（\d+）$`)
  await new Promise((r) => setTimeout(r, 600))
  results.featuredView = await page.evaluate(() => {
    const stars = [...document.querySelectorAll('.dcards-card')].map((c) => {
      const s = [...c.querySelectorAll('span')].find((e) => /^★ /.test(e.textContent || ''))
      return s ? Number(s.textContent.slice(2)) : 0
    })
    return { cardCount: stars.length, minStars: Math.min(...stars), featBadges: [...document.querySelectorAll('.dcards-badge')].filter((e) => e.textContent === '🏆 精品').length }
  })

  results.clickSuite = await clickChip(String.raw`^🧩 套件（\d+）$`)
  await new Promise((r) => setTimeout(r, 600))
  results.suiteView = await page.evaluate(() =>
    [...document.querySelectorAll('.dcards-name')].map((e) => e.textContent).slice(0, 5))

  await clickChip(String.raw`^全部（\d+）$`)
  await new Promise((r) => setTimeout(r, 600))
  await page.screenshot({ path: 'D:/导航/dsh-plugin/scripts/verify-0.4.2.png' })
  console.log(JSON.stringify(results, null, 2))
  console.log('pageErrors:', errors.slice(0, 3))
  await browser.close()
}
main().catch((e) => { console.error('FATAL', e); process.exit(1) })
