#!/usr/bin/env node
/**
 * 0.8.0 端到端验证：Tab 导航（插件市场/已安装/自定义安装/设置）+ 安装确认弹窗。
 * T1. 四 Tab 存在，默认市场页（filterbar+grid 可见）
 * T2. 已安装 Tab：管理行渲染（停用/更新/卸载），badge 数字 ≥1
 * T3. 自定义安装 Tab：输入框 + 「安装…」按钮（空输入禁用）
 * T4. 设置 Tab：两枚开关（质量过滤/仅可安装）+ 数据源说明；排序 chip 已移回市场（0.8.1，设置页无「排序：」）
 * T4b. 市场工具行：搜索框 + 排序按钮 + 星数 chip（三档循环，≥3★ 时目录总数下降）+ 刷新目录（0.8.2）
 * T4c. 新分类 chip：模型与多模态 / 数据与安全（0.8.3）
 * T7. 实时版本校验：已装 whale-widget 市场卡片「有更新」且 tooltip 含「npm 实时」（0.8.3）
 * T5. 市场安装弹确认层：安全提示 + 来源 + CLI 命令 + 复制安装命令/直接安装；✕ 关闭后宿主清单不变
 * T6. 自定义安装弹同一确认层（npm 来源链接）
 * R. 回归：快照就绪 + 严格口径无灰置卡
 */
const puppeteer = require('C:/Users/54622/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core')
const fs = require('fs')

const URL = 'http://127.0.0.1:3080/?token=bvd3m4iT6DNhdIIff4wOt8UW_O7bAD_FaR5ndEoN7ro'
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

  // T4. 设置 Tab（0.8.1：排序 chip 已移回市场，设置页应无「排序：」）
  await clickTab('设置')
  await sleep(800)
  const setq = await page.evaluate(() => {
    const btn = (n) => !![...document.querySelectorAll('button')].find((e) => (e.textContent || '').trim() === n)
    const t = ['质量过滤：开', '仅可安装：开'].map(btn)
    const sortInSettings = btn('排序：★ 最多') || btn('排序：最近更新')
    const src = document.body.textContent.includes('目录来源：官方社区仓库 github.com/topics/dsh-plugin')
    return { toggles: t, sortInSettings, src }
  })
  const assertT4 = setq.toggles.every(Boolean) && !setq.sortInSettings && setq.src
  console.log('SETTINGS-TAB:', JSON.stringify(setq))

  // T4b. 市场工具行（0.8.1：排序 chip 在市场 head；0.8.2：星数 chip 三档循环）
  await clickTab('插件市场')
  await sleep(1500)
  const countBefore = await page.evaluate(() => {
    const inp = [...document.querySelectorAll('input')].find((i) => (i.placeholder || '').includes('条中搜索'))
    const m = /在全部 (\d+) 条中搜索/.exec((inp || {}).placeholder || '')
    return m ? Number(m[1]) : null
  })
  const toolbar = await page.evaluate(() => {
    const sort = [...document.querySelectorAll('button')].find((e) => /^排序：(★ 最多|最近更新)$/.test((e.textContent || '').trim()))
    const refresh = [...document.querySelectorAll('button')].find((e) => (e.textContent || '').trim() === '刷新目录')
    const star = [...document.querySelectorAll('button')].find((e) => /^星数：/.test((e.textContent || '').trim()))
    const search = [...document.querySelectorAll('input')].find((i) => (i.placeholder || '').includes('条中搜索'))
    const sortSameRow = sort && refresh && sort.parentElement === refresh.parentElement && star && star.parentElement === refresh.parentElement
    return { sort: sort ? sort.textContent.trim() : null, star: star ? star.textContent.trim() : null, refresh: !!refresh, search: !!search, sortSameRow }
  })
  // 点星数 chip → ≥3★ → 目录总数应减少（快照含大量 0 星长尾）
  await page.evaluate(() => {
    const star = [...document.querySelectorAll('button')].find((e) => (e.textContent || '').trim() === '星数：全部')
    if (star) star.click()
  })
  await sleep(1200)
  const starFiltered = await page.evaluate(() => {
    const star = [...document.querySelectorAll('button')].find((e) => /^星数：/.test((e.textContent || '').trim()))
    const inp = [...document.querySelectorAll('input')].find((i) => (i.placeholder || '').includes('条中搜索'))
    const m = /在全部 (\d+) 条中搜索/.exec((inp || {}).placeholder || '')
    return { label: star ? star.textContent.trim() : null, total: m ? Number(m[1]) : null }
  })
  const assertT4b = toolbar.sort && toolbar.refresh && toolbar.search && toolbar.sortSameRow
    && toolbar.star === '星数：全部' && starFiltered.label === '星数：≥3★'
    && countBefore !== null && starFiltered.total !== null && starFiltered.total < countBefore
  console.log('MARKET-TOOLBAR:', JSON.stringify({ toolbar, countBefore, starFiltered }))
  // 复位星数 chip（避免影响 T5 安装弹窗断言）
  await page.evaluate(() => {
    const star = [...document.querySelectorAll('button')].find((e) => (e.textContent || '').trim() === '星数：≥3★')
    if (star) star.click()
  })
  await sleep(800)

  // T4c. 0.8.3 新分类 chip（模型与多模态 / 数据与安全）出现在分类行
  const newCats = await page.evaluate(() => {
    const txt = [...document.querySelectorAll('button')].map((e) => (e.textContent || '').trim())
    return { model: txt.some((t) => t.startsWith('模型与多模态')), data: txt.some((t) => t.startsWith('数据与安全')) }
  })
  const assertT4c = newCats.model && newCats.data
  console.log('NEW-CATEGORY-CHIPS:', JSON.stringify(newCats))

  // T7. 0.8.3 实时版本校验：已装 whale-widget(0.3.11) 的市场卡片应显示「有更新」，tooltip 含「npm 实时」
  const rt = await page.evaluate(() => {
    const card = [...document.querySelectorAll('.dcards-card')].find((c) => ((c.querySelector('.dcards-name') || {}).textContent || '').toLowerCase().includes('whale-widget'))
    if (!card) return { card: false }
    const btn = [...card.querySelectorAll('button, span')].find((x) => ['有更新', '已安装'].includes((x.textContent || '').trim()))
    return { card: true, action: btn ? btn.textContent.trim() : null, title: btn ? btn.title || '' : '', realtime: (btn && btn.title || '').includes('npm 实时') }
  })
  const assertT7 = rt.card && rt.action === '有更新' && rt.realtime
  console.log('REALTIME-VER:', JSON.stringify(rt))

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
  const ok = assertR && assertT1 && assertT2 && assertT3 && assertT4 && assertT4b && assertT4c && assertT5a && assertT5b && assertT6 && assertT7 && realErrors.length === 0
  console.log('asserts:', JSON.stringify({ R_ready: assertR, T1_tabs: assertT1, T2_installed: assertT2, T3_custom: assertT3, T4_settings: assertT4, T4b_toolbar: assertT4b, T4c_newCats: assertT4c, T5_modal: assertT5a && assertT5b, T6_customModal: assertT6, T7_realtime: assertT7 }))
  console.log(ok ? 'ALL-GREEN' : 'FAILED')
  process.exit(ok ? 0 : 1)
})().catch((e) => { console.error('FATAL', e); process.exit(1) })
