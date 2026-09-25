#!/usr/bin/env node
/**
 * 0.7.0 端到端验证：严格只显示可安装 + 已安装管理闭环（启停/卸载/更新）。
 * A. 快照秒级就绪（严格口径 全部 N>3000）
 * S. 严格过滤默认开：页面无「不可安装」灰置卡
 * B. 分类跨页筛选  C. 客户端翻页  D. 全部视图口径一致  E. reload 缓存秒级
 * F. 出厂快照兜底
 * G. 安装链路  H. 版本徽章
 * I. 仅可安装开关（默认开 → 点关出现不可安装 → 点开还原）
 * M. 已安装管理区块（dsh-plugin-cards 行 + 启停/更新/卸载按钮）
 */
const puppeteer = require('C:/Users/54622/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core')

const URL = 'http://127.0.0.1:3080/?token=I0fw2oZi3Ql7ktJDCWWoxl5_oPRRLKjfkMDZn-QuR5g'
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
      if (ok && await page.evaluate(() => !!document.querySelector('.dcards-filterbar'))) return true
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
    const installedBlock = [...document.querySelectorAll('div')].find((d) => d.childElementCount > 0 && d.firstChild && d.firstChild.textContent === /^已安装（/.source ? false : /^已安装（\d+）$/.test((d.firstChild && d.firstChild.textContent || '').trim()) && d.textContent.includes('卸载'))
    return {
      chips, scope: scope ? scope.textContent : '',
      pagebar: bar ? bar.textContent.trim() : '', cards: cards.length,
      installBtns: cards.filter((c) => [...c.querySelectorAll('button')].some((b) => /^安装$|^已安装$|^更新$/.test((b.textContent || '').trim()))).length,
      noInstallBtns: cards.filter((c) => [...c.querySelectorAll('span')].some((b) => (b.textContent || '').trim() === '不可安装')).length,
      verBadges: cards.filter((c) => [...c.querySelectorAll('.dcards-badge')].some((b) => /^v\d+\.\d+\.\d+/.test((b.textContent || '').trim()))).length,
      npmCards: cards.filter((c) => [...c.querySelectorAll('a')].some((a) => /npmjs\.com\/package\//.test(a.href || ''))).length,
      // M. 已安装管理区块：标题行 + 三类操作按钮
      installedTitle: (() => {
        const t = [...document.querySelectorAll('div')].find((d) => d.children.length && /^已安装（\d+）$/.test((d.children[0].textContent || '').trim()) && d.textContent.includes('卸载'))
        if (!t) return null
        const btns = [...t.querySelectorAll('button')].map((b) => (b.textContent || '').trim())
        return { title: (t.children[0].textContent || '').trim(), btns: [...new Set(btns)].slice(0, 8) }
      })(),
    }
  })

  // A. 快照秒级就绪
  let ready = null
  const t0 = Date.now()
  for (let i = 0; i < 20; i++) {
    await sleep(1000)
    const s = await snap()
    if (/全量精确统计（/.test(s.scope) && !/统计中/.test(s.scope)) { ready = s; break }
  }
  const secs = Math.round((Date.now() - t0) / 1000)
  if (!ready) { console.log('FAILED: snapshot not ready in 20s'); await browser.close(); process.exit(1) }
  console.log('READY in', secs + 's:', JSON.stringify({ scope: ready.scope.slice(0, 130), all: ready.chips[0], cards: ready.cards, verBadges: ready.verBadges, npmCards: ready.npmCards }))
  const allN = Number(((ready.chips.find((c) => c.startsWith('全部')) || '').match(/（(\d+)）/) || [])[1])
  const catChips = ready.chips.filter((c) => !c.startsWith('全部'))
  const assertA = /全量精确统计（/.test(ready.scope) && catChips.length > 0 && catChips.every((c) => /（\d+）$/.test(c)) && allN > 3000 && secs <= 20

  // S. 严格过滤默认开：无「不可安装」灰置卡
  const assertS = ready.noInstallBtns === 0
  console.log('STRICT:', JSON.stringify({ noInstallCards: ready.noInstallBtns, allN }))

  // G/H/N
  const assertG = ready.installBtns > 0
  const assertH = ready.verBadges > 0
  const assertNpm = ready.npmCards > 0
  console.log('BTN:', JSON.stringify({ installBtns: ready.installBtns, noInstallBtns: ready.noInstallBtns, verBadges: ready.verBadges, npmCards: ready.npmCards }))

  // M. 已安装管理区块
  const mgmt = ready.installedTitle
  const assertM = !!mgmt && /已安装（\d+）/.test(mgmt.title)
    && ['停用', '更新', '卸载'].every((x) => mgmt.btns.includes(x))
  console.log('MGMT:', JSON.stringify(mgmt))

  // B. 跨页筛选
  const clicked = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((e) => /^（?[^全（]{2,10}（\d+）$/.test((e.textContent || '').trim()) && !/^全部/.test(e.textContent.trim()))
    if (b) { b.click(); return b.textContent.trim() } return null
  })
  await sleep(1500)
  const f1 = await snap()
  console.log('FILTER:', clicked, '->', JSON.stringify({ pagebar: f1.pagebar, cards: f1.cards }))
  const fN = Number((f1.pagebar.match(/共 (\d+) 个/) || [])[1])
  const chipN = clicked ? Number(clicked.match(/（(\d+)）/)[1]) : 0
  const assertB = clicked && /精确统计/.test(f1.pagebar) && fN === chipN && f1.cards === Math.min(50, fN)

  // C. 客户端翻页
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((e) => (e.textContent || '').trim() === '下一页')
    if (b) b.click()
  })
  await sleep(1000)
  const f2 = await snap()
  const assertC = /第 2 \//.test(f2.pagebar) && f2.cards > 0
  console.log('PAGE2:', f2.pagebar, 'cards=', f2.cards)

  // I. 仅可安装开关（0.7.0 默认开：点「开」→ 关闭过滤出现不可安装；再点「关」→ 还原严格）
  const beforeI = fN
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((e) => /^仅可安装：开$/.test((e.textContent || '').trim()))
    if (b) b.click() // 当前「开」→ 点击后关闭过滤（显示全部）
  })
  await sleep(1200)
  const i1 = await snap()
  const iN = Number((i1.pagebar.match(/共 (\d+) 个/) || [])[1])
  const iNoInstall = i1.noInstallBtns
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((e) => /^仅可安装：关$/.test((e.textContent || '').trim()))
    if (b) b.click() // 还原严格过滤
  })
  await sleep(1200)
  const i2 = await snap()
  const i2N = Number((i2.pagebar.match(/共 (\d+) 个/) || [])[1])
  const assertI = iN > beforeI && iNoInstall > 0 && i2N === beforeI && i2.noInstallBtns === 0
  console.log('ONLY-INSTALL:', JSON.stringify({ strict: beforeI, all: iN, noInstallCards: iNoInstall, restored: i2N }))

  // D. 回「全部」口径一致
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((e) => /^全部（\d+）$/.test((e.textContent || '').trim()))
    if (b) b.click()
  })
  await sleep(1000)
  const f3 = await snap()
  const f3N = Number((f3.pagebar.match(/共 (\d+) 个/) || [])[1])
  const assertD = f3N === allN
  console.log('ALLVIEW:', f3.pagebar, 'cards=', f3.cards)

  // E. reload 缓存秒级
  await page.reload({ waitUntil: 'networkidle2' })
  await sleep(4000)
  let s2 = null
  if (await openPanel()) s2 = await snap()
  const assertE = s2 && /全量精确统计（/.test(s2.scope) && /（\d+）/.test(s2.chips[0] || '') && !/统计中/.test(s2.scope)
  console.log('CACHED:', JSON.stringify({ all: s2 ? s2.chips[0] : '(none)' }))

  // F. 出厂快照兜底
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

  // 收尾：恢复快照覆盖，留就绪界面
  await page.evaluate((u) => {
    localStorage.setItem('dsh-plugin-cards.snapshotUrl', u)
    localStorage.removeItem('dsh-plugin-cards.catidx.v1')
  }, SNAP_URL)
  await page.reload({ waitUntil: 'networkidle2' })
  await sleep(4000)
  if (await openPanel()) await sleep(4000)
  await page.screenshot({ path: 'D:/导航/dsh-plugin/scripts/verify-0.7.0.png' })
  await browser.close()

  const realErrors = errors.filter((e) => !/429|ERR_CONNECTION_REFUSED|Failed to fetch|abort|CORS|gitee\.com|ERR_FAILED|ERR_UNSAFE_PORT/.test(e))
  console.log('pageerrors(real):', realErrors.length ? realErrors.slice(0, 5) : 'none')
  const ok = assertA && assertB && assertC && assertD && assertE && assertF && assertG && assertH && assertI && assertNpm && assertS && assertM && realErrors.length === 0
  console.log('asserts:', JSON.stringify({ A_snapshot: assertA, S_strict: assertS, B_filter: assertB, C_page: assertC, D_all: assertD, E_cache: assertE, F_factory: assertF, G_install: assertG, H_version: assertH, I_onlyinst: assertI, M_mgmt: assertM, Npm_npm: assertNpm }))
  console.log(ok ? 'ALL-GREEN' : 'FAILED')
  process.exit(ok ? 0 : 1)
})().catch((e) => { console.error('FATAL', e); process.exit(1) })
