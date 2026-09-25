/* 0.4.5 验证：话题回归多标签真实计数（DeepSeek≈30 而非 6）+ 三行结构保留 + 过滤正常 */
const puppeteer = require('C:/Users/54622/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core')
const URL = 'http://127.0.0.1:3080/?token=x5nbkz5p0F0-oDIsOWNR14EayqiTfYnVUxPI44Xqvv4'
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
  results.pageCount = await page.evaluate(() => document.querySelectorAll('.dcards-card').length)

  // ① 话题为多标签真实计数：和应 ≥ 条目数（主话题失真已消除——DeepSeek/智能体应为 ~30/28 而非 6/3）
  const topicSum = (results.rows['话题：'] || []).reduce((s, t) => s + Number((t.match(/（(\d+)）$/) || [0, 0])[1]), 0)
  results.topicSum = topicSum
  results.topicSumAtLeastPage = topicSum >= results.pageCount
  results.topicTitles = await page.evaluate(() =>
    [...document.querySelectorAll('.dcards-chiprow.scroll button')].slice(0, 3).map((b) => b.title))

  // ② 分类行互斥可加仍成立
  const sumCat = (rows) => Object.entries(rows['分类：'] || [])
    .filter(([, t]) => !/^全部（/.test(t))
    .reduce((s, [, t]) => s + Number((t.match(/（(\d+)）$/) || [0, 0])[1]), 0)
  results.catSumEqualsPage = sumCat(results.rows) === results.pageCount

  const clickChip = async (pattern) => page.evaluate((p) => {
    const re = new RegExp(p)
    const b = [...document.querySelectorAll('button')].find((e) => re.test((e.textContent || '').trim()))
    if (b) { b.click(); return true } return false
  }, pattern)

  // ③ 话题过滤仍生效（点 DeepSeek → 卡片数 = DeepSeek 计数）
  const dsChip = (results.rows['话题：'] || []).find((t) => /^DeepSeek（\d+）$/.test(t))
  results.deepseekChip = dsChip || null
  if (dsChip) {
    await clickChip('^' + dsChip + '$')
    await new Promise((r) => setTimeout(r, 600))
    results.afterDeepseek = await page.evaluate(() => document.querySelectorAll('.dcards-card').length)
    await clickChip('^' + dsChip + '$') // 再点取消
    await new Promise((r) => setTimeout(r, 600))
  }

  results.scopeNote = await page.evaluate(() => {
    const el = [...document.querySelectorAll('div')].find((e) => e.childElementCount === 0 && /计数口径/.test(e.textContent || ''))
    return el ? el.textContent.trim() : null
  })

  await page.screenshot({ path: 'D:/导航/dsh-plugin/scripts/verify-0.4.5.png' })
  console.log(JSON.stringify(results, null, 2))
  console.log('pageErrors:', errors.slice(0, 3))
  await browser.close()
}
main().catch((e) => { console.error('FATAL', e); process.exit(1) })
