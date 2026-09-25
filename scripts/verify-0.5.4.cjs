#!/usr/bin/env node
/**
 * 0.5.4 端到端验证：全量精确统计 + 跨页过滤。
 * 冷启动（localStorage 空）下：先看到「统计中」进度 → 等索引就绪 → chips 精确数（无 ≈/…）
 * → 点分类跨页筛选（pagebar 共 N 个精确、客户端翻页）→ 刷新后秒级就绪（缓存生效）。
 */
const puppeteer = require('C:/Users/54622/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core')

const URL = 'http://127.0.0.1:3080/?token=YR_xtGMm8SfROhfgWe0y-l_goBjyGKe91sUW_3q0Tno'
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
  await sleep(5000)

  const snap = () => page.evaluate(() => {
    const chips = [...document.querySelectorAll('.dcards-filterbar .dcards-chiprow button')].map((b) => ({
      text: b.textContent.trim(), title: b.title || '',
    }))
    const scope = [...document.querySelectorAll('.dcards-filterbar > div')].pop()
    const bar = document.querySelector('.dcards-pagebar span')
    return {
      chips: chips.map((c) => c.text), scope: scope ? scope.textContent : '',
      pagebar: bar ? bar.textContent.trim() : '', cards: document.querySelectorAll('.dcards-card').length,
    }
  })

  const s0 = await snap()
  console.log('COLD:', JSON.stringify({ scope: s0.scope, chips: s0.chips.slice(0, 4), cards: s0.cards }))

  // 轮询等索引就绪（冷启动全量抓取约 4~8 分钟；上限 12 分钟）
  let ready = null
  for (let i = 0; i < 72; i++) {
    await sleep(10000)
    const s = await snap()
    if (/全量精确统计（/.test(s.scope) && !/统计中/.test(s.scope)) { ready = s; break }
    if (i % 6 === 0) console.log('waiting... scope=', s.scope.slice(0, 80))
  }
  if (!ready) { console.log('FAILED: index not ready in 12min'); await browser.close(); process.exit(1) }
  console.log('READY:', JSON.stringify({ scope: ready.scope, chips: ready.chips, pagebar: ready.pagebar, cards: ready.cards }))

  // 断言 A：chips 全部精确数（无 ≈、无 …），全部 ≈ 3055
  const allChip = ready.chips.find((c) => c.startsWith('全部'))
  const catChips = ready.chips.filter((c) => !c.startsWith('全部'))
  const allN = Number((allChip.match(/（(\d+)）/) || [])[1])
  const assertA = catChips.length > 0 && catChips.every((c) => /（\d+）$/.test(c))
    && allN > 2900 && allN < 3200

  // 点击「界面与桌面」→ 跨页筛选：pagebar 显示「共 N 个（界面与桌面 精确统计）」，卡片 = N 或 50
  const clicked = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((e) => /^界面与桌面（\d+）$/.test((e.textContent || '').trim()))
    if (b) { b.click(); return b.textContent.trim() } return null
  })
  await sleep(1500)
  const f1 = await snap()
  console.log('FILTER:', clicked, '->', JSON.stringify({ pagebar: f1.pagebar, cards: f1.cards }))
  const fN = Number((f1.pagebar.match(/共 (\d+) 个/) || [])[1])
  const chipN = clicked ? Number(clicked.match(/（(\d+)）/)[1]) : 0
  const assertB = clicked && new RegExp('界面与桌面 精确统计').test(f1.pagebar) && fN === chipN
    && f1.cards === Math.min(50, fN)

  // 客户端翻页：下一页 → 第 2 页，卡片数变化仍正常
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((e) => (e.textContent || '').trim() === '下一页')
    if (b) b.click()
  })
  await sleep(1000)
  const f2 = await snap()
  console.log('PAGE2:', JSON.stringify({ pagebar: f2.pagebar, cards: f2.cards }))
  const assertC = /第 2 \//.test(f2.pagebar) && f2.cards > 0

  // 回「全部」→ pagebar 共 N 应等于 全部 chip 数（可加性口径一致）
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((e) => /^全部（\d+）$/.test((e.textContent || '').trim()))
    if (b) b.click()
  })
  await sleep(1000)
  const f3 = await snap()
  const f3N = Number((f3.pagebar.match(/共 (\d+) 个/) || [])[1])
  const assertD = f3N === allN
  console.log('ALLVIEW:', f3.pagebar, 'cards=', f3.cards)

  // 缓存生效：reload 后索引应秒级就绪（无需等待全量抓取）
  await page.reload({ waitUntil: 'networkidle2' })
  await sleep(5000)
  // reload 后可能重现「稍后配置」弹窗/侧边栏收起 → 重试点击导航
  let s2 = null, cachedScope = ''
  for (let i = 0; i < 10; i++) {
    const qq = await pin('稍后配置')
    if (qq) { await page.mouse.click(qq.x, qq.y); await sleep(800) }
    await clickText('设置')
    await sleep(1200)
    const ok2 = await clickText('社区插件')
    await sleep(2500)
    s2 = await snap()
    if (s2.scope) { cachedScope = s2.scope; break }
    console.log('E retry', i, 'scope empty')
  }
  console.log('CACHED:', JSON.stringify({ scope: cachedScope.slice(0, 100), all: s2 ? s2.chips[0] : '(none)' }))
  const assertE = /全量精确统计（/.test(cachedScope) && s2 && /（\d+）/.test(s2.chips[0] || '') && !/统计中/.test(cachedScope)

  await page.screenshot({ path: 'D:/导航/dsh-plugin/scripts/verify-0.5.4.png' })
  await browser.close()
  const realErrors = errors.filter((e) => !/429/.test(e))
  console.log('pageerrors(real):', realErrors.length ? realErrors.slice(0, 5) : 'none')
  const ok = assertA && assertB && assertC && assertD && assertE && realErrors.length === 0
  console.log('asserts:', JSON.stringify({ A: assertA, B: assertB, C: assertC, D: assertD, E: assertE }))
  console.log(ok ? 'ALL-GREEN' : 'FAILED')
  process.exit(ok ? 0 : 1)
})().catch((e) => { console.error('FATAL', e); process.exit(1) })
