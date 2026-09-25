#!/usr/bin/env node
/** 0.5.3 端到端验证：多页采样折算分类数量（前 3 页 ≤300 条）、分页条「本页匹配 N 条」、过滤作用于当前页。 */
const puppeteer = require('C:/Users/54622/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core')

const URL = 'http://127.0.0.1:3080/?token=L9jxdAy_cR4kU7I7lKQEmBZl9GUK97_ivOLugHoPJeM'
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

  // 第一轮快照（采样进行中/刚完成的过渡态）
  const snap1 = await page.evaluate(() => {
    const chips = [...document.querySelectorAll('.dcards-filterbar .dcards-chiprow button')].map((b) => ({
      text: b.textContent.trim(), title: b.title || '',
    }))
    const scope = [...document.querySelectorAll('.dcards-filterbar > div')].pop()
    return { chips, scope: scope ? scope.textContent : '', cards: document.querySelectorAll('.dcards-card').length }
  })
  console.log('SNAP1:', JSON.stringify(snap1, null, 2).slice(0, 1600))

  // 等采样完成（3 页串行 + 600ms 间隔 + 网络延迟 ≈ 6~10s；首屏已等 8s，再等 10s）
  await sleep(10000)
  const snap2 = await page.evaluate(() => {
    const chips = [...document.querySelectorAll('.dcards-filterbar .dcards-chiprow button')].map((b) => ({
      text: b.textContent.trim(), title: b.title || '',
    }))
    const scope = [...document.querySelectorAll('.dcards-filterbar > div')].pop()
    return { chips, scope: scope ? scope.textContent : '', cards: document.querySelectorAll('.dcards-card').length }
  })
  console.log('SNAP2 (after sampling):', JSON.stringify(snap2, null, 2).slice(0, 1800))

  // 点击分类过滤 → 分页条应出现「（本页匹配 N 条）」
  const clickChip = (pat) => page.evaluate((pat) => {
    const re = new RegExp(pat)
    const b = [...document.querySelectorAll('button')].find((e) => re.test((e.textContent || '').trim()))
    if (b) { b.click(); return b.textContent.trim() } return null
  }, pat)
  const clicked = await clickChip(String.raw`^智能体与技能（≈\d+）$`)
  await sleep(1000)
  const after = await page.evaluate(() => {
    const bar = document.querySelector('.dcards-pagebar span')
    return { pagebar: bar ? bar.textContent.trim() : '(no pagebar)', cards: document.querySelectorAll('.dcards-card').length }
  })
  console.log('FILTER:', clicked, '->', JSON.stringify(after))

  await page.screenshot({ path: 'D:/导航/dsh-plugin/scripts/verify-0.5.3.png' })
  const realErrors = errors.filter((e) => !/429/.test(e))
  console.log('pageerrors(real):', realErrors.length ? realErrors.slice(0, 5) : 'none')
  await browser.close()

  // 断言：采样完成后 scope 注明采样折算、chips 带 ≈、过滤后 pagebar 有「本页匹配 34 条」、卡片 34
  const agent = snap2.chips.find((c) => c.text.startsWith('智能体与技能'))
  const ok = snap2.chips.length > 2 && snap2.chips.slice(1).every((c) => /（≈\d+）$/.test(c.text))
    && /采样/.test(snap2.scope)
    && agent && /前 3 页 \d+ 条采样折算/.test(agent.title)
    && /本页匹配 34 条/.test(after.pagebar) && after.cards === 34 && realErrors.length === 0
  console.log(ok ? 'ALL-GREEN' : 'FAILED')
  process.exit(ok ? 0 : 1)
})().catch((e) => { console.error('FATAL', e); process.exit(1) })
