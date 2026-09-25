#!/usr/bin/env node
/**
 * 0.8.0 端到端验证：Tab 导航（插件市场/已安装/自定义安装/设置）+ 安装确认弹窗。
 * T1. 四 Tab 存在，默认市场页（filterbar+grid 可见）
 * T2. 已安装 Tab：管理行渲染（停用/更新/卸载），badge 数字 ≥1
 * T3. 自定义安装 Tab：输入框 + 「安装…」按钮（空输入禁用）
 * T4. 设置 Tab：三枚开关（质量过滤/仅可安装/排序）+ 数据源说明
 * T5. 市场安装弹确认层：安全提示 + 来源 + CLI 命令 + 复制安装命令/直接安装；✕ 关闭后宿主清单不变
 * T6. 自定义安装弹同一确认层（npm 来源链接）
 * R. 回归：快照就绪 + 严格口径无灰置卡
 */
const puppeteer = require('C:/Users/54622/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core')
const fs = require('fs')

const URL = 'http://127.0.0.1:3080/?token=I0fw2oZi3Ql7ktJDCWWoxl5_oPRRLKjfkMDZn-QuR5g'
const SNAP_URL = 'http://127.0.0.1:8941/cards-snapshot.json'
const HOST_PKG = 'D:/ruan/dsh-home-npm/profiles/web/package.json'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const hostPkgHas = (n) => fs.readFileSync(HOST_PKG, 'utf8').includes(n)

;(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: 'new', args: ['--no-sandbox'], defaultViewport: { width: 1440, height: 900 },
  })
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (e) => { const s = String(e); if (!/remote\.llm/.test(s)) errors.push(s.slice(0, 300)) })

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
      await page.evaluate(() => {
        const el = [...document.querySelectorAll('*')].find((e) => e.childElementCount === 0 && (e.textContent || '').trim() === '设置')
        if (el) el.click()
      })
      await sleep(1200)
      const ok = await page.evaluate(() => {
        const el = [...document.querySelectorAll('*')].find((e) => e.childElementCount === 0 && (e.textContent || '').trim() === '社区插件')
        if (el) { el.click(); return true }
        return false
      })
      await sleep(2500)
      if (ok && await page.evaluate(() => !!document.querySelector('.dcards-filterbar'))) return true
    }
    return false
  }
  console.log('openPanel:', await openPanel())

  // Tab 工具：以「自定义安装」按钮定位 Tab 容器（避免与宿主导航重名）
  const clickTab = (name) => page.evaluate((name) => {
    const b = [...document.querySelectorAll('button')].find((e) => (e.textContent || '').trim() === name && e.parentElement && [...e.parentElement.children].length === 4)
    if (!b) return false
    b.click(); return true
  }, name)
  const tabState = () => page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((e) => (e.textContent || '').trim() === '自定义安装')
    if (!b || !b.parentElement) return null
    return [...b.parentElement.children].map((c) => ({
      text: (c.textContent || '').trim(),
      active: (c.style || {}).borderBottomColor === 'rgb(47, 111, 237)',
    }))
  })
  const marketVisible = () => page.evaluate(() => ({
    filterbar: !!document.querySelector('.dcards-filterbar'),
    grid: !!document.querySelector('.dcards-grid'),
    cards: document.querySelectorAll('.dcards-card').length,
    noInstall: [...document.querySelectorAll('.dcards-card span')].some((s) => (s.textContent || '').trim() === '不可安装'),
  }))

  // R. 快照就绪（严格口径）
  let ready = null
  const t0 = Date.now()
  for (let i = 0; i < 20; i++) {
    await sleep(1000)
    const m = await marketVisible()
    const scopeReady = await page.evaluate(() => {
      const el = document.querySelector('.dcards-filterbar')
      return el ? /全量精确统计（/.test(el.textContent) && !/统计中/.test(el.textContent) : false
    })
    if (scopeReady && m.cards > 0) { ready = m; break }
  }
  const secs = Math.round((Date.now() - t0) / 1000)
  if (!ready) { console.log('FAILED: snapshot not ready in 20s'); await browser.close(); process.exit(1) }
  const assertR = ready.cards > 0 && !ready.noInstall && secs <= 20
  console.log('READY', secs + 's:', JSON.stringify(ready))

  // T1. 四 Tab + 默认市场
  const tabs1 = await tabState()
  const assertT1 = !!tabs1 && tabs1.length === 4
    && tabs1[0].text === '插件市场' && tabs1[0].active
    && /^已安装（\d+）$/.test(tabs1[1].text) && !tabs1[0].active === false
    && tabs1[2].text === '自定义安装' && tabs1[3].text === '设置'
  console.log('TABS:', JSON.stringify(tabs1))

  // T2. 已安装 Tab
  await clickTab('已安装' + (tabs1[1].text.match(/（\d+）/) || [''])[0].replace(/（\d+）/, '') + (tabs1[1].text.match(/（\d+）/) || [''])[0])
  // 直接用包含「已安装」前缀的按钮（badge 数字动态）
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((e) => /^已安装（\d+）$|^已安装$/.test((e.textContent || '').trim()) && e.parentElement && [...e.parentElement.children].length === 4)
    if (b) b.click()
  })
  await sleep(1500)
  const inst = await page.evaluate(() => {
    const blk = [...document.querySelectorAll('div')].find((d) => d.children.length && /^已安装（\d+）$/.test((d.children[0].textContent || '').trim()))
    if (!blk) return { block: null }
    return {
      block: (blk.children[0].textContent || '').trim(),
      btns: [...new Set([...blk.querySelectorAll('button')].map((b) => (b.textContent || '').trim()))].slice(0, 8),
      hasCardsRow: (blk.textContent || '').includes('dsh-plugin-cards'),
    }
  })
  const assertT2 = !!inst.block && inst.hasCardsRow && ['停用', '更新', '卸载'].every((x) => inst.btns.includes(x))
  console.log('INSTALLED-TAB:', JSON.stringify(inst))

  // T3. 自定义安装 Tab
  await clickTab('自定义安装')
  await sleep(800)
  const cust = await page.evaluate(() => {
    const inp = [...document.querySelectorAll('input')].find((e) => (e.placeholder || '').includes('npm 包名'))
    const go = [...document.querySelectorAll('button')].find((e) => (e.textContent || '').trim() === '安装…')
    return { input: !!inp, go: !!go, goDisabled: go ? go.disabled : null }
  })
  const assertT3 = cust.input && cust.go && cust.goDisabled === true
  console.log('CUSTOM-TAB:', JSON.stringify(cust))

  // T4. 设置 Tab
  await clickTab('设置')
  await sleep(800)
  const setq = await page.evaluate(() => {
    const t = ['质量过滤：开', '仅可安装：开', '排序：★ 最多'].map((n) => !![...document.querySelectorAll('button')].find((e) => (e.textContent || '').trim() === n))
    const src = document.body.textContent.includes('数据源：GitHub topic:dsh-plugin')
    return { toggles: t, src }
  })
  const assertT4 = setq.toggles.every(Boolean) && setq.src
  console.log('SETTINGS-TAB:', JSON.stringify(setq))

  // T5. 市场安装 → 确认弹窗 → ✕ 关闭（宿主不变）
  const pkgBefore = hostPkgHas('model-proxy') // 任意基线
  await clickTab('插件市场')
  await sleep(1500)
  const modal1 = await page.evaluate(() => {
    const card = [...document.querySelectorAll('.dcards-card')].find((c) => [...c.querySelectorAll('button')].some((b) => /^安装$/.test((b.textContent || '').trim())))
    if (!card) return 'no-installable-card'
    const btn = [...card.querySelectorAll('button')].find((b) => /^安装$/.test((b.textContent || '').trim()))
    btn.click()
    return 'clicked'
  })
  await sleep(800)
  const m1 = await page.evaluate(() => {
    const ttl = [...document.querySelectorAll('div')].find((d) => d.children.length === 0 && (d.textContent || '').trim() === '确认安装')
    if (!ttl) return { modal: false }
    const body = document.body.textContent || ''
    return {
      modal: true,
      warn: body.includes('安装前请前往插件仓库仔细阅读源码，确认可信后再安装'),
      cli: body.includes('dsh plugin add '),
      copyBtn: !![...document.querySelectorAll('button')].find((e) => (e.textContent || '').trim() === '复制安装命令'),
      goBtn: !![...document.querySelectorAll('button')].find((e) => (e.textContent || '').trim() === '直接安装'),
      srcLink: !![...document.querySelectorAll('div[style*="position: fixed"] a, div[style*="position:fixed"] a')].length,
    }
  })
  const assertT5a = m1.modal && m1.warn && m1.cli && m1.copyBtn && m1.goBtn && m1.srcLink
  console.log('MODAL:', JSON.stringify(m1))
  // ✕ 关闭
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((e) => (e.textContent || '').trim() === '✕')
    if (b) b.click()
  })
  await sleep(600)
  const modalGone = await page.evaluate(() => !document.body.textContent.includes('安装前请前往插件仓库仔细阅读源码'))
  const hostUnchanged = hostPkgHas('model-proxy') === pkgBefore
  const assertT5b = modalGone && hostUnchanged
  console.log('MODAL-CLOSE:', JSON.stringify({ modalGone, hostUnchanged }))

  // T6. 自定义安装弹同一确认层
  await clickTab('自定义安装')
  await sleep(600)
  await page.evaluate(() => {
    const inp = [...document.querySelectorAll('input')].find((e) => (e.placeholder || '').includes('npm 包名'))
    if (!inp) return
    inp.focus()
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(inp, 'dsh-palimpsest')
    inp.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await sleep(400)
  await page.evaluate(() => {
    const go = [...document.querySelectorAll('button')].find((e) => (e.textContent || '').trim() === '安装…')
    if (go) go.click()
  })
  await sleep(800)
  const m2 = await page.evaluate(() => {
    const fixed = [...document.querySelectorAll('div')].find((d) => (d.style || {}).position === 'fixed' && (d.textContent || '').includes('确认安装'))
    if (!fixed) return { modal: false }
    return {
      modal: true,
      npmLink: !!fixed.querySelector('a[href*="npmjs.com/package/dsh-palimpsest"]'),
      cli: (fixed.textContent || '').includes('dsh plugin add dsh-palimpsest'),
      gitHint: false,
    }
  })
  const assertT6 = m2.modal && m2.npmLink && m2.cli
  console.log('CUSTOM-MODAL:', JSON.stringify(m2))
  // 关闭弹窗收尾
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((e) => (e.textContent || '').trim() === '✕')
    if (b) b.click()
  })
  await sleep(400)
  await page.screenshot({ path: 'D:/导航/dsh-plugin/scripts/verify-0.8.0.png' })
  await browser.close()

  const realErrors = errors.filter((e) => !/429|ERR_CONNECTION_REFUSED|Failed to fetch|abort|CORS|gitee\.com|ERR_FAILED|ERR_UNSAFE_PORT/.test(e))
  console.log('pageerrors(real):', realErrors.length ? realErrors.slice(0, 5) : 'none')
  const ok = assertR && assertT1 && assertT2 && assertT3 && assertT4 && assertT5a && assertT5b && assertT6 && realErrors.length === 0
  console.log('asserts:', JSON.stringify({ R_ready: assertR, T1_tabs: assertT1, T2_installed: assertT2, T3_custom: assertT3, T4_settings: assertT4, T5_modal: assertT5a && assertT5b, T6_customModal: assertT6 }))
  console.log(ok ? 'ALL-GREEN' : 'FAILED')
  process.exit(ok ? 0 : 1)
})().catch((e) => { console.error('FATAL', e); process.exit(1) })
