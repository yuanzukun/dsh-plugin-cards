/* 0.4.3 验证：话题按中文归并去重 + 双向联动计数 + 「全部」显示全源总数 + 口径注释 */
const puppeteer = require('C:/Users/54622/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core')
const URL = 'http://127.0.0.1:3080/?token=X9t0Ip_Avan-pl06SrZpKXvFasJUcVUwN3f69gvBBkc'
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

  // ① 话题 chips：应无重复中文 label，且全部带（N）计数，title 为英文原文组
  results.topicChips = await page.evaluate(() =>
    [...document.querySelectorAll('.dcards-chiprow.scroll button')].map((b) => ({
      text: (b.textContent || '').trim(), title: b.title,
    })))
  results.topicDedupOk = (() => {
    const labels = results.topicChips.map((c) => c.text.replace(/（\d+）$/, ''))
    return new Set(labels).size === labels.length
  })()
  results.topicAllCounted = results.topicChips.every((c) => /（\d+）$/.test(c.text))

  // ② 「全部」chip 应显示全源总数（> 当前页 50）
  results.allChip = await page.evaluate(() => {
    const b = [...document.querySelectorAll('.dcards-chiprow button')].find((e) => /^全部（\d+）$/.test((e.textContent || '').trim()))
    return b ? b.textContent.trim() : null
  })

  // ③ 口径注释存在
  results.scopeNote = await page.evaluate(() => {
    const el = [...document.querySelectorAll('div')].find((e) => e.childElementCount === 0 && /计数口径/.test(e.textContent || ''))
    return el ? el.textContent.trim() : null
  })

  const clickChip = async (pattern) => page.evaluate((p) => {
    const re = new RegExp(p)
    const b = [...document.querySelectorAll('button')].find((e) => re.test((e.textContent || '').trim()))
    if (b) { b.click(); return true } return false
  }, pattern)

  // ④ 联动：选「智能体」话题后，分类计数应按话题过滤结果重算（多数分类计数下降，卡片数=话题组计数）
  results.clickTopic = await clickChip(String.raw`^智能体（\d+）$`)
  await new Promise((r) => setTimeout(r, 600))
  results.afterTopic = await page.evaluate(() => ({
    cardCount: document.querySelectorAll('.dcards-card').length,
    activeTopic: [...document.querySelectorAll('.dcards-chiprow.scroll button')].find((b) => b.style.background === 'rgb(47, 111, 237)')?.textContent.trim() || null,
    catChips: [...document.querySelectorAll('.dcards-chiprow:not(.scroll) button')].map((b) => (b.textContent || '').trim()),
  }))

  // ⑤ 反向联动：在话题选中下点分类，卡片数应变；清空话题后恢复
  results.clickCatInTopic = await clickChip(String.raw`^框架与核心（\d+）$`)
  await new Promise((r) => setTimeout(r, 600))
  results.afterTopicCat = await page.evaluate(() => ({ cardCount: document.querySelectorAll('.dcards-card').length }))
  await clickChip(String.raw`^全部（\d+）$`)
  await new Promise((r) => setTimeout(r, 600))

  await page.screenshot({ path: 'D:/导航/dsh-plugin/scripts/verify-0.4.3.png' })
  console.log(JSON.stringify(results, null, 2))
  console.log('pageErrors:', errors.slice(0, 3))
  await browser.close()
}
main().catch((e) => { console.error('FATAL', e); process.exit(1) })
