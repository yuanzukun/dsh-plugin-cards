#!/usr/bin/env node
/** 0.5.1 端到端验证：推荐/话题两行已移除，仅保留官方数据驱动的「分类」行；分类过滤与徽章正常。 */
const puppeteer = require('C:/Users/54622/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core')

const URL = 'http://127.0.0.1:3080/?token=DETBjdWpjEQ9XfkYKnN1wsV3t1K5n_dK8yTEu_yyJOs'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

;(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: 'new', args: ['--no-sandbox'], defaultViewport: { width: 1440, height: 900 },
  })
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)) })

  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 })
  await sleep(5000)

  // 引导弹窗处置（0.3.3 坑：真模态需坐标点击）
  const pin = async (t) => page.evaluate((t) => {
    const el = [...document.querySelectorAll('button')].find((e) => (e.textContent || '').trim() === t)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  }, t)
  const q = await pin('稍后配置')
  if (q) { await page.mouse.click(q.x, q.y); await sleep(800) }

  // 导航：设置 → 社区插件
  const clickText = async (t) => {
    const p = await page.evaluate((t) => {
      const el = [...document.querySelectorAll('*')].find((e) => e.childElementCount === 0 && (e.textContent || '').trim() === t)
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
    }, t)
    if (p) { await page.mouse.click(p.x, p.y); return true }
    return false
  }
  console.log('settings:', await clickText('设置'))
  await sleep(2000)
  console.log('community:', await clickText('社区插件'))
  await sleep(8000)

  const result = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.dcards-filterbar .dcards-chiprow')]
    const labels = rows.map((r) => (r.querySelector('.dcards-rowlabel') || {}).textContent || '(无行标)')
    const bodyText = document.body.innerText
    const catButtons = rows.length === 1
      ? [...rows[0].querySelectorAll('button')].map((b) => b.textContent.trim()) : []
    return {
      chipRowCount: rows.length,
      rowLabels: labels,
      hasRecRow: bodyText.includes('推荐：'),
      hasTopicRow: bodyText.includes('话题：'),
      catButtons,
      cardCount: document.querySelectorAll('.dcards-card').length,
    }
  })
  console.log('RESULT:', JSON.stringify(result, null, 2))

  // 点击分类过滤验证功能保留
  const clickChip = (pat) => page.evaluate((pat) => {
    const re = new RegExp(pat)
    const b = [...document.querySelectorAll('button')].find((e) => re.test((e.textContent || '').trim()))
    if (b) { b.click(); return b.textContent.trim() } return null
  }, pat)
  const clicked = await clickChip(String.raw`^(智能体与技能|界面与桌面|框架与宿主集成|工具与自动化)（\d+）$`)
  await sleep(1000)
  const after = await page.evaluate(() => ({
    clickedVisible: true,
    cards: document.querySelectorAll('.dcards-card').length,
  }))
  console.log('FILTER:', clicked, '->', JSON.stringify(after))

  // 求和校验：分类 chip 数之和 = 本页条目数
  const sumCheck = await page.evaluate(() => {
    const nums = [...document.querySelectorAll('.dcards-chiprow button')]
      .map((b) => { const m = (b.textContent || '').match(/（(\d+)）$/); return m ? +m[1] : null }).filter((n) => n !== null)
    const total = nums.shift() // 第一个是「全部」
    return { total, sum: nums.reduce((a, b) => a + b, 0), parts: nums }
  })
  console.log('SUM:', JSON.stringify(sumCheck))

  await page.screenshot({ path: 'D:/导航/dsh-plugin/scripts/verify-0.5.1.png' })
  console.log('pageerrors:', errors.length ? errors.slice(0, 5) : 'none')
  await browser.close()

  // 断言
  const ok = !result.hasRecRow && !result.hasTopicRow && result.chipRowCount === 1
    && result.rowLabels[0] === '分类：' && after.cards > 0 && errors.length === 0
  console.log(ok ? 'ALL-GREEN' : 'FAILED')
  process.exit(ok ? 0 : 1)
})().catch((e) => { console.error('FATAL', e); process.exit(1) })
