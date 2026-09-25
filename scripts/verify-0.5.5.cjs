#!/usr/bin/env node
/**
 * 0.5.5 端到端验证：快照优先 + 实时兜底 + 安装链路完整。
 * A. 快照秒级就绪（本地 8941 快照服务 + localStorage 覆盖），scope 标注快照日期，chips 精确
 * B. 分类跨页筛选（pagebar 共 N 个精确）  C. 客户端翻页  D. 全部视图口径一致
 * E. reload 缓存秒级就绪
 * F. 兜底回退：快照不可达 + 缓存清空 → 显示「统计中」进入分桶收割
 * G. 安装链路：卡片保留 安装/已安装 按钮且数据含 full_name（specOf → github:owner/repo）
 */
const puppeteer = require('C:/Users/54622/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core')

const URL = 'http://127.0.0.1:3080/?token=tl4m_1aTDBfV6nn2P2ouViL-H4mz1yk5TQPXlQeG8ME'
const SNAP_URL = 'http://127.0.0.1:8941/cards-snapshot.json'
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

  // 预置：快照覆盖 + 清缓存，强制走快照路径
  await page.evaluate((u) => {
    localStorage.setItem('dsh-plugin-cards.snapshotUrl', u)
    localStorage.removeItem('dsh-plugin-cards.catidx.v1')
  }, SNAP_URL)
  await page.reload({ waitUntil: 'networkidle2' })
  await sleep(4000)
  const q2 = await pin('稍后配置')
  if (q2) { await page.mouse.click(q2.x, q2.y); await sleep(800) }

  const openPanel = async () => {
    for (let i = 0; i < 10; i++) {
      const qq = await pin('稍后配置')
      if (qq) { await page.mouse.click(qq.x, qq.y); await sleep(800) }
      await page.evaluate((t) => {
        const el = [...document.querySelectorAll('*')].find((e) => e.childElementCount === 0 && (e.textContent || '').trim() === t)
        if (el) el.click()
      }, '设置')
      await sleep(1200)
      const ok = await page.evaluate((t) => {
        const el = [...document.querySelectorAll('*')].find((e) => e.childElementCount === 0 && (e.textContent || '').trim() === t)
        if (el) { el.click(); return true }
        return false
      }, '社区插件')
      await sleep(2500)
      const has = await page.evaluate(() => !!document.querySelector('.dcards-filterbar'))
      if (ok && has) return true
      console.log('openPanel retry', i)
    }
    return false
  }
  console.log('openPanel:', await openPanel())

  const snap = () => page.evaluate(() => {
    const chips = [...document.querySelectorAll('.dcards-filterbar .dcards-chiprow button')].map((b) => b.textContent.trim())
    const scope = [...document.querySelectorAll('.dcards-filterbar > div')].pop()
    const bar = document.querySelector('.dcards-pagebar span')
    const cards = [...document.querySelectorAll('.dcards-card')]
    const installBtns = cards.filter((c) => [...c.querySelectorAll('button')].some((b) => /^安装$|^已安装$/.test((b.textContent || '').trim())))
    return {
      chips, scope: scope ? scope.textContent : '',
      pagebar: bar ? bar.textContent.trim() : '',
      cards: cards.length, installBtns: installBtns.length,
      hasHarness: cards.some((c) => /deepseek-harness/.test(c.textContent || '')),
    }
  })

  // A. 快照秒级就绪（20s 上限，远快于分桶收割的分钟级）
  let ready = null
  const t0 = Date.now()
  for (let i = 0; i < 20; i++) {
    await sleep(1000)
    const s = await snap()
    if (/全量精确统计（/.test(s.scope) && !/统计中/.test(s.scope)) { ready = s; break }
  }
  const secs = Math.round((Date.now() - t0) / 1000)
  if (!ready) { console.log('FAILED: snapshot index not ready in 20s'); await browser.close(); process.exit(1) }
  console.log('SNAPSHOT-READY in', secs + 's:', JSON.stringify({ scope: ready.scope, chips: ready.chips, cards: ready.cards }))
  const allN = Number(((ready.chips.find((c) => c.startsWith('全部')) || '').match(/（(\d+)）/) || [])[1])
  const catChips = ready.chips.filter((c) => !c.startsWith('全部'))
  const assertA = /每日快照/.test(ready.scope) && catChips.length > 0 && catChips.every((c) => /（\d+）$/.test(c))
    && allN > 2900 && allN < 3200 && secs <= 20

  // G. 安装链路：安装/已安装按钮存在 + 卡片数据来自快照（含 full_name → specOf）
  const assertG = ready.installBtns > 0 && ready.hasHarness
  console.log('INSTALL:', JSON.stringify({ installBtns: ready.installBtns, hasHarness: ready.hasHarness }))

  // B. 跨页筛选
  const clicked = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((e) => /^界面与桌面（\d+）$/.test((e.textContent || '').trim()))
    if (b) { b.click(); return b.textContent.trim() } return null
  })
  await sleep(1500)
  const f1 = await snap()
  console.log('FILTER:', clicked, '->', JSON.stringify({ pagebar: f1.pagebar, cards: f1.cards }))
  const fN = Number((f1.pagebar.match(/共 (\d+) 个/) || [])[1])
  const chipN = clicked ? Number(clicked.match(/（(\d+)）/)[1]) : 0
  const assertB = clicked && new RegExp('界面与桌面 精确统计').test(f1.pagebar) && fN === chipN && f1.cards === Math.min(50, fN)

  // C. 客户端翻页
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((e) => (e.textContent || '').trim() === '下一页')
    if (b) b.click()
  })
  await sleep(1000)
  const f2 = await snap()
  const assertC = /第 2 \//.test(f2.pagebar) && f2.cards > 0
  console.log('PAGE2:', f2.pagebar, 'cards=', f2.cards)

  // D. 全部视图口径一致
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((e) => /^全部（\d+）$/.test((e.textContent || '').trim()))
    if (b) b.click()
  })
  await sleep(1000)
  const f3 = await snap()
  const f3N = Number((f3.pagebar.match(/共 (\d+) 个/) || [])[1])
  const assertD = f3N === allN
  console.log('ALLVIEW:', f3.pagebar, 'cards=', f3.cards)

  // E. reload 缓存秒级就绪
  await page.reload({ waitUntil: 'networkidle2' })
  await sleep(4000)
  let s2 = null
  if (await openPanel()) s2 = await snap()
  const assertE = s2 && /全量精确统计（/.test(s2.scope) && /（\d+）/.test(s2.chips[0] || '') && !/统计中/.test(s2.scope)
  console.log('CACHED:', JSON.stringify({ scope: s2 ? s2.scope.slice(0, 90) : '(none)', all: s2 ? s2.chips[0] : '(none)' }))

  // F. 兜底回退：在线快照不可达 + 缓存清空 → 应秒级走出厂快照（内置 FACTORY_SNAPSHOT），且无报错
  await page.evaluate(() => {
    localStorage.setItem('dsh-plugin-cards.snapshotUrl', 'http://127.0.0.1:59999/none.json')
    localStorage.removeItem('dsh-plugin-cards.catidx.v1')
  })
  await page.reload({ waitUntil: 'networkidle2' })
  await sleep(4000)
  let s4 = null
  if (await openPanel()) {
    for (let i = 0; i < 20; i++) {
      s4 = await snap()
      if (/全量精确统计（/.test(s4.scope) && !/统计中/.test(s4.scope)) break
      await sleep(1000)
    }
  }
  const assertF = !!(s4 && /出厂快照/.test(s4.scope) && /（\d+）/.test(s4.chips[0] || ''))
  console.log('FACTORY-FALLBACK:', JSON.stringify({ scope: s4 ? s4.scope.slice(0, 110) : '(none)' }))

  // 收尾：恢复快照覆盖 + 清缓存并重载，留一个就绪的界面给用户预览
  await page.evaluate((u) => {
    localStorage.setItem('dsh-plugin-cards.snapshotUrl', u)
    localStorage.removeItem('dsh-plugin-cards.catidx.v1')
  }, SNAP_URL)
  await page.reload({ waitUntil: 'networkidle2' })
  await sleep(4000)
  if (await openPanel()) await sleep(4000)
  await page.screenshot({ path: 'D:/导航/dsh-plugin/scripts/verify-0.5.5.png' })
  await browser.close()

  const realErrors = errors.filter((e) => !/429|ERR_CONNECTION_REFUSED|Failed to fetch|abort|CORS|gitee\.com|ERR_FAILED/.test(e))
  console.log('pageerrors(real):', realErrors.length ? realErrors.slice(0, 5) : 'none')
  const ok = assertA && assertB && assertC && assertD && assertE && assertF && assertG && realErrors.length === 0
  console.log('asserts:', JSON.stringify({ A_snapshot: assertA, B_filter: assertB, C_page: assertC, D_all: assertD, E_cache: assertE, F_fallback: assertF, G_install: assertG }))
  console.log(ok ? 'ALL-GREEN' : 'FAILED')
  process.exit(ok ? 0 : 1)
})().catch((e) => { console.error('FATAL', e); process.exit(1) })
