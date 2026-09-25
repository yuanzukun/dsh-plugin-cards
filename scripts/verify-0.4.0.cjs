/* 0.4.0 验证：网格卡片布局 + 经典分页（共 N 页/下一页/每页条数）+ 排序切换 + 已安装回显 */
const puppeteer = require('C:/Users/54622/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core')
const URL = 'http://127.0.0.1:3080/?token=Tc-lNmwCJ2afqO0JEJOy2gkdibtqM5NzfIHVTIEGkrM'
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'

async function main() {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new',
    args: ['--no-sandbox'], defaultViewport: { width: 1440, height: 900 } })
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 })
  await new Promise((r) => setTimeout(r, 5000))

  // 引导弹窗处置：坐标点「稍后配置」（0.3.3 踩坑：真模态需坐标点击）
  await new Promise((r) => setTimeout(r, 500))
  const pinOf = (t) => page.evaluate((t) => {
    const el = [...document.querySelectorAll('button')].find((e) => (e.textContent || '').trim() === t)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return r.width > 0 ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null
  }, t)
  const clickAt = async (pin) => { if (pin) await page.mouse.click(pin.x, pin.y) }
  await clickAt(await pinOf('稍后配置'))
  await new Promise((r) => setTimeout(r, 800))
  await clickAt(await pinOf('稍后配置'))
  await new Promise((r) => setTimeout(r, 800))
  const clickText = async (t) => page.evaluate((t) => {
    const el = [...document.querySelectorAll('button,[title],[aria-label],span,div')]
      .find((e) => e.childElementCount === 0 && (e.textContent || '').trim() === t)
      || [...document.querySelectorAll('[title]')].find((e) => e.getAttribute('title') === t)
    if (!el) return false
    const r = el.getBoundingClientRect()
    if (r.width > 0) { window.__pin = { x: r.x + r.width / 2, y: r.y + r.height / 2 }; return true }
    return false
  }, t).then(async (ok) => {
    if (!ok) return false
    const pin = await page.evaluate(() => window.__pin)
    await page.mouse.click(pin.x, pin.y)
    return true
  })

  const results = {}
  results.clickedSettings = await clickText('设置')
  await new Promise((r) => setTimeout(r, 2000))
  results.clickedCommunity = await clickText('社区插件')
  await new Promise((r) => setTimeout(r, 7000)) // 等 GitHub API 首屏

  const snap = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.dcards-card')]
    const badge = document.querySelector('.dcards-badge')
    const desc = document.querySelector('.dcards-desc')
    const info = [...document.querySelectorAll('.dcards-pagebar span')].map((e) => e.textContent).join(' ')
    const names = [...document.querySelectorAll('.dcards-name')].map((e) => e.textContent)
    return {
      cardCount: cards.length,
      sampleNames: names.slice(0, 3),
      anyGithubPrefix: names.some((n) => /^github:/.test(n)),
      badgeText: badge ? badge.textContent : null,
      badgeBg: badge ? badge.style.background : null,
      descClamp: desc ? getComputedStyle(desc).webkitLineClamp : null,
      pagebarInfo: info,
      hasNext: [...document.querySelectorAll('.dcards-pagebar button')].some((b) => b.textContent === '下一页'),
      sortChip: (document.querySelector('button[title*="排序"]') || {}).textContent || null,
      pageSizeOptions: [...document.querySelectorAll('.dcards-pagebar select option')].map((o) => o.value),
      installedBtns: [...document.querySelectorAll('span')].filter((e) => e.textContent === '已安装').length,
      stillSkel: document.querySelectorAll('.dcards-skel').length,
    }
  })
  results.grid = snap

  // 翻页：下一页 → 第 2 页
  results.clickedNext = await page.evaluate(() => {
    const b = [...document.querySelectorAll('.dcards-pagebar button')].find((e) => e.textContent === '下一页')
    if (b && !b.disabled) { b.click(); return true } return false
  })
  await new Promise((r) => setTimeout(r, 5000))
  results.page2Info = await page.evaluate(() =>
    [...document.querySelectorAll('.dcards-pagebar span')].map((e) => e.textContent).join(' '))

  // 每页条数切到 20
  results.setPageSize = await page.evaluate(() => {
    const sel = document.querySelector('.dcards-pagebar select')
    if (!sel) return false
    const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set
    setter.call(sel, '20')
    sel.dispatchEvent(new Event('change', { bubbles: true }))
    return true
  })
  await new Promise((r) => setTimeout(r, 5000))
  results.pageSizeResult = await page.evaluate(() => ({
    cards: document.querySelectorAll('.dcards-card').length,
    info: [...document.querySelectorAll('.dcards-pagebar span')].map((e) => e.textContent).join(' '),
  }))

  // 排序切换
  results.toggledSort = await page.evaluate(() => {
    const b = document.querySelector('button[title*="排序"]')
    if (b) { b.click(); return true } return false
  })
  await new Promise((r) => setTimeout(r, 5000))
  results.sortAfter = await page.evaluate(() => (document.querySelector('button[title*="排序"]') || {}).textContent || null)

  await page.screenshot({ path: 'D:/导航/dsh-plugin/scripts/verify-0.4.0.png', fullPage: false })
  console.log(JSON.stringify(results, null, 2))
  console.log('pageErrors:', errors.slice(0, 3))
  await browser.close()
}
main().catch((e) => { console.error('FATAL', e); process.exit(1) })
