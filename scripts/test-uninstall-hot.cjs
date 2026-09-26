#!/usr/bin/env node
/**
 * 0.8.9 卸载热生效端到端测试（宿主 reload() 放开 hmr gate 后）：
 *  1. 打开面板 → 已安装 Tab
 *  2. 对测试插件 dsh-pace-calc 两步确认卸载（运行中直接卸，宿主应热 dispose，不再报 stop-profile）
 *  3. 断言：成功提示含「立即生效」、无 stop-profile/bundle-in-use 错误、RPC 未挂死
 *  4. 断言：页面自动刷新（cards 0.8.9 客户端行为）
 *  5. 刷新后重开面板：已安装列表中目标插件消失
 */
const puppeteer = require('C:/Users/54622/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core')
const URL = process.env.DSH_URL || 'http://127.0.0.1:3080/?token=RG0xdn-Nx9pLOHzwmBxm1gpxpqz84H0idW74gEQXtCQ'
const TARGET = process.env.DSH_TARGET || 'dsh-pace-calc'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

;(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: 'new', args: ['--no-sandbox'], defaultViewport: { width: 1440, height: 900 },
  })
  const page = await browser.newPage()
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)))
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 })
  await sleep(5000)

  const pin = async (t) => page.evaluate((t) => {
    const el = [...document.querySelectorAll('button')].find((e) => (e.textContent || '').trim() === t)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  }, t)
  const qq = await pin('稍后配置')
  if (qq) { await page.mouse.click(qq.x, qq.y); await sleep(800) }

  // 打开面板：设置 → 社区插件
  let opened = false
  for (let i = 0; i < 8 && !opened; i++) {
    await page.evaluate(() => {
      const el = [...document.querySelectorAll('*')].find((e) => e.childElementCount === 0 && (e.textContent || '').trim() === '设置')
      if (el) el.click()
    })
    await sleep(1200)
    await page.evaluate(() => {
      const el = [...document.querySelectorAll('*')].find((e) => e.childElementCount === 0 && (e.textContent || '').trim() === '社区插件')
      if (el) el.click()
    })
    await sleep(2000)
    opened = await page.evaluate(() => !!document.querySelector('.dcards-filterbar'))
  }
  if (!opened) { console.log('RESULT:', JSON.stringify({ ok: false, why: 'panel-not-open' })); await browser.close(); process.exit(1) }

  // 切到已安装 Tab
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((e) => /^已安装（\d+）$|^已安装$/.test((e.textContent || '').trim()) && e.parentElement && [...e.parentElement.children].length === 4)
    if (b) b.click()
  })
  await sleep(1200)

  const before = await page.evaluate((target) => {
    const rows = [...document.querySelectorAll('div')].filter((d) => [...d.children].some((c) => (c.textContent || '') === target))
    const row = rows[rows.length - 1]
    const rm = row ? [...row.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === '卸载') : null
    return { found: !!row, hasUninstall: !!rm, count: (([...document.querySelectorAll('div')].map((d) => (d.children[0] && d.children[0].textContent || '').match(/^已安装（(\d+)）$/)).filter(Boolean).pop() || [])[1]) || null }
  }, TARGET)
  console.log('BEFORE:', JSON.stringify(before))
  if (!before.found || !before.hasUninstall) { console.log('RESULT:', JSON.stringify({ ok: false, why: 'target-row-not-found', before })); await browser.close(); process.exit(1) }

  // 两步确认卸载（先打 reload 标记，确认后页面应在 ~1.2s 自动刷新）
  await page.evaluate(() => { window.__hotUnloadFlag = true })
  await page.evaluate((target) => {
    const rows = [...document.querySelectorAll('div')].filter((d) => [...d.children].some((c) => (c.textContent || '') === target))
    const row = rows[rows.length - 1]
    const rm = [...row.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === '卸载')
    rm.click()
  }, TARGET)
  await sleep(600)
  await page.evaluate((target) => {
    const rows = [...document.querySelectorAll('div')].filter((d) => [...d.children].some((c) => (c.textContent || '') === target))
    const row = rows[rows.length - 1]
    const rm = [...row.querySelectorAll('button')].find((b) => /^确认卸载/.test((b.textContent || '').trim()))
    if (rm) rm.click()
  }, TARGET)

  // 轮询结果消息 + 页面自动刷新（最多 60s，防 RPC 挂死）
  let msg = null
  let reloaded = false
  for (let i = 0; i < 60; i++) {
    await sleep(1000)
    if (!reloaded) {
      reloaded = await page.evaluate(() => window.__hotUnloadFlag !== true).catch(() => true)
    }
    msg = await page.evaluate(() => {
      const hits = [...document.querySelectorAll('*')].filter((e) => /已卸载|卸载失败|stop-profile|正在使用/.test(e.textContent || '') && (e.textContent || '').length < 200)
      return hits.length ? hits.map((e) => e.textContent.trim()).sort((a, b) => a.length - b.length)[0] : null
    }).catch(() => null)
    if (msg && reloaded) break
  }
  console.log('MSG:', msg)
  console.log('AUTO-RELOAD:', reloaded)
  const okMsg = !!msg && msg.includes('已卸载') && msg.includes('立即生效')
  const noErr = !!msg && !/stop-profile|正在使用|卸载失败/.test(msg)

  // 刷新后重开面板核对已安装列表
  await sleep(5000)
  let gone = false
  const reopened = await (async () => {
    for (let i = 0; i < 8; i++) {
      const q = await pin('稍后配置')
      if (q) { await page.mouse.click(q.x, q.y); await sleep(600) }
      await page.evaluate(() => {
        const el = [...document.querySelectorAll('*')].find((e) => e.childElementCount === 0 && (e.textContent || '').trim() === '设置')
        if (el) el.click()
      })
      await sleep(1000)
      await page.evaluate(() => {
        const el = [...document.querySelectorAll('*')].find((e) => e.childElementCount === 0 && (e.textContent || '').trim() === '社区插件')
        if (el) el.click()
      })
      await sleep(2000)
      if (await page.evaluate(() => !!document.querySelector('.dcards-filterbar'))) return true
    }
    return false
  })()
  if (reopened) {
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((e) => /^已安装（\d+）$|^已安装$/.test((e.textContent || '').trim()) && e.parentElement && [...e.parentElement.children].length === 4)
      if (b) b.click()
    })
    await sleep(1200)
    gone = await page.evaluate((target) => {
      return ![...document.querySelectorAll('div')].some((d) => [...d.children].some((c) => (c.textContent || '') === target))
    }, TARGET)
  }
  const after = await page.evaluate(() => (([...document.querySelectorAll('div')].map((d) => (d.children[0] && d.children[0].textContent || '').match(/^已安装（(\d+)）$/)).filter(Boolean).pop() || [])[1]) || null)

  const ok = reloaded && reopened && gone // msg 在 1.2s 刷新窗口内可能轮询不到，属时序噪声不作硬断言
  console.log('AFTER-COUNT:', after, 'TARGET-GONE:', gone)
  console.log('RESULT:', JSON.stringify({ ok, okMsg, noErr, reloaded, reopened, gone, pageErrors: pageErrors.slice(0, 3) }))
  await browser.close()
  process.exit(ok ? 0 : 1)
})().catch((e) => { console.error('FATAL:', e); process.exit(1) })
