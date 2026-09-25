/* 0.5.0 验证：官方数据驱动的 8+1 分类体系 + 新分类过滤 + 旧标签徽章颜色 */
const puppeteer = require('C:/Users/54622/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core')
const URL = 'http://127.0.0.1:3080/?token=G1Z9MPmRXQghsbH0gJvUGSdTJukl6CMVGLHi_1rjpVc'
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

  // ① 新分类行可加性
  const sumCat = (rows) => Object.entries(rows['分类：'] || [])
    .filter(([, t]) => !/^全部（/.test(t))
    .reduce((s, [, t]) => s + Number((t.match(/（(\d+)）$/) || [0, 0])[1]), 0)
  results.catSumEqualsPage = sumCat(results.rows) === results.pageCount
  results.oldLabelsGone = JSON.stringify(results.rows).indexOf('AI 与 Agent') === -1
    && JSON.stringify(results.rows).indexOf('框架与核心') === -1

  const clickChip = async (pattern) => page.evaluate((p) => {
    const re = new RegExp(p)
    const b = [...document.querySelectorAll('button')].find((e) => re.test((e.textContent || '').trim()))
    if (b) { b.click(); return true } return false
  }, pattern)

  // ② 新分类过滤生效：点「框架与宿主集成」→ 卡片数 = 计数；徽章显示新分类名
  const hostChip = (results.rows['分类：'] || []).find((t) => /^框架与宿主集成（\d+）$/.test(t))
  results.hostChip = hostChip || null
  if (hostChip) {
    await clickChip('^' + hostChip + '$')
    await new Promise((r) => setTimeout(r, 600))
    results.hostView = await page.evaluate(() => ({
      cardCount: document.querySelectorAll('.dcards-card').length,
      badges: [...new Set([...document.querySelectorAll('.dcards-badge')].map((e) => e.textContent))].slice(0, 8),
    }))
    await clickChip('^' + hostChip + '$') // 切回全部
    await new Promise((r) => setTimeout(r, 600))
  }

  // ③ 话题词典扩充生效（应有 Codex / OpenCode / DSH 插件等新中文条目）
  results.topicChips = results.rows['话题：'] || []

  results.scopeNote = await page.evaluate(() => {
    const el = [...document.querySelectorAll('div')].find((e) => e.childElementCount === 0 && /计数口径/.test(e.textContent || ''))
    return el ? el.textContent.trim() : null
  })

  await page.screenshot({ path: 'D:/导航/dsh-plugin/scripts/verify-0.5.0.png' })
  console.log(JSON.stringify(results, null, 2))
  console.log('pageErrors:', errors.slice(0, 3))
  await browser.close()
}
main().catch((e) => { console.error('FATAL', e); process.exit(1) })
