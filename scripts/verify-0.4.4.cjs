/* 0.4.4 验证：分类/推荐/话题三行分离 + 分类行可加 + 主话题互斥（话题之和=条目数） */
const puppeteer = require('C:/Users/54622/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core')
const URL = 'http://127.0.0.1:3080/?token=W85h6BpInsve-2qfQhXMD-MyddLrwq6GmMfkakqmDAc'
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

  const readRows = () => page.evaluate(() => {
    const rows = [...document.querySelectorAll('.dcards-filterbar .dcards-chiprow')]
    const out = {}
    for (const row of rows) {
      const label = row.querySelector('.dcards-rowlabel')?.textContent?.trim()
      if (!label) continue
      out[label] = [...row.querySelectorAll('button')].map((b) => (b.textContent || '').trim())
    }
    return out
  })
  results.rows = await readRows()

  // ① 分类行可加性：普通分类计数之和 = 本页条目数（50）
  results.pageCount = await page.evaluate(() => document.querySelectorAll('.dcards-card').length)
  const sumCat = (rows) => Object.entries(rows['分类：'] || [])
    .filter(([, t]) => !/^全部（/.test(t))
    .reduce((s, [, t]) => s + Number((t.match(/（(\d+)）$/) || [0, 0])[1]), 0)
  results.catSumNoAll = sumCat(results.rows)
  results.catSumEqualsPage = results.catSumNoAll === results.pageCount

  // ② 选中套件后：卡片数 = 套件计数；话题行计数之和 = 卡片数（互斥归属）
  const clickChip = async (pattern) => page.evaluate((p) => {
    const re = new RegExp(p)
    const b = [...document.querySelectorAll('button')].find((e) => re.test((e.textContent || '').trim()))
    if (b) { b.click(); return true } return false
  }, pattern)
  const suiteChip = (results.rows['推荐：'] || []).find((t) => /^🧩 套件（\d+）$/.test(t))
  results.suiteChipText = suiteChip || null
  results.clickSuite = suiteChip ? await clickChip('^' + suiteChip.replace(/[()]/g, '\\$&').replace(/（/, '（').replace(/）/, '）') + '$') : false
  await new Promise((r) => setTimeout(r, 600))
  results.afterSuite = await page.evaluate(() => ({
    cardCount: document.querySelectorAll('.dcards-card').length,
    topics: [...document.querySelectorAll('.dcards-chiprow.scroll button')].map((b) => (b.textContent || '').trim()),
  }))
  const topicSum = results.afterSuite.topics.reduce((s, t) => s + Number((t.match(/（(\d+)）$/) || [0, 0])[1]), 0)
  results.topicSumInSuite = topicSum
  results.topicSumEqualsCards = topicSum === results.afterSuite.cardCount

  // ③ 回到全部，选「智能体」类主话题验证过滤生效
  await clickChip('^全部（\\d+）$')
  await new Promise((r) => setTimeout(r, 600))
  results.clickTopic = await clickChip('^智能体（\\d+）$')
  await new Promise((r) => setTimeout(r, 600))
  results.afterTopic = await page.evaluate(() => ({
    cardCount: document.querySelectorAll('.dcards-card').length,
    activeTopic: [...document.querySelectorAll('.dcards-chiprow.scroll button')].find((b) => b.style.background === 'rgb(47, 111, 237)')?.textContent.trim() || null,
  }))

  results.scopeNote = await page.evaluate(() => {
    const el = [...document.querySelectorAll('div')].find((e) => e.childElementCount === 0 && /计数口径/.test(e.textContent || ''))
    return el ? el.textContent.trim() : null
  })

  await clickChip('^全部（\\d+）$')
  await new Promise((r) => setTimeout(r, 600))
  await page.screenshot({ path: 'D:/导航/dsh-plugin/scripts/verify-0.4.4.png' })
  console.log(JSON.stringify(results, null, 2))
  console.log('pageErrors:', errors.slice(0, 3))
  await browser.close()
}
main().catch((e) => { console.error('FATAL', e); process.exit(1) })
