/** ---- 分类与样式辅助（2026-10-11 从 createCommunitySection 外提）----
 * 全部为无状态纯函数/常量，不依赖组件渲染期变量；提升到闭包作用域后
 * 各组件共享单一实现（原先在组件体内，每次渲染重建闭包）。
 * 依赖：classifyItem（30-market-pure，函数声明提升，跨块可见）。 */

// 0.5.1：仅保留「分类」单行（0.4.4~0.4.5 的推荐行/话题行按用户决策移除）
function matchCat(item, cat) {
  if (!cat) return true
  return classifyItem(item) === cat
}

var CHIP_STYLE_BASE = { padding: '2px 10px', borderRadius: '12px', fontSize: '12px', cursor: 'pointer', border: '1px solid var(--dsw-alias-border-l1)', background: 'var(--dsw-alias-bg-layer-1)', color: 'var(--dsw-alias-label-primary)', whiteSpace: 'nowrap', flexShrink: 0 }
function chipStyle(active) {
  var s = {}
  for (var k in CHIP_STYLE_BASE) s[k] = CHIP_STYLE_BASE[k]
  if (active) { s.background = 'var(--dsw-alias-brand-primary)'; s.borderColor = 'var(--dsw-alias-brand-primary)'; s.color = 'var(--dsw-alias-label-primary-inverted)' }
  return s
}
// 0.9.10：分类 chip 紧凑变体（11px / 窄内边距）——自适应换行铺满行宽时更省纵向空间
function catChipStyle(active) {
  var s = chipStyle(active)
  s.padding = '1px 8px'; s.fontSize = '11px'; s.borderRadius = '11px'
  return s
}

/** 生成等价的面板外 CLI 安装命令（npm 双源卡片 spec 已优先 npm 名，最快路径）。 */
function cliCmdFor(spec) {
  return 'dsh plugin add ' + spec
}

var TAB_BASE = { padding: '6px 14px', fontSize: '13px', cursor: 'pointer', border: 'none', background: 'transparent', color: 'var(--dsw-alias-label-secondary)', borderBottom: '2px solid transparent', fontWeight: 500 }
function tabStyle(active) {
  var s = {}
  for (var k in TAB_BASE) s[k] = TAB_BASE[k]
  if (active) { s.color = 'var(--dsw-alias-brand-primary)'; s.borderBottomColor = 'var(--dsw-alias-brand-primary)' }
  return s
}
