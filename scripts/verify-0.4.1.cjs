/* 0.4.1 验证：过滤面板排版（行标+浅灰面板+话题单行滚动）+ 话题中文词典 + ⭐推荐（官方 org 过滤+官方徽章） */
const puppeteer = require('C:/Users/54622/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core')
const URL = 'http://127.0.0.1:3080/?token=fYWZw_kCF4q_BDDO9pCgAj03T0MaUbEbYHA_Ut9XotY'
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'

async function main() {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new',
    args: ['--no-sandbox'], defaultViewport: { width: 1440, height: 900 } })
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 150)) })
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

  results.bar = await page.evaluate(() => {
    const bar = document.querySelector('.dcards-filterbar')
    const rows = [...document.querySelectorAll('.dcards-chiprow')]
    const topicRow = rows.find((e) => (e.querySelector('.dcards-rowlabel') || {}).textContent === '话题：')
    const topicBtns = topicRow ? [...topicRow.querySelectorAll('button')] : []
    return {
      panelExists: !!bar,
      panelBg: bar ? getComputedStyle(bar).backgroundColor : null,
      rowLabels: rows.map((e) => (e.querySelector('.dcards-rowlabel') || {}).textContent),
      topicSamples: topicBtns.slice(0, 8).map((b) => ({ shown: b.textContent, title: b.title })),
      topicRowScrolls: topicRow ? topicRow.scrollWidth >= topicRow.clientWidth : null,
      topicRowWrap: topicRow ? getComputedStyle(topicRow).flexWrap : null,
      recommendChip: ([...document.querySelectorAll('button')].find((b) => /^⭐ 推荐（\d+）$/.test((b.textContent || '').trim())) || {}).textContent || null,
    }
  })

  // 点击 ⭐ 推荐 → 只剩官方插件
  results.clickedRecommend = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((e) => /^⭐ 推荐（\d+）$/.test((e.textContent || '').trim()))
    if (b) { b.click(); return true } return false
  })
  await new Promise((r) => setTimeout(r, 800))
  results.recommendFilter = await page.evaluate(() => {
    const names = [...document.querySelectorAll('.dcards-name')].map((e) => e.textContent)
    const badges = [...document.querySelectorAll('.dcards-badge')].filter((e) => e.textContent === '官方').length
    return { cardCount: names.length, names: names.slice(0, 5), allOfficial: names.every((n) => n.startsWith('deepseek-ai/')), officialBadges: badges }
  })
  // 回到全部
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((e) => /^全部（\d+）$/.test((e.textContent || '').trim()))
    if (b) b.click()
  })
  await new Promise((r) => setTimeout(r, 800))
  await page.screenshot({ path: 'D:/导航/dsh-plugin/scripts/verify-0.4.1.png' })
  console.log(JSON.stringify(results, null, 2))
  console.log('pageErrors:', errors.slice(0, 3))
  await browser.close()
}
main().catch((e) => { console.error('FATAL', e); process.exit(1) })
