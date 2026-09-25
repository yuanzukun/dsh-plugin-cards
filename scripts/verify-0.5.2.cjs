#!/usr/bin/env node
/** 0.5.2 端到端验证：「全部」= 全源 3055（精确），分类 chip 显示全源估算值（≈），点击过滤仍作用于当前页。 */
const puppeteer = require('C:/Users/54622/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core')

const URL = 'http://127.0.0.1:3080/?token=3vCpMNo78o4LyPOaQVANbopDlWJ7m_Pd_tL0oAnzg9A'
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

  const pin = async (t) => page.evaluate((t) => {
    const el = [...document.querySelectorAll('button')].find((e) => (e.textContent || '').trim() === t)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  }, t)
  const q = await pin('稍后配置')
  if (q) { await page.mouse.click(q.x, q.y); await sleep(800) }

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
    const chips = rows.length === 1 ? [...rows[0].querySelectorAll('button')].map((b) => ({
      text: b.textContent.trim(),
      title: b.title || '',
    })) : []
    const scope = (document.querySelector('.dcards-filterbar div:last-child') || {}).textContent || ''
    return {
      chipRowCount: rows.length,
      chips,
      scopeText: scope.slice(0, 80),
      cardCount: document.querySelectorAll('.dcards-card').length,
      allText: chips[0] ? chips[0].text : '',
      allHaveApprox: chips.slice(1).every((c) => /（≈\d+）$/.test(c.text)),
    }
  })
  console.log('RESULT:', JSON.stringify(result, null, 2))

  // 估算值合理性：估算 ≈ 本页数/50 × total；「智能体与技能」本页 34 → 估算 ≈ round(34/50*total)
  const total = +((result.allText.match(/（(\d+)）/) || [])[1] || 0)
  const expectAgent = Math.round(34 / result.cardCount * total)
  const agentChip = result.chips.find((c) => c.text.startsWith('智能体与技能'))
  const agentEst = +((agentChip.text.match(/（≈(\d+)）/) || [])[1] || 0)
  console.log('EST-CHECK: expect≈' + expectAgent + ' actual≈' + agentEst)

  // 点击分类过滤验证仍作用于当前页
  const clickChip = (pat) => page.evaluate((pat) => {
    const re = new RegExp(pat)
    const b = [...document.querySelectorAll('button')].find((e) => re.test((e.textContent || '').trim()))
    if (b) { b.click(); return b.textContent.trim() } return null
  }, pat)
  const clicked = await clickChip(String.raw`^智能体与技能（≈\d+）$`)
  await sleep(1000)
  const after = await page.evaluate(() => ({ cards: document.querySelectorAll('.dcards-card').length }))
  console.log('FILTER:', clicked, '-> cards:', after.cards, '(expect 34, current-page filter)')

  await page.screenshot({ path: 'D:/导航/dsh-plugin/scripts/verify-0.5.2.png' })
  console.log('pageerrors:', errors.length ? errors.slice(0, 5) : 'none')
  await browser.close()

  // 429 = MyMemory 兜底配额耗尽的预期回退（LLM 主通道正常），不计入失败
  const realErrors = errors.filter((e) => !/429/.test(e))
  const ok = result.chipRowCount === 1 && result.allHaveApprox && total > 3000
    && Math.abs(agentEst - expectAgent) <= 2 && after.cards === 34 && realErrors.length === 0
  console.log('realErrors:', realErrors.length ? realErrors.slice(0, 5) : 'none')
  console.log(ok ? 'ALL-GREEN' : 'FAILED')
  process.exit(ok ? 0 : 1)
})().catch((e) => { console.error('FATAL', e); process.exit(1) })
