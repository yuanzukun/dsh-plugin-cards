/* 0.3.0 验证：质量过滤计数 + 中文分类 chips + 话题 chips + 加载更多 */
const puppeteer = require('C:/Users/54622/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core')
const URL = 'http://127.0.0.1:3080/?token=5hHGTbTpqmfonDVkkr9DVpTaBHREULqzRrGU0bbvgmA'
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'

async function main() {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] })
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 })
  await new Promise((r) => setTimeout(r, 5000))

  const clickTitle = async (t) => page.evaluate((t) => {
    const el = document.querySelector(`[title="${t}"]`) ||
      [...document.querySelectorAll('[title],[aria-label]')].find((e) => (e.getAttribute('title') || e.getAttribute('aria-label')) === t)
    if (el) { el.click(); return true } return false
  }, t)

  const results = {}
  results.clickedSettings = await clickTitle('设置')
  await new Promise((r) => setTimeout(r, 2000))
  results.clickedCommunity = await page.evaluate(() => {
    const el = [...document.querySelectorAll('*')].find((e) => e.childElementCount === 0 && /社区插件/.test(e.textContent || ''))
    if (el) { el.click(); return true } return false
  })
  await new Promise((r) => setTimeout(r, 6000)) // 等 GitHub API

  const text = await page.evaluate(() => document.body.innerText)
  results.qualityCount = /匹配 \d+ 个，已加载 \d+ 个/.test(text) ? text.match(/匹配 (\d+) 个，已加载 (\d+) 个/).slice(1).join('/') : null
  results.catChips = ['AI 与 Agent', '框架与核心', '客户端与界面', '工具与效率'].filter((c) => text.includes(c))
  results.topicChipsRow = text.includes('话题：')
  results.qualityToggle = text.includes('质量过滤：开')
  results.friendlySource = text.includes('数据源：https://github.com/topics/dsh-plugin')
  results.hasEntries = text.includes('安装')
  results.loadMore = text.includes('加载更多')

  // 点一个分类 chip 验证过滤
  results.catFilterClick = await page.evaluate(() => {
    const el = [...document.querySelectorAll('button')].find((e) => /^AI 与 Agent（\d+）$/.test((e.textContent || '').trim()))
    if (el) { el.click(); return true } return false
  })
  await new Promise((r) => setTimeout(r, 800))
  const text2 = await page.evaluate(() => document.body.innerText)
  results.filteredStillShowsInstall = text2.includes('安装')

  await page.screenshot({ path: 'D:/导航/dsh-plugin/scripts/verify-0.3.0.png' })
  console.log(JSON.stringify(results, null, 2))
  console.log('pageErrors:', errors.slice(0, 3))
  await browser.close()
}
main().catch((e) => { console.error('FATAL', e); process.exit(1) })
