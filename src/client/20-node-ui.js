var DEFAULT_CATALOG_URL = 'https://github.com/topics/dsh-plugin'

/** Search API 模板（GitHub 按 topic 列仓库的唯一官方取数端点；⚠️ /topics/{t} REST 端点不存在会 404） */
var TOPIC_API_TEMPLATE = 'https://api.github.com/search/repositories?q=topic:{t}&sort=stars&order=desc&per_page=100'

/**
 * 把用户可读的目录地址解析为实际可 fetch 的 API 地址。
 * - github.com/topics/{t} 页面地址 → 转为 Search API（q=topic:{t}）
 * - 其余（已是 API 端点 / 自建同构 JSON 源）→ 原样透传
 */
function resolveCatalogApi(url) {
  var m = /^https?:\/\/github\.com\/topics\/([^\/?#]+)/i.exec(String(url || '').trim())
  if (m) return TOPIC_API_TEMPLATE.replace('{t}', encodeURIComponent(m[1]))
  return String(url || '').trim()
}

/** 目录请求超时（毫秒）——被墙/挂起时给明确错误而非永远转圈 */
var CATALOG_TIMEOUT_MS = 15000;

/**
 * 从 user/message 事件的 content 提取纯文本预览（防御式：结构未知时降级为空串）。
 */
function extractText(content) {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    var parts = []
    for (var i = 0; i < content.length; i++) {
      var part = content[i]
      if (typeof part === 'string') parts.push(part)
      else if (part && typeof part.text === 'string') parts.push(part.text)
    }
    return parts.join(' ')
  }
  return ''
}

/**
 * 卡片注记节点渲染组件。
 * props 契约与宿主一致：{ node, t }，node 为 chat 目标的 ConversationViewNode。
 */
function CardsNodeView(props) {
  useLocaleTick()
  var data = props.node && props.node.data
  var preview = (data && typeof data.preview === 'string') ? data.preview : ''
  // 0.9.4 #1：色条胶囊容器——品牌色左条 + 弱底胶囊，替代裸行
  var style = {
    display: 'flex', alignItems: 'center', gap: '8px',
    margin: '2px 0', padding: '4px 12px 4px 0',
    maxWidth: 'fit-content',
    background: 'var(--dsw-alias-bg-layer-2)',
    borderLeft: '3px solid var(--dsw-alias-brand-primary)',
    borderRadius: '0 8px 8px 0',
    fontSize: '12px', lineHeight: '18px',
    color: 'var(--dsw-alias-label-tertiary)',
  }
  var badgeStyle = {
    flexShrink: 0, padding: '0 8px', borderRadius: '0 4px 4px 0',
    background: 'var(--dsw-alias-bg-layer-1)', color: 'var(--dsw-alias-label-secondary)',
    fontSize: '11px', lineHeight: '16px',
  }
  return jsx('div', {
    className: 'dsh-plugin-cards-annotation',
    style: style,
    children: [
      jsx('span', { key: 'badge', style: badgeStyle, children: T('node.badge') }),
      jsx('span', {
        key: 'preview',
        style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
        children: preview.length > PREVIEW_MAX ? preview.slice(0, PREVIEW_MAX) + '…' : preview,
      }),
    ],
  })
}

/** 节点定义：每条用户消息产生一个可见的注记节点（所见即所记：只读渲染，不新增模型可见输入）。 */
var definition = {
  kind: CARDS_KIND,
  target: 'chat',
  match: function (event) {
    if (event.type !== 'user/message') return null
    var id = event.data && event.data.id !== undefined ? String(event.data.id) : String(event.seq)
    return { id: id, role: 'start' }
  },
  start: function (_context, match) {
    var data = match.event.data || {}
    return { seq: match.event.seq, text: extractText(data.content) }
  },
  update: function (context) {
    return context.state
  },
  buildViewNode: function (context) {
    var state = context.state
    if (state === undefined) return null
    var location = (context.start && context.start.location)
      || (context.matches[0] && context.matches[0].location)
      || { kind: 'unresolved' }
    return {
      key: context.key,
      kind: CARDS_KIND,
      id: context.id,
      target: 'chat',
      anchorSeq: state.seq,
      location: location,
      visibility: 'visible',
      data: { preview: state.text, seq: state.seq },
    }
  },
}

/* ============================== 设置卡片（plugins.bundle.config） ============================== */

/** 行容器样式 */
var ROW_STYLE = {
  display: 'flex', alignItems: 'center', gap: '10px',
  margin: '6px 0', fontSize: '13px', color: 'var(--dsw-alias-label-primary)',
}
var LABEL_STYLE = { flex: '0 0 140px', fontWeight: 500 }
var INPUT_STYLE = {
  flex: 1, maxWidth: '280px', padding: '4px 8px',
  border: '1px solid var(--dsw-alias-border-l1)', borderRadius: '6px', fontSize: '13px',
}
var HINT_STYLE = { margin: '4px 0', fontSize: '12px', color: 'var(--dsw-alias-label-tertiary)' }
/** 0.9.8：说明列表渲染——按「首个全角冒号」切分加粗标签与说明，配 .dcards-note 样式；各 Tab 只渲染自己的键。 */
function noteUl(T, key, keys) {
  return jsx('ul', { key: key, className: 'dcards-note', children: keys.map(function (k) {
    var t = T(k)
    var i = t.indexOf('：')
    return jsx('li', { key: k, children: [
      i > 0 ? jsx('b', { key: 'l', children: t.slice(0, i + 1) }) : null,
      jsx('span', { key: 't', children: i > 0 ? t.slice(i + 1) : t }),
    ] })
  }) })
}
/** 0.9.3 设置卡分组标题（#2：节点卡片 / 数据来源 / 描述翻译 三组）。 */
var GROUP_STYLE = {
  margin: '12px 0 6px', paddingBottom: '4px', fontSize: '12px', fontWeight: 600,
  color: 'var(--dsw-alias-label-secondary)', borderBottom: '1px solid var(--dsw-alias-border-l2)',
}
/** 0.9.4 #3：表单控件美化——checkbox 品牌色、输入框/下拉 focus 态（内联样式做不了伪类，走类选择器）。 */
var CONFIG_CSS = [
  '.dsh-plugin-cards-config input[type="checkbox"]{width:15px;height:15px;accent-color:var(--dsw-alias-brand-primary);cursor:pointer;margin:0;}',
  '.dsh-plugin-cards-config input[type="checkbox"]:disabled{cursor:not-allowed;}',
  '.dsh-plugin-cards-config input[type="text"]:focus,.dsh-plugin-cards-config input[type="number"]:focus,.dsh-plugin-cards-config input[type="password"]:focus,.dsh-plugin-cards-config select:focus{outline:none !important;border-color:var(--dsw-alias-brand-primary) !important;box-shadow:0 0 0 2px var(--dsw-alias-interactive-bg-hover) !important;}',
].join('')

/**
 * 单字段行：label + 控件。value 变化时经 form.set 写回 Host（原子、带 revision 围栏）。
 */
function FieldRow(props) {
  var label = props.label, hint = props.hint, children = props.children
  return jsx('div', { style: ROW_STYLE, children: [
    jsx('label', { key: 'label', style: LABEL_STYLE, children: label }),
    jsx('span', { key: 'control', style: { flex: 1, display: 'flex' }, children: children }),
    hint === undefined ? null : jsx('span', { key: 'hint', style: HINT_STYLE, children: hint }),
  ] })
}

/**
 * bundle 配置表单卡片。
 * owner props 契约见 ui-plugin-manager slot-contract：{ view, form? }；
 * 表单数据不走 owner.form，直接持有 ctx.configForms.get(PKG_NAME)（官方 WebSearchCard 同款模式）。
 */
function createConfigCardView(form) {
  return function ConfigCardView(props) {
    useLocaleTick()
    if (props.view !== 'page') return null
    // ⚠️ form.subscribe/getSnapshot 是依赖 this 的实例方法，必须包箭头函数调用（0.2.2 踩坑：直接传引用 → this.store undefined 崩溃）
    var snapshot = useSyncExternalStore(
      function (cb) { return form.subscribe(cb) },
      function () { return form.getSnapshot() },
    )
    if (snapshot.status !== 'ready') {
      return jsx('p', { style: HINT_STYLE, children:
        snapshot.status === 'loading' ? T('cfg.loading') : T('cfg.unavailable') })
    }
    var value = snapshot.value || {}
    var writable = snapshot.writable
    var set = function (field, v) { void form.set(field, v) }
    return jsx('div', { className: 'dsh-plugin-cards-config', children: [
      jsx('style', { key: 'css', dangerouslySetInnerHTML: { __html: CONFIG_CSS } }),
      jsx('p', { key: 'grpCard', style: GROUP_STYLE, children: T('cfg.grpCard') }),
      jsx(FieldRow, { key: 'enabled', label: T('cfg.fEnabled'),
        children: jsx('input', {
          type: 'checkbox', disabled: !writable,
          checked: value.enabled !== false,
          onChange: function (e) { set('enabled', e.target.checked) },
        }) }),
      jsx(FieldRow, { key: 'cardTitle', label: T('cfg.fCardTitle'),
        children: jsx('input', {
          type: 'text', disabled: !writable, style: INPUT_STYLE,
          value: typeof value.cardTitle === 'string' ? value.cardTitle : '',
          onChange: function (e) { set('cardTitle', e.target.value) },
        }) }),
      jsx(FieldRow, { key: 'maxRecentEvents', label: T('cfg.fMaxEvents'), hint: '1–200',
        children: jsx('input', {
          type: 'number', min: 1, max: 200, disabled: !writable, style: INPUT_STYLE,
          value: typeof value.maxRecentEvents === 'number' ? value.maxRecentEvents : 20,
          onChange: function (e) {
            var n = Number(e.target.value)
            if (Number.isFinite(n) && n >= 1 && n <= 200) set('maxRecentEvents', Math.round(n))
          },
        }) }),
      jsx(FieldRow, { key: 'density', label: T('cfg.fDensity'),
        children: jsx('select', {
          disabled: !writable, style: INPUT_STYLE,
          value: value.density === 'detailed' ? 'detailed' : 'compact',
          onChange: function (e) { set('density', e.target.value) },
          children: [
            jsx('option', { key: 'compact', value: 'compact', children: T('cfg.dCompact') }),
            jsx('option', { key: 'detailed', value: 'detailed', children: T('cfg.dDetailed') }),
          ],
        }) }),
      jsx('p', { key: 'grpCatalog', style: GROUP_STYLE, children: T('cfg.grpCatalog') }),
      jsx(FieldRow, { key: 'catalogUrl', label: T('cfg.fCatalogUrl'),
        children: jsx('input', {
          type: 'text', disabled: !writable, placeholder: DEFAULT_CATALOG_URL,
          style: { flex: 1, maxWidth: '440px', padding: '4px 8px',
            border: '1px solid var(--dsw-alias-border-l1)', borderRadius: '6px', fontSize: '12px' },
          value: typeof value.catalogUrl === 'string' ? value.catalogUrl : DEFAULT_CATALOG_URL,
          onChange: function (e) { set('catalogUrl', e.target.value) },
        }) }),
      jsx('p', { key: 'catalogHint', style: HINT_STYLE, children:
        T('cfg.catalogHint') }),
      jsx('p', { key: 'grpLlm', style: GROUP_STYLE, children: T('cfg.grpLlm') }),
      jsx(FieldRow, { key: 'llmEndpoint', label: T('cfg.fLlmEndpoint'),
        children: jsx('input', {
          type: 'text', disabled: !writable, placeholder: 'https://api.deepseek.com/v1',
          style: { flex: 1, maxWidth: '440px', padding: '4px 8px',
            border: '1px solid var(--dsw-alias-border-l1)', borderRadius: '6px', fontSize: '12px' },
          value: typeof value.llmEndpoint === 'string' ? value.llmEndpoint : '',
          onChange: function (e) { set('llmEndpoint', e.target.value) },
        }) }),
      jsx(FieldRow, { key: 'llmModel', label: T('cfg.fLlmModel'),
        children: jsx('input', {
          type: 'text', disabled: !writable, placeholder: 'deepseek-chat',
          style: { flex: 1, maxWidth: '440px', padding: '4px 8px',
            border: '1px solid var(--dsw-alias-border-l1)', borderRadius: '6px', fontSize: '12px' },
          value: typeof value.llmModel === 'string' ? value.llmModel : '',
          onChange: function (e) { set('llmModel', e.target.value) },
        }) }),
      jsx(FieldRow, { key: 'llmApiKey', label: T('cfg.fLlmKey'),
        children: jsx('input', {
          type: 'password', disabled: !writable, placeholder: T('cfg.llmKeyPh'),
          style: { flex: 1, maxWidth: '440px', padding: '4px 8px',
            border: '1px solid var(--dsw-alias-border-l1)', borderRadius: '6px', fontSize: '12px' },
          value: typeof value.llmApiKey === 'string' ? value.llmApiKey : '',
          onChange: function (e) { set('llmApiKey', e.target.value) },
        }) }),
      jsx('p', { key: 'llmHint', style: HINT_STYLE, children:
        T('cfg.llmHint') }),
      jsx('p', { key: 'note', style: HINT_STYLE, children:
        writable ? T('cfg.notePersist') : T('cfg.noteMemory') }),
    ] })
  }
}

/* ============================== 社区插件市场（settings.section） ============================== */
