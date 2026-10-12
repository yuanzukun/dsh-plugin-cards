var SECTION_WRAP = { padding: '8px 0', fontSize: '13px', color: 'var(--dsw-alias-label-primary)' }
var META_STYLE = { fontSize: '12px', color: 'var(--dsw-alias-label-tertiary)' }
var BTN_STYLE = {
  padding: '4px 14px', borderRadius: '6px', border: 'none',
  background: 'var(--dsw-alias-brand-primary)', color: 'var(--dsw-alias-label-primary-inverted)', fontSize: '12px', cursor: 'pointer',
}
var BTN_GHOST_STYLE = {
  padding: '4px 14px', borderRadius: '6px',
  border: '1px solid var(--dsw-alias-border-l1)', background: 'var(--dsw-alias-bg-layer-1)', color: 'var(--dsw-alias-label-primary)',
  fontSize: '12px', cursor: 'pointer',
}
var BTN_DISABLED_STYLE = {
  padding: '4px 14px', borderRadius: '6px',
  border: '1px solid var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-bg-layer-2)', color: 'var(--dsw-alias-label-tertiary)',
  fontSize: '12px', cursor: 'default',
}

/** 分类徽章色板：键与 CATEGORY_RULES 的 label 对应，中不了的落 OTHER_COLOR。 */
var CATEGORY_COLORS = {
  '智能体与技能': '#7c3aed',
  '界面与桌面': '#0d9488',
  '记忆与知识': '#16a34a',
  '工具与自动化': '#d97706',
  '框架与宿主集成': '#2563eb',
  '合集与市场': '#9333ea',
  '主题与外观': '#db2777',
  '模型与多模态': '#0891b2',
  '数据与安全': '#ea580c',
}
var OTHER_COLOR = '#9aa1ab' // artwork：与 CATEGORY_COLORS 同为徽章色板（参与 +'1f' 透明度拼接），按官方规则保留字面色

/** 每页条数候选（GitHub Search API per_page 上限 100）。 */
var PAGE_SIZES = [20, 50, 100]

/**
 * 市场区样式表（0.4.0 网格卡片改版，类名前缀 dcards-）：
 * 网格自适应列数（minmax 220px，适配设置弹窗 ~465px 内容区 → 2 列；更宽宿主 3~4 列）；
 * 描述 3 行 line-clamp 替代按字符截断；骨架屏 shimmer；分页条。
 */
var MARKET_CSS = [
  // 官方规则（practices.md UI）：样式仅引用 --dsw-alias-* 主题 token，字面色仅限艺术图（徽章色板在 JS 侧）。
  // 0.9.12 asar 取证：宿主无 shadow/elevation 类 token → 卡片 hover 阴影保留字面 rgba（唯一例外，两类主题下均为中性灰可接受）。
  '.dcards-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;}', // 0.9.23：实测 178px 3 列不可行——avatar(30)+★(~50) 固定占 88px，namewrap 仅剩 59px 标题/副行全截断；回退 2 列 277px，保留紧凑化（avatar 30 + padding 8/10）让 namewrap 154→166px
  '.dcards-card{border:1px solid var(--dsw-alias-border-l2);border-radius:10px;padding:8px 10px;display:flex;flex-direction:column;background:var(--dsw-alias-bg-layer-1);box-shadow:0 1px 3px rgba(31,39,51,.06);transition:border-color .15s ease,box-shadow .18s ease,transform .18s ease;}', // 0.9.23：常驻 subtle 阴影（审计⑥：浅色下卡面与页面同白仅 1px 边框区分）+ padding 10/12→8/10 配合 3 列窄卡（178px 下 namewrap +8px）
  '.dcards-card:hover{border-color:var(--dsw-alias-border-l3);box-shadow:0 6px 16px rgba(31,39,51,.12);transform:translateY(-2px);}',
  '.dcards-avatar{width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;line-height:1;color:var(--dsw-alias-label-primary-inverted);flex-shrink:0;user-select:none;}', // 0.9.23：38→30px 配合 3 列窄卡（视觉锚点保留，为 namewrap 让 8px；列表视图有独立 34px 覆盖不受影响）
  '.dcards-head{display:flex;align-items:center;gap:8px;margin-bottom:4px;}',
  '.dcards-name{display:block;font-weight:600;font-size:14px;color:var(--dsw-alias-label-primary);text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}', // 0.9.15：补 display:block——0.9.13 移入 namewrap 后变行内元素，overflow/ellipsis 失效致长名溢出画到 ★/描述上（真机截图实锤）
  '.dcards-name:hover{color:var(--dsw-alias-brand-primary);}',
  '.dcards-namewrap{flex:1;min-width:0;}', // 0.9.13：双行头部容器
  '.dcards-sub{margin:1px 0 0;font-size:11px;line-height:14px;color:var(--dsw-alias-label-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}', // 0.9.13：owner · 更新时间 副行
  '.dcards-catdot{display:inline-flex;align-items:center;gap:5px;font-size:11px;white-space:nowrap;flex-shrink:0;}', // 0.9.13：分类色点+文字（替代彩色 pill）
  '.dcards-badge{padding:1px 8px;border-radius:9px;font-size:11px;line-height:16px;white-space:nowrap;}',
  '.dcards-desc{margin:0;font-size:12px;color:var(--dsw-alias-label-secondary);line-height:19px;min-height:57px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}', // 0.9.13：行高 18→19 提升阅读节奏
  '.dcards-skel{height:150px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;', // 0.9.13：130→150 对齐双行头部实卡
  'background:linear-gradient(100deg,var(--dsw-alias-bg-layer-2) 40%,var(--dsw-alias-bg-skeleton) 50%,var(--dsw-alias-bg-layer-2) 60%);background-size:200% 100%;animation:dcards-shim 1.4s infinite linear;}',
  '@keyframes dcards-shim{to{background-position:-200% 0;}}',
  '.dcards-pagebar{display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;margin:10px 0 2px;font-size:12px;color:var(--dsw-alias-label-secondary);}',
  '.dcards-pagebar select{padding:2px 6px;border:1px solid var(--dsw-alias-border-l1);border-radius:6px;font-size:12px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);}',
  '.dcards-catsel{display:none;align-items:center;gap:6px;}', // 0.9.23：窄屏分类下拉（替代 chips 墙）
  '.dcards-catsel select{flex:1;min-width:0;padding:3px 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:6px;font-size:12px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);height:26px;}',
  '.dcards-filterbar{background:var(--dsw-alias-bg-layer-2);border-radius:10px;padding:8px 10px;display:flex;flex-direction:column;gap:8px;}',
  '.dcards-chiprow{display:flex;align-items:center;gap:6px;flex-wrap:wrap;}',
  '.dcards-chiprow.dcats-collapsed{max-height:30px;overflow:hidden;}', // 0.9.23：分类行默认单行折叠（30px≈单行 chip 高），「更多 ▾」展开全量——首屏卡片前移 ~46px（真机审计②：2 行 69px 常驻 + 子类 44px）
  '.dcards-morebtn{flex:0 0 auto;padding:1px 8px;border-radius:11px;font-size:11px;cursor:pointer;border:1px dashed var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-secondary);white-space:nowrap;}', // 0.9.23：折叠切换钮（虚线弱化，区别于实体 chip）
  '.dcards-chiprow>button{white-space:nowrap;flex:0 0 auto;}',
  '.dcards-chiprow.scroll{flex-wrap:nowrap;overflow-x:auto;padding-bottom:2px;}',
  '.dcards-chiprow.scroll>button{flex:0 0 auto;}',
  '.dcards-chiprow::-webkit-scrollbar{height:6px;}',
  '.dcards-chiprow::-webkit-scrollbar-thumb{background:var(--dsw-alias-border-l1);border-radius:3px;}',
  '.dcards-rowlabel{flex:0 0 auto;font-size:12px;color:var(--dsw-alias-label-tertiary);}',
  // 0.9.4 #7：已安装行 hover 高亮
  '.dcards-instrow{border-radius:6px;transition:background .12s ease;}',
  '.dcards-instrow:hover{background:var(--dsw-alias-interactive-bg-hover);}',
  // 0.9.8：说明长文结构化——「标签：说明」列表（替代原先整段 <p> 挤排）
  '.dcards-note{margin:10px 0 0;padding:10px 12px;list-style:none;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-1);}',
  '.dcards-note li{display:flex;gap:6px;font-size:12px;line-height:1.7;color:var(--dsw-alias-label-tertiary);}',
  '.dcards-note li+li{margin-top:3px;}',
  '.dcards-note b{flex-shrink:0;font-weight:600;color:var(--dsw-alias-label-secondary);}',
  // 0.9.6：安装进度卡片（spinner / 步骤点 / pnpm 计数条）
  '.dcards-progcard{border:1px solid var(--dsw-alias-border-l2);border-radius:10px;padding:10px 12px;background:var(--dsw-alias-bg-layer-1);margin:6px 0;display:flex;flex-direction:column;gap:8px;}',
  '.dcards-spin{width:13px;height:13px;border:2px solid var(--dsw-alias-border-l2);border-top-color:var(--dsw-alias-brand-primary);border-radius:50%;animation:dcards-rot .8s linear infinite;flex-shrink:0;}',
  '@keyframes dcards-rot{to{transform:rotate(360deg);}}',
  '.dcards-stepdot{width:16px;height:16px;border-radius:50%;font-size:10px;line-height:1;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;}',
  '.dcards-counts{font-family:monospace;font-size:11px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);border-radius:6px;padding:5px 10px;}',
  // ---- 0.9.12：底部操作行 + 列表视图 + 窄容器响应式 ----
  '.dcards-actions{display:flex;align-items:center;justify-content:flex-start;gap:6px;margin-top:auto;padding-top:6px;}', // 0.9.13：flex-start，色点 marginRight:auto 推按钮靠右
  '.dcards-list{display:flex;flex-direction:column;gap:6px;}',
  '.dcards-list .dcards-card{flex-direction:row;align-items:center;gap:10px;padding:8px 12px 8px 14px;}', // 0.9.16 方案A：堆叠行（对齐 VS Code/Obsidian 范式）
  '.dcards-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px;}', // 0.9.16：列表主列（l1 名称+owner+★ / l2 描述 / l3 元数据）
  '.dcards-l1{display:flex;align-items:baseline;gap:8px;min-width:0;}',
  '.dcards-l1 .dcards-name{flex:0 1 auto;min-width:0;}', // 长名占满剩余、可截断
  '.dcards-l1owner{flex:0 0 auto;max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;color:var(--dsw-alias-label-tertiary);}',
  '.dcards-l1 .dcards-stars{margin-left:auto;flex:0 0 auto;}', // ★ 贴名称行尾——原独立列挤压标题的根因移除
  '.dcards-l3{display:flex;align-items:center;gap:8px;min-width:0;overflow:hidden;}',
  '.dcards-list .dcards-desc{display:block;min-height:0;line-height:19px;white-space:nowrap;text-overflow:ellipsis;overflow:hidden;}', // 覆盖网格 -webkit-box 3 行 → 单行截断
  '.dcards-list .dcards-avatar{width:34px;height:34px;font-size:15px;border-radius:8px;}',
  // 480px 以下（设置弹窗 ~465px 内容区）：单列 + 描述 2 行，根治 220px 双列小卡头部折行
  '@media (max-width:480px){.dcards-grid{grid-template-columns:1fr;gap:8px;}.dcards-desc{-webkit-line-clamp:2;min-height:36px;}}',
  // 0.9.23：窄屏分类 chips 墙 → 下拉选择器（真机审计⑤：420px 下分类 291px + 子类 141px 占首屏，内容被推到两屏外）
  '@media (max-width:480px){.dcats-chipwrap{display:none;}.dcards-catsel{display:flex;}}',
].join('')

/** 目录条目 → 安装 spec：npm 项原样作 npm 包名（0.6.0，宿主对非 github: 字符串走 npm 安装）；
 * 仓库项取 github:owner/repo；字符串项原样。 */
function specOf(item) {
  if (typeof item === 'string') return item
  if (item && typeof item.npm === 'string' && item.npm) return item.npm
  var full = item.full_name || (item.owner && item.owner.login ? item.owner.login + '/' + item.name : item.name)
  return full ? 'github:' + full : undefined
}

/** 0.9.6：安装 spec → 短展示名（进度/结果卡片标题用，完整 spec 保留在 title 提示）：
 *  github:owner/repo → repo；https/git URL 取尾段去 .git；npm name@ver 去版本（scoped 名 @ 在 / 前不受影响）。 */
function shortSpecName(spec) {
  var s = String(spec || '')
  if (s.indexOf('github:') === 0) {
    var parts = s.slice(7).split('/')
    s = parts[parts.length - 1]
  } else if (/^(https|git)\b/.test(s) || /^git@/.test(s)) {
    s = (s.replace(/\.git$/, '').split('/').pop()) || s
  }
  var slash = s.lastIndexOf('/')
  var at = s.lastIndexOf('@') // 0.9.6：用最后一个 @（scoped 名 @scope/pkg 的首个 @ 是语法符，不能按它截）
  if (at > slash && at > 0) s = s.slice(0, at)
  return s || String(spec || '')
}

/** 0.9.6：pnpm 进度行 → 结构化计数（resolved/reused/downloaded/added）；非计数行（构建输出等）返回 null 走原样展示。 */
function parsePnpmCounts(s) {
  s = String(s || '')
  function num(k) { var m = s.match(new RegExp(k + '\\s+(\\d+)')); return m ? Number(m[1]) : null }
  var resolved = num('resolved'), reused = num('reused'), downloaded = num('downloaded'), added = num('added')
  if (resolved === null && reused === null && downloaded === null && added === null) return null
  return { resolved: resolved || 0, reused: reused || 0, downloaded: downloaded || 0, added: added || 0 }
}

/** 0.9.6：毫秒 → m:ss（进度/结果卡片用时）。 */
function fmtMMSS(ms) {
  var t = Math.max(0, Math.round(ms / 1000))
  return Math.floor(t / 60) + ':' + ('0' + (t % 60)).slice(-2)
}

/** ---- 社区市场：分类 / 分页 / 质量过滤辅助（0.3.0，仅用 GitHub 官方源） ---- */

/**
 * 中文分类体系（0.5.0 重构，0.5.4 全量数据调优）：
 * 每类锚定官方真实高频 topics，按优先序「首中即止」；无 topics 命中再用名称/描述关键词兜底；
 * 全不中归「其他」。生态共有标签（deepseek-harness / deepseek）不作锚点——覆盖率 >70% 无区分度。
 * 0.5.4：分类计数改为全量抓取逐条统计（分桶绕开 Search API 1000 条上限），不再用采样折算。
 * 0.9.11：二级分类——大类加 subs（仅父类条目内二次判别，topics 优先 kw 兜底首中即止；
 * catchall:true 的子类承接同父类未命中项）；dsh-plugin-market 移交合集与市场；
 * classifyItem 兜底阶段补 dsh-/_ 名称前缀 → 框架（收敛「其他」682 条漏网）。
 * 0.9.11b 准确率调优（8071 条抽样审计）：移除过泛 kw（ui 的 web/desktop、记忆的搜索、模型的视觉、
 * 数据的 session/会话、工具的计费/failover → 移交模型·供应商与用量）；合集与市场 kw 收窄
 * （market → 插件市场/plugin market，修复股票行情包误入）；主题与外观前移到框架之前（修复皮肤
 * 命中 harness kw 误入框架）；name 含 dsh-market 强制归合集与市场；数据与安全/主题与外观补子类。
 */
var CATEGORY_RULES = [
  { label: '智能体与技能', topics: ['ai-agents', 'ai-agent', 'agent', 'agents', 'agent-skills', 'skills', 'coding-agent', 'multi-agent', 'skill', 'preset', 'jailbreak', 'prompt', 'prompts', 'roleplay', 'tavern'], kw: ['agent', 'skill', 'prompt', '预设', '破甲', 'jailbreak', '酒馆', 'tavern', 'roleplay'],
    subs: [
      { label: '多智能体', topics: ['multi-agent'], kw: ['multi-agent', '多智能体'] },
      { label: '技能包 Skills', topics: ['agent-skills', 'skills', 'skill'], kw: ['skill'] },
      { label: '提示词与角色扮演', topics: ['preset', 'jailbreak', 'prompt', 'prompts', 'roleplay', 'tavern'], kw: ['prompt', '预设', '破甲', 'jailbreak', '酒馆', 'tavern', 'roleplay'] },
      { label: '智能体框架', topics: ['ai-agents', 'ai-agent', 'agent', 'agents', 'coding-agent'], kw: ['agent'], catchall: true },
    ] },
  { label: '界面与桌面', topics: ['web', 'web-ui', 'ui', 'gui', 'desktop-app', 'desktop', 'desktop-pet', 'browser', 'chat', 'frontend', 'mobile', 'data-visualization', 'visualization', 'interactive-visualization', 'sidebar'], kw: ['gui', '桌宠', '宠物', 'browser', 'mobile', 'chat', '可视化', 'visualiz', 'sidebar', '侧边栏', 'galgame'],
    subs: [
      { label: '桌宠与桌面应用', topics: ['desktop-pet', 'desktop-app', 'desktop'], kw: ['desktop', '桌面', '桌宠', '宠物', 'galgame'] },
      { label: '可视化与侧边栏', topics: ['data-visualization', 'visualization', 'interactive-visualization', 'sidebar'], kw: ['可视化', 'visualiz', 'sidebar', '侧边栏', '便签'] },
      { label: '移动端', topics: ['mobile'], kw: ['mobile', '移动端'] },
      { label: 'Web 界面', topics: ['web', 'web-ui', 'ui', 'gui', 'browser', 'chat', 'frontend'], kw: ['web', 'gui', 'browser', 'chat', '前端', '桌面', 'desktop'], catchall: true },
    ] },
  { label: '记忆与知识', topics: ['memory', 'agent-memory', 'rag', 'knowledge', 'vector', 'embedding', 'search', 'web-search', 'search-engine'], kw: ['memory', 'rag', 'knowledge'],
    subs: [
      { label: '长期记忆', topics: ['memory', 'agent-memory', 'long-term-memory'], kw: ['memory', '记忆'] },
      { label: 'RAG 与知识库', topics: ['rag', 'knowledge', 'knowledge-base', 'knowledge-graph', 'vector', 'embedding'], kw: ['rag', 'knowledge', '知识', '向量'] },
      { label: '联网搜索', topics: ['search', 'web-search', 'search-engine', 'tavily'], kw: ['搜索引擎', '联网搜索', 'tavily', 'search'] },
    ] },
  { label: '工具与自动化', topics: ['tool', 'tools', 'cli', 'workflow', 'automation', 'developer-tools', 'mcp', 'mcp-server', 'productivity', 'research', 'research-tools', 'arxiv', 'latex', 'paper-writing', 'experiment-tracking', 'email', 'imap', 'smtp', 'diagnostics', 'linting'], kw: ['tool', 'cli', 'workflow', 'automation', '科研', '论文', 'latex', 'arxiv', 'research', '写作', '小说', 'novel', '创作', '简历', 'email', '邮件', '导出', 'export', '终端', 'terminal'],
    subs: [
      { label: 'MCP 服务器', topics: ['mcp', 'mcp-server', 'model-context-protocol'], kw: ['mcp'] },
      { label: '科研与写作', topics: ['research', 'research-tools', 'arxiv', 'latex', 'paper-writing', 'experiment-tracking'], kw: ['科研', '论文', 'latex', 'arxiv', 'research', '写作', '小说', 'novel', '创作'] },
      { label: '终端与 CLI', topics: ['cli'], kw: ['cli', '终端', 'terminal'] },
      { label: '效率与邮件', topics: ['productivity', 'email', 'imap', 'smtp'], kw: ['email', '邮件', '效率'] },
    ] },
  { label: '主题与外观', topics: ['theme', 'themes', 'icon', 'font', 'color', 'skin', 'emoji', 'sticker'], kw: ['theme', 'skin', 'icon', 'emoji', '表情', '皮肤'],
    subs: [
      { label: '皮肤', topics: ['skin'], kw: ['skin', '皮肤'] },
      { label: '表情与贴纸', topics: ['emoji', 'sticker'], kw: ['emoji', '表情', '贴纸', '斗图'] },
      { label: '图标与字体', topics: ['icon', 'font'], kw: ['icon', 'font', '图标', '字体'] },
      { label: '主题', topics: ['theme', 'themes', 'color'], kw: ['theme', '配色'], catchall: true },
    ] },
  { label: '框架与宿主集成', topics: ['deepseek-harness-plugin', 'cordis', 'harness', 'claude-code', 'codex', 'opencode', 'dsh-plugins'], kw: ['harness', 'cordis', 'runtime', 'sdk', 'opencode'],
    subs: [
      { label: 'DSH 生态', topics: ['dsh-plugins', 'deepseek-harness-plugin', 'dsh-bundle', 'deepseek-harness-plugins', 'dsh-plugin-desktop'], kw: ['dsh'] },
      { label: 'Cordis 生态', topics: ['cordis', 'cordis-plugin'], kw: ['cordis'] },
      { label: '其他宿主', topics: ['claude-code', 'codex', 'opencode'], kw: ['claude', 'codex', 'opencode'] },
      { label: '通用集成', topics: [], kw: [], catchall: true },
    ] },
  { label: '合集与市场', topics: ['awesome-list', 'awesome', 'collection', 'market', 'dsh-plugin-market', 'list', 'boilerplate', 'template', 'rankings', 'recommendations'], kw: ['awesome', 'collection', '插件市场', 'plugin market', 'plugin-market', '排行', '推荐'] },
  // 0.8.3：补捞「其他」长尾两大簇（0.5.4 全量数据聚类实测：模型/供应商/token ≈100+ 条、视觉多模态 ≈50 条、数据/安全 ≈40 条）。
  // 追加在末尾——规则按序首中即止，现有条目分类不受影响；仍不中的归「其他」。
  { label: '模型与多模态', topics: ['vision', 'multimodal', 'models', 'image', 'image-generation', 'tts', 'asr', 'speech', 'ocr', 'billing', 'cost-tracker'], kw: ['vision', 'multimodal', '多模态', 'provider', '供应商', 'token', 'balance', 'image', '图像', '图片', '文生图', '语音', '识别', '计费', 'billing', '成本', '余额', '用量', 'failover', '模型池'],
    subs: [
      { label: '图像与视觉', topics: ['image', 'image-generation', 'vision'], kw: ['image', '图像', '图片', '文生图', 'vision'] },
      { label: '语音与识别', topics: ['tts', 'asr', 'speech', 'ocr', 'voice'], kw: ['tts', '语音', '识别', 'ocr'] },
      { label: '供应商与用量', topics: ['models', 'billing', 'cost-tracker'], kw: ['provider', '供应商', 'token', 'balance', 'multimodal', '多模态', '计费', 'billing', '成本', '余额', '用量', 'failover', '模型池'], catchall: true },
    ] },
  { label: '数据与安全', topics: ['security', 'audit', 'sql', 'sqlite', 'database', 'backup', 'encryption', 'notification'], kw: ['security', '安全', 'audit', '审计', 'sql', '数据库', 'database', 'backup', '备份', 'encryption', '加密', '通知'],
    subs: [
      { label: '数据库与备份', topics: ['sql', 'sqlite', 'database', 'backup'], kw: ['sql', '数据库', 'database', 'backup', '备份'] },
      { label: '通知', topics: ['notification'], kw: ['通知', 'notification'] },
      { label: '安全与审计', topics: ['security', 'audit', 'encryption'], kw: ['security', '安全', 'audit', '审计', '加密', 'encryption'], catchall: true },
    ] },
]
var CATEGORY_OTHER = '其他'

function classifyItem(item) {
  // 0.9.11b：dsh-market 系（含 @p-dsh-market/* 镜像包）恒归合集与市场（名称即身份，优先于 topics）
  if (/dsh[-_.]?market/i.test(item.name || '') || /dsh[-_.]?market/i.test(item.npm || '')) return '合集与市场'
  var topics = Array.isArray(item.topics) ? item.topics : []
  for (var i = 0; i < CATEGORY_RULES.length; i++) {
    var rule = CATEGORY_RULES[i]
    for (var j = 0; j < rule.topics.length; j++) {
      if (topics.indexOf(rule.topics[j]) !== -1) return rule.label
    }
  }
  var text = ((item.name || '') + ' ' + (item.description || '')).toLowerCase()
  for (var k = 0; k < CATEGORY_RULES.length; k++) {
    var r2 = CATEGORY_RULES[k]
    for (var m = 0; m < r2.kw.length; m++) {
      if (text.indexOf(r2.kw[m]) !== -1) return r2.label
    }
  }
  // 0.9.11 漏斗修补：dsh-/_ 前缀命名的仓库几乎必属 DSH 生态，别漏进「其他」（实测其他 682 条中大量此类）
  // 0.9.23 全量审计修正（13668 条）：原测 item.name——npm scoped 镜像名会覆盖 name（@owner/dsh-xxx，
  // 实测 619 条面 / 564 条仓库段实为 dsh- 开头），@ 开头永不命中前缀 → 37 条漏进「其他」（占该桶 30%）；
  // 另有 dedup 胜出包名无 dsh- 前缀形态（dsh-reasoning-slider→name=reasoning-slider）。改测 full_name
  // 仓库段（GitHub 仓库名恒定，两形态同治）。
  var repoSeg = String(item.full_name || item.name || '').split('/').pop() || ''
  if (/^dsh[-_]/i.test(repoSeg)) return '框架与宿主集成'
  return CATEGORY_OTHER
}

/** 0.9.11 二级分类：在父类条目内二次判别子类（topics 优先、kw 兜底、首中即止）。
 * 返回 '' = 未归入任何子类（仅出现在「子类·全部」里，不单列 chip）；
 * catchall 子类承接同父类未命中项。父类无 subs 返回 ''。 */
function subsOf(parentLabel) {
  for (var i = 0; i < CATEGORY_RULES.length; i++) {
    if (CATEGORY_RULES[i].label === parentLabel) return CATEGORY_RULES[i].subs || null
  }
  return null
}
function classifySub(item, parentLabel) {
  var subs = subsOf(parentLabel)
  if (!subs) return ''
  var topics = Array.isArray(item.topics) ? item.topics : []
  var ci, cj, si, sj
  for (ci = 0; ci < subs.length; ci++) {
    for (cj = 0; cj < subs[ci].topics.length; cj++) {
      if (topics.indexOf(subs[ci].topics[cj]) !== -1) return subs[ci].label
    }
  }
  var text = ((item.name || '') + ' ' + (item.description || '')).toLowerCase()
  for (si = 0; si < subs.length; si++) {
    for (sj = 0; sj < subs[si].kw.length; sj++) {
      if (text.indexOf(subs[si].kw[sj]) !== -1) return subs[si].label
    }
  }
  for (var c = 0; c < subs.length; c++) {
    if (subs[c].catchall) return subs[c].label
  }
  return ''
}

/** ---- 0.5.4 全量精确统计：分桶抓全部仓库 + localStorage 缓存（24h TTL） ---- */
var CATIDX_CACHE_KEY = 'dsh-plugin-cards.catidx.v1'
var CATIDX_RULES_VER = 7 // 分类规则/数据口径调整时 +1，使旧缓存整体失效（v7：二级分类 + 准确率调优 + dsh- 前缀漏斗修补）
// 0.8.9：卸载后整页刷新定时器 —— 必须挂模块作用域：卸载成功后宿主刷新会让面板组件卸载重挂，
// 组件作用域的 timer 会被 effect cleanup 清掉，导致刷新永远不触发（真机实测踩坑）
var pageReloadTimer = null
var CATIDX_TTL_MS = 24 * 3600 * 1000
var CATIDX_INTERVAL_MS = 7000 // 未认证 Search API 限流 10 次/分钟
var SEARCH_RESULT_CAP = 1000 // Search API 单查询最多返回 1000 条（第 11 页起 422）

/** 压缩条目：只保留分类/卡片/搜索/安装所需字段。v2（0.6.0）新增：
 * npm（npm 包名，安装 spec 用原样包名）、version（package.json semver）、
 * installable（true=声明 dsh.bundle 可装 / false=不可装 / null=未快筛）、source（github|npm|both）。 */
function compactItem(it) {
  return {
    full_name: typeof it.full_name === 'string' ? it.full_name : ((it.owner && it.owner.login ? it.owner.login + '/' + it.name : it.name) || ''),
    name: it.name || '',
    npm: typeof it.npm === 'string' ? it.npm : '',
    version: typeof it.version === 'string' ? it.version : '',
    installable: typeof it.installable === 'boolean' ? it.installable : null,
    ec: typeof it.engineCompat === 'number' ? it.engineCompat : null, // 1.2.0 L2 引擎兼容：1/0/null（旧快照无此字段→null 不过滤）
    ms: typeof it.metaScore === 'number' ? it.metaScore : 0, // 1.2.0 L3 展示合规 0-3（icon/locale/package.json export）
    source: typeof it.source === 'string' ? it.source : '',
    stargazers_count: it.stargazers_count || 0,
    updated_at: typeof it.updated_at === 'string' ? it.updated_at : '',
    description: typeof it.description === 'string' ? it.description.slice(0, 500) : '',
    descZh: typeof it.description_zh === 'string' && it.description_zh ? it.description_zh.slice(0, 600) : '', // 0.9.10：hub 侧 LLM 预翻译（随快照分发；缺失时走运行时翻译兜底）
    topics: Array.isArray(it.topics) ? it.topics.slice(0, 20) : [],
  }
}

/** 排序：可装优先（installable false 沉底），引擎不兼容（ec===0，1.2.0 L2）同级再沉底；
 *  同级按 stars，再按展示合规分（ms，0.2.0 规范三件套）——合规示范排前 */
function rankSort(a, b) {
  var ra = (a && a.installable === false ? 1 : 0) + (a && a.ec === 0 ? 1 : 0)
  var rb = (b && b.installable === false ? 1 : 0) + (b && b.ec === 0 ? 1 : 0)
  return ra - rb || (b.stargazers_count || 0) - (a.stargazers_count || 0) || ((b.ms || 0) - (a.ms || 0))
}

/** ---- 0.9.10 目录去重（M2）：hub 快照里同一 GitHub 仓库可能被多个 npm 包名回挂（镜像/抢注包），
 *  实测 dsh-market/dsh-market 同名 4 条（npm: '' / dshmarket / @chatcode/cco-market / dsh-market-plus），
 *  spec 互不相同按 spec 查不出 → 按 GitHub 仓库身份（full_name）去重；npm-only 条目按 npm 包名（注册表唯一，天然不重）。
 *  保留优先级：可安装 > npm 名与仓库名一致 > 展示合规分 > 星数 > 来源 both>github>npm（均为确定性字段，结果稳定） ---- */
function dedupPickScore(it) {
  var inst = it && it.installable === true ? 0 : (it && it.installable == null ? 1 : 2)
  var fn = String((it && it.full_name) || '')
  var repoName = fn.slice(fn.indexOf('/') + 1).toLowerCase()
  var npmMatch = it && it.npm && repoName && String(it.npm).toLowerCase() === repoName ? 0 : 1
  var src = it && it.source === 'both' ? 0 : (it && it.source === 'github' ? 1 : 2)
  return [inst, npmMatch, -(it && it.ms || 0), -(it && it.stargazers_count || 0), src]
}
function dedupBetter(a, b) { // a 是否优于 b（逐维比较，全等视为平局保留先入者）
  var sa = dedupPickScore(a), sb = dedupPickScore(b)
  for (var i = 0; i < sa.length; i++) { if (sa[i] !== sb[i]) return sa[i] < sb[i] }
  return false
}
function dedupItems(items) {
  var keys = [], map = {}, loose = [] // loose：既无 full_name 又无 npm 的无身份条目（正常不存在，防御保留）
  for (var i = 0; i < items.length; i++) {
    var it = items[i]
    var fn = String((it && it.full_name) || '')
    var npm = String((it && it.npm) || '')
    var key = fn ? 'gh:' + fn.toLowerCase() : (npm ? 'npm:' + npm.toLowerCase() : '')
    if (!key) { loose.push(it); continue }
    if (!(key in map)) { map[key] = it; keys.push(key) }
    else if (dedupBetter(it, map[key])) map[key] = it
  }
  var out = []
  for (var k = 0; k < keys.length; k++) out.push(map[keys[k]])
  for (var l = 0; l < loose.length; l++) out.push(loose[l])
  return out
}

/** 缓存键 qFlags：bit0 = 质量口径开关，bit1 = npm 渠道开关（v4 起口径入键，切换即时生效） */
function catIdxCacheLoad(qFlags, totalCount) {
  try {
    var c = JSON.parse(localStorage.getItem(CATIDX_CACHE_KEY) || 'null')
    if (!c || c.v !== CATIDX_RULES_VER || c.q !== qFlags || c.total !== totalCount) return null
    if (!Array.isArray(c.items) || !c.items.length || !c.counts || typeof c.builtAt !== 'number') return null
    if (Date.now() - c.builtAt > CATIDX_TTL_MS) return null
    return c
  } catch (e) { return null }
}

function catIdxCacheSave(c) {
  // 2026-10-11 顺序修正：zhmap 先写。浏览器 localStorage 配额按「同源共享」计（Chrome ~5MB/源，
  // catidx + zhmap + tx 同池），旧顺序先写 catidx 会把小而关键的 zhmap 挤出配额——
  // #42 快照实测（13721 条）：catidx 全量 6.12M chars / 降级后 5.24M chars，加 zhmap 0.66M
  // 合计 5.9M 必超 5.24M 配额 → zhmap 恒失败（0.9.16 反英文固化保障失效）。
  // 先写 zhmap：小而关键的数据优先占位；zhmap 本体 ~0.66M 单独入库无压力。
  try {
    if (c && Array.isArray(c.items)) {
      var zm = {}
      try { zm = JSON.parse(localStorage.getItem('dsh-plugin-cards.zhmap.v1') || '{}') || {} } catch (eZ0) { zm = {} }
      var zDirty = false
      for (var zi = 0; zi < c.items.length; zi++) {
        var zIt = c.items[zi]
        if (zIt && zIt.full_name && zIt.descZh && zm[zIt.full_name] !== zIt.descZh) { zm[zIt.full_name] = zIt.descZh; zDirty = true }
      }
      if (zDirty) localStorage.setItem('dsh-plugin-cards.zhmap.v1', JSON.stringify(zm))
    }
  } catch (eZ) { /* 容量超限静默：回填退化为 catidx 内映射 */ }
  // catidx 持久化：全量 → 降级（剥已译条目 EN desc，展示仍中文、搜索失去已译条目英文关键词）
  // → 仍超限则静默放弃（旧缓存原子性保留，TTL 过期自然重建）。
  // 1.4 万条口径下序列化 ~5.2-5.9M chars 必超 ~5MB 配额，放弃后的代价可控：
  // jsDelivr HTTP 缓存承接重拉 + 索引重建（Node 实测 13721 条全链路 ~230ms）；比反复降级更可预期。
  // 终解（预计算 cat/sub 标签替代 topics 入缓存）随 80 块拆分另行落地。
  try {
    localStorage.setItem(CATIDX_CACHE_KEY, JSON.stringify(c))
  } catch (eFull) {
    try {
      var slim = {}, k2
      for (k2 in c) slim[k2] = c[k2]
      slim.items = []
      var its = (c && c.items) || []
      for (var i2 = 0; i2 < its.length; i2++) {
        var it2 = its[i2]
        if (it2 && it2.descZh && it2.description) {
          var nb2 = {}, k3
          for (k3 in it2) nb2[k3] = it2[k3]
          nb2.description = ''
          slim.items.push(nb2)
        } else slim.items.push(it2)
      }
      localStorage.setItem(CATIDX_CACHE_KEY, JSON.stringify(slim))
    } catch (eSlim) { /* 放弃缓存：旧值原子保留，HTTP 缓存 + 重建兜底 */ }
  }
}

/** ---- 0.5.5 快照优先：dsh-plugin-hub 每日产出全量快照，1 次请求秒级就绪；失败/过期回退出厂快照/收割 ----
 * 快照 schema：{ version:1, builtAt:<ms>, quality:<bool>, total:<n>, items:[compactItem 字段] }。
 * ⚠️ CORS 实测（2026-09-25）：registry.npmmirror.com ✓（回显 Origin）；Gitee raw ✗（无 CORS 头，浏览器端
 * fetch 必被拦，仅宿主内/node 场景可用）；raw.githubusercontent.com 大陆不稳。默认候选保留 Gitee raw
 * 供非浏览器场景与未来部署（Gitee Pages/自建服务器加 CORS 头）使用；浏览器端推荐用 localStorage
 * 'dsh-plugin-cards.snapshotUrl' 覆盖为自建带 CORS 的源。出厂快照（FACTORY_SNAPSHOT）保证开箱秒级。
 * 安装不受影响：条目保留 full_name → specOf 产出 github:owner/repo → 宿主 clone + inspect 校验。 */
var CATIDX_SNAPSHOT_TTL_MS = 72 * 3600 * 1000 // 在线快照 72h 内视为新鲜，过期走出厂快照/收割
// 0.8.11 官方源同步：github.com/topics/dsh-plugin（经 Search API 转换）全量直采的最小间隔。
// 到期后开面板自动后台重采，确保目录不依赖 hub 快照构建节奏也能追平官方 topic；
// 手动「官方源同步」按钮可随时强制直采。
var OFFICIAL_SYNC_TTL_MS = 24 * 3600 * 1000
var OFFICIAL_SYNC_AT_KEY = 'dsh-plugin-cards.officialSyncAt'
var SNAPSHOT_URLS = [
  // 0.8.6：主分发通道切 jsDelivr（GitHub 源，实测大陆直连可达 + CORS *）。
  // 原 Gitee raw 通道废弃：Gitee raw 端点对 2.8MB 大文件恒 404（API contents 可见文件但 raw 拒绝），已实测确认。
  'https://cdn.jsdelivr.net/gh/yuanzukun/dsh-plugin-hub@master/public/cards-snapshot.json',
  // 0.8.7 R3：多 CDN 候选，主域故障时依次回退（三域实测均 200 可达；fastly/gcore 慢约 3~4s）。
  'https://fastly.jsdelivr.net/gh/yuanzukun/dsh-plugin-hub@master/public/cards-snapshot.json',
  'https://gcore.jsdelivr.net/gh/yuanzukun/dsh-plugin-hub@master/public/cards-snapshot.json',
]
/** 0.9.24 P2：hub tgz 镜像池基址（Zotero 中文社区模式——hub CI 预构建 github 独源插件 tarball
 * 入仓库 public/tgz/，随快照同走 jsDelivr 国内可达分发）。须定义在本块导出之前（var 赋值不提升）。 */
var TGZ_BASE = SNAPSHOT_URLS[0].replace('cards-snapshot.json', 'tgz/')
function snapshotUrlCandidates() {
  var urls = SNAPSHOT_URLS.slice()
  try {
    var ov = localStorage.getItem('dsh-plugin-cards.snapshotUrl') // 覆盖入口：测试/企业内网镜像
    if (ov && urls.indexOf(ov) === -1) urls.unshift(ov)
  } catch (e) { /* 隐私模式静默 */ }
  return urls
}
/** 校验快照并构建索引状态；不合法返回 null（调用方继续尝试下一候选/回退收割）。
 * maxAgeMs 传 null 跳过新鲜度检查（出厂快照任何年龄都比 6~8 分钟收割强）。
 * 1.1.0 来源口径收紧：includeNpm=false 时剔除 source==='npm' 条目——它们不在官方
 * topic 页（github.com/topics/dsh-plugin）；0.9.5 用户决策变更，默认改为 true（开）。
 * npm 渠道开关打开时才纳入（设置 Tab 开关）。分类计数在剔除后统计，保证徽章数与视图一致。
 * 1.2.0 L2 引擎兼容：engineOn=true（默认）时剔除 engineCompat===0（dsh.engine 与桌面端
 * 运行时不兼容，装上即坏）条目；null（未声明/未校验）保留，交宿主安装时终审。 */
function catIdxFromSnapshot(data, qualityOn, totalCount, maxAgeMs, includeNpm, engineOn) {
  if (!data || !Array.isArray(data.items) || data.items.length < 1000) return null
  if (typeof data.builtAt !== 'number') return null
  if (maxAgeMs !== null && Date.now() - data.builtAt > maxAgeMs) return null
  if (data.quality !== undefined && !!data.quality !== !!qualityOn) return null // 质量口径不符
  var items = []
  for (var i = 0; i < data.items.length; i++) {
    var raw = data.items[i]
    // v2 双源：GitHub 项身份是 full_name，npm-only 项身份是 npm 包名（647/6050），二者必有其一
    if (!raw || (!(typeof raw.full_name === 'string' && raw.full_name) && !(typeof raw.npm === 'string' && raw.npm))) return null
    if (!includeNpm && raw.source === 'npm') continue // 1.1.0：不在官方 topic 的 npm-only 条目默认隐藏
    if (engineOn && raw.engineCompat === 0) continue // 1.2.0：引擎不兼容条目默认隐藏
    items.push(compactItem(raw))
  }
  items = dedupItems(items) // 0.9.10 M2：同仓库多 npm 镜像条目收敛为一条（在计数与缓存写盘之前）
  if (items.length < 1000) return null // 剔除后过少视为口径异常（正常 both/github 占大头）
  items.sort(rankSort)
  var counts = {}
  for (var m = 0; m < items.length; m++) {
    var lab = classifyItem(items[m])
    counts[lab] = (counts[lab] || 0) + 1
  }
  catIdxCacheSave({ v: CATIDX_RULES_VER, q: (qualityOn ? 1 : 0) + (includeNpm ? 2 : 0) + (engineOn ? 4 : 0), total: totalCount, builtAt: data.builtAt, counts: counts, items: items })
  return { status: 'ready', done: items.length, total: totalCount, items: items, counts: counts, builtAt: data.builtAt, snapshot: true, factory: !maxAgeMs }
}

/** 官方标识（0.4.1）：deepseek-ai 组织下的 dsh-plugin 仓库挂「官方」徽章；数据仍来自同一 Search API。 */
var OFFICIAL_ORG = 'deepseek-ai'
function isOfficial(item) {
  var fn = String((item && (item.full_name || (item.owner && item.owner.login ? item.owner.login + '/' + item.name : item.name))) || '')
  return fn.toLowerCase().indexOf(OFFICIAL_ORG + '/') === 0
}

function isGithubSearchApi(url) {
  return String(url || '').indexOf('https://api.github.com/search/repositories') === 0
}

/** 从 Search API URL 提取 topic 名（模板里 q=topic:{t} 未编码，自建源可能编码）。 */
function topicOfSearchUrl(url) {
  var m = /[?&]q=topic%3A([^&]+)/.exec(url) || /[?&]q=topic:([^&]+)/.exec(url)
  return m ? decodeURIComponent(m[1]) : null
}

/** 构造 Search API 分页 URL；quality=开 时叠加质量限定符压缩 16k 噪音到真实插件量级。
 * 0.4.0：perPage（≤100）与 sort（stars / updated）由分页条与排序切换传入。
 * 0.5.4：bucket（{smin,smax,pmin,pmax}）用于全量统计分桶，普通分页不传。
 * 1.1.0：质量口径 ★>=3 → ★>=0（不限星数，完整覆盖官方 topic 页），保留近 12 月 + dsh 关键词。 */
function buildSearchUrl(topic, page, quality, perPage, sort, bucket) {
  var q = 'topic:' + topic
  // 同类型限定符在 GitHub Search API 中后者覆盖前者（不取交集）→ 星数/更新时间必须合并成单一区间
  var d = new Date()
  d.setMonth(d.getMonth() - 12)
  var qDate = quality ? d.toISOString().slice(0, 10) : null
  var smin = quality ? 0 : (bucket && bucket.smin != null ? bucket.smin : null)
  var smax = bucket && bucket.smax != null ? bucket.smax : null
  if (smin !== null && smin > 0 && smax !== null) q += ' stars:' + smin + '..' + smax
  else if (smin !== null && smin > 0) q += ' stars:>=' + smin
  else if (smax !== null) q += ' stars:<=' + smax
  var pmin = [qDate, bucket && bucket.pmin || null].filter(Boolean).sort().pop() // 取更晚（更严格）下界
  var pmax = bucket && bucket.pmax || null
  if (pmin && pmax) q += ' pushed:' + pmin + '..' + pmax
  else if (pmin) q += ' pushed:>=' + pmin
  else if (pmax) q += ' pushed:<' + pmax
  // 0.9.18：created 区间——pushed 天粒度无切点（同星数新仓潮全压最近 2 天）时的替代切分维度，
  // 与 pushed 属不同限定符类型可共存取交集
  var cmin = bucket && bucket.cmin || null
  var cmax = bucket && bucket.cmax || null
  if (cmin && cmax) q += ' created:' + cmin + '..' + cmax
  else if (cmin) q += ' created:>=' + cmin
  else if (cmax) q += ' created:<' + cmax
  if (quality) q += ' dsh in:name,description,topics'
  return 'https://api.github.com/search/repositories?q=' + encodeURIComponent(q) +
    '&sort=' + (sort === 'updated' ? 'updated' : 'stars') +
    '&order=desc&per_page=' + (perPage > 0 ? Math.min(perPage, 100) : 100) +
    '&page=' + (page > 0 ? page : 1)
}

/** ---- 描述中文翻译（0.3.1）：MyMemory 免 key 接口（大陆直连实测可用）+ localStorage 持久缓存，失败静默回退原文 ---- */
var TX_API = 'https://api.mymemory.translated.net/get?langpair=en|zh-CN&q='
var TX_CONCURRENCY = 4
var TX_CACHE_KEY = 'dsh-plugin-cards.tx'
var TX_MAX_LEN = 500
var TX_MM_BACKOFF_BASE = 10 * 60 * 1000 // 0.9.16：MyMemory 429 退避基数 10min（指数 ×2，6 次封顶 ~5.3h），替代会话永久停用
var TX_MM_BACKOFF_MAX_SHIFT = 5 // 2^0..2^5 → 10min/20/40/80/160/320min

function hashStr(s) {
  var h = 5381
  s = String(s)
  for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0
  return h.toString(36)
}
// 0.9.16：占位描述判定——描述=包名本身或纯 topic 连字符词（抓取回填产物）。不可译、不计数、不显示
// 0.9.17 扩展：dsh- 前缀差异（bubble-explain vs dsh-bubble-explain）、尾部标点（dsh-at-file.）、
// topic/命令 token 清单（"deepseek dsh dsh-plugin"、"video.generate-x, video.generate-y"）——非自然语言，LLM 无法有效翻译
function isPlaceholderDesc(d, name) {
  if (!d || /[\u4e00-\u9fff]/.test(d)) return false
  var t = String(d).trim()
  if (t === name || t === String(name || '').replace(/^dsh-/, '')) return true
  if (/^dsh(-[\w-]+)*[.\s]*$/.test(t)) return true
  var tokens = t.split(/[,;/|]+|\s+/)
  var tokenish = 0
  for (var i = 0; i < tokens.length; i++) {
    var tk = tokens[i].replace(/^[.\s]+|[.\s]+$/g, '')
    if (!tk) continue
    if (/^[a-z0-9]+([.\-_][a-z0-9]+)*$/.test(tk)) tokenish++
    else return false // 含大写开头/自然语言片段 → 交 LLM 翻译
  }
  return tokenish >= 2
}
function txCacheLoad() {
  try { return JSON.parse(localStorage.getItem(TX_CACHE_KEY) || '{}') } catch (e) { return {} }
}
function txCacheSave(m) {
  try { localStorage.setItem(TX_CACHE_KEY, JSON.stringify(m)) } catch (e) {}
}
/** 单条翻译；配额耗尽 reject('quota')，其余错误同样 reject（调用方据此决定是否停用本轮）。 */
function txOne(text) {
  return fetch(TX_API + encodeURIComponent(String(text).slice(0, TX_MAX_LEN)))
    .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('http ' + r.status)) })
    .then(function (d) {
      if (!d || d.quotaFinished) return Promise.reject(new Error('quota'))
      var t = d.responseData && d.responseData.translatedText
      if (typeof t !== 'string' || !t) return null
      // 配额/异常时该接口会把提示语当译文返回，识别后按配额处理
      if (t.indexOf('MYMEMORY WARNING') !== -1 || t.indexOf('QUERY LENGTH') !== -1 || t.indexOf('INVALID') === 0) {
        return Promise.reject(new Error('quota'))
      }
      return t
    })
}

/** ---- 0.3.3 LLM 翻译通道：OpenAI 兼容 /chat/completions，批量 JSON 进出；无 key 时回退 MyMemory ---- */

/** 端点规范化：base（…/ 或 …/v1）拼 /chat/completions；已是完整地址则透传。 */
function llmUrl(base) {
  var u = String(base || '').trim().replace(/\/+$/, '')
  if (!u) return ''
  if (/\/chat\/completions$/.test(u)) return u
  return u + '/chat/completions'
}

/** 批量翻译：pairs = {hash: 英文}；返回 Promise<{hash: 中文}>，失败 reject（调用方降级）。 */
function txBatchLLM(pairs, cfg, signal) {
  var body = {
    model: cfg.model,
    messages: [
      { role: 'system', content: '你是翻译引擎。输入是一个 JSON 对象，value 为英文插件/软件描述。把每个 value 翻译成简体中文：产品名、人名、代码、URL 保留不译，风格简洁自然。只输出一个 JSON 对象：key 原样保留，value 为译文，不要输出任何其他文字或代码块标记。' },
      { role: 'user', content: JSON.stringify(pairs) },
    ],
    temperature: 0.1,
    max_tokens: 4000,
    stream: false,
  }
  return fetch(llmUrl(cfg.endpoint), {
    method: 'POST',
    signal: signal,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + cfg.key },
    body: JSON.stringify(body),
  }).then(function (r) {
    if (!r.ok) return r.text().then(function (t) { return Promise.reject(new Error('llm http ' + r.status + ' ' + String(t).slice(0, 140))) })
    return r.json()
  }).then(function (d) {
    var text = d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content
    if (typeof text !== 'string' || !text) return Promise.reject(new Error('llm empty response'))
    var m = text.match(/\{[\s\S]*\}/)
    if (!m) return Promise.reject(new Error('llm no json in response'))
    var parsed
    try { parsed = JSON.parse(m[0]) } catch (e) { return Promise.reject(new Error('llm bad json: ' + e.message)) }
    var out = {}
    for (var k in parsed) {
      if (Object.prototype.hasOwnProperty.call(parsed, k) && typeof parsed[k] === 'string' && parsed[k].trim()) {
        out[k] = parsed[k].trim()
      }
    }
    return out
  })
}

/** 0.7.0：解包客户端 RPC 信封 { ok:true, value } | { ok:false, error:{code,message} }；非信封形态（直连）原样返回。
 *  ⚠️ 0.6.0 及以前所有 pm.* 调用未解包——inspect 结果被当信封读，status 恒 undefined，面板安装实际不可用（隐性 bug）。 */
function unwrapRpc(res) {
  if (res && typeof res === 'object' && 'ok' in res) {
    if (res.ok) return res.value
    var err = res.error || {}
    throw new Error((err.message || err.code) ? (err.message || err.code) : T('mk.rpcFailed'))
  }
  return res
}

/** 0.7.0：从 pnpm 构建授权报错中提取「包@tarball-url」构建键，供 installBundle approvedBuilds 授权重试。 */
function extractBuildKeys(text) {
  var keys = []
  var re = /[\w@][\w@./:-]*@https?:\/\/[^\s'"，。）)]+\.tar\.gz/g
  var m
  while ((m = re.exec(String(text))) !== null) { if (keys.indexOf(m[0]) === -1) keys.push(m[0]) }
  return keys
}

/** 0.7.0：宽松版本比较（主.次.补丁逐段数值比较，忽略 prerelease 后缀）；某段无法解析时按字符串比较兜底。 */
function cmpVersion(a, b) {
  if (!a && !b) return 0
  if (!a) return -1
  if (!b) return 1
  var pa = String(a).split('-')[0].split('.')
  var pb = String(b).split('-')[0].split('.')
  for (var i = 0; i < Math.max(pa.length, pb.length); i++) {
    var na = parseInt(pa[i], 10), nb = parseInt(pb[i], 10)
    if (isNaN(na) || isNaN(nb)) return String(a).localeCompare(String(b))
    if (na !== nb) return na - nb
  }
  return 0
}

/** 0.8.15：相对时间文案（「3 小时前」「2 天前」）。输入 ISO 字符串或 ms 时间戳；无效输入返回 ''。 */
function relTime(input, now) {
  var t = typeof input === 'number' ? input : Date.parse(input)
  if (!t || isNaN(t)) return ''
  var diff = (typeof now === 'number' ? now : Date.now()) - t
  if (diff < 0) diff = 0
  var MIN = 60000, HOUR = 3600000, DAY = 86400000
  if (diff < HOUR) { var m = Math.floor(diff / MIN); return m < 1 ? '刚刚' : m + ' 分钟前' }
  if (diff < DAY) return Math.floor(diff / HOUR) + ' 小时前'
  var dd = Math.floor(diff / DAY)
  if (dd < 30) return dd + ' 天前'
  if (dd < 365) return Math.floor(dd / 30) + ' 个月前'
  return Math.floor(dd / 365) + ' 年前'
}

/** 0.8.15：紧凑本地时间戳（「09-26 15:27」），用于工具栏数据同步时间展示。输入 ms 时间戳。 */
function fmtStamp(ms) {
  var d = new Date(ms)
  if (isNaN(d.getTime())) return ''
  var p = function (n) { return (n < 10 ? '0' : '') + n }
  return p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())
}

/** ---- 0.8.3 已装插件实时版本校验：npm 包直查 registry.npmmirror.com/latest，消除快照日级滞后 ----
 * 只对已装插件逐个查询（量小）；CORS 实测 npmmirror 可用（0.5.5 备注）；结果缓存 localStorage 1h；
 * 404/网络失败记 v:null（卡片回退快筛版本比较，行为同 0.8.2）。 */
var RTVER_CACHE_KEY = 'dsh-plugin-cards.rtver'
var RTVER_TTL_MS = 3600 * 1000
function rtverCacheLoad() {
  try { return JSON.parse(localStorage.getItem(RTVER_CACHE_KEY) || '{}') } catch (e) { return {} }
}
function rtverCacheSave(m) {
  try { localStorage.setItem(RTVER_CACHE_KEY, JSON.stringify(m)) } catch (e) { /* 容量超限静默 */ }
}
function fetchNpmLatest(name) {
  // 0.8.21：?t= cache-busting —— 防桌面端 webview HTTP 缓存 /latest 旧响应（npmmirror 忽略未知 query，CDN 缓存不受影响）
  return fetch('https://registry.npmmirror.com/' + encodeURIComponent(String(name)) + '/latest?t=' + Date.now(), {
    headers: { Accept: 'application/json' },
  })
    .then(function (r) { return r.ok ? r.json() : null })
    .then(function (d) { return d && typeof d.version === 'string' && d.version ? d.version : null })
    .catch(function () { return null })
}

/** ---- 0.8.16 rt 缓存分区：fresh（<10min，直接用）/ stale（10min~1h，先用 + 后台刷新）/ expired/missing（立即查）----
 * 解决「发新版后 1h 内缓存不更新」的滞后：stale 条目立即回显旧值，同时后台 revalidate 热更新界面。 */
var RTVER_FRESH_MS = 2 * 60 * 1000 // 0.8.21：10min → 2min，发新版后最坏 2min 即亮「有更新」
function rtverPartition(cache, bundles, now) {
  var seeded = {}, pending = [], revalidate = []
  for (var i = 0; i < bundles.length; i++) {
    var n = bundles[i] && bundles[i].installed && bundles[i].name
    if (!n) continue
    var c = cache[n]
    if (c && typeof c.at === 'number' && now - c.at < RTVER_TTL_MS) {
      seeded[n] = c
      if (now - c.at >= RTVER_FRESH_MS) revalidate.push(n)
      continue
    }
    pending.push(n)
  }
  return { seeded: seeded, pending: pending, revalidate: revalidate }
}

/** ---- Node 测试出口（2026-10-11 重构新增）----
 * 仅在「无 window、有 module」的独立装载场景生效（Node 单测 / 脚本经 new Function
 * 拼接装载 10-runtime.js + 本块 + 40-market-helpers.js 后由此取纯函数，40 块函数声明
 * 提升故在导出口可见）。浏览器组装包内 window 恒已定义，此块永不执行，零行为影响。 */
if (typeof window === 'undefined' && typeof module !== 'undefined' && module.exports) {
  module.exports = {
    catLabel: catLabel, tParams: tParams,
    specOf: specOf, shortSpecName: shortSpecName, parsePnpmCounts: parsePnpmCounts, fmtMMSS: fmtMMSS,
    classifyItem: classifyItem, subsOf: subsOf, classifySub: classifySub,
    catIdxFromSnapshot: catIdxFromSnapshot, // 2026-10-11：快照容量探针（scripts/verify-snapshot-capacity.cjs）需要全链路复现
    compactItem: compactItem, rankSort: rankSort, dedupItems: dedupItems,
    buildSearchUrl: buildSearchUrl, topicOfSearchUrl: topicOfSearchUrl, isGithubSearchApi: isGithubSearchApi,
    hashStr: hashStr, isPlaceholderDesc: isPlaceholderDesc, llmUrl: llmUrl,
    unwrapRpc: unwrapRpc, extractBuildKeys: extractBuildKeys, cmpVersion: cmpVersion,
    relTime: relTime, fmtStamp: fmtStamp, rtverPartition: rtverPartition,
    matchCat: matchCat, chipStyle: chipStyle, catChipStyle: catChipStyle, cliCmdFor: cliCmdFor, tabStyle: tabStyle,
    promoteActiveCat: promoteActiveCat, // 0.9.23：折叠态选中分类提位（40 块，声明提升可见）
    classifyNetError: classifyNetError, // 0.9.23：网络类预检错误分类（40 块，声明提升可见）
    netKeyFromChange: netKeyFromChange, // 0.9.24b：ChangeResult 失败 → 网络分类（40 块）
    fbPlanFor: fbPlanFor, TGZ_BASE: TGZ_BASE, // 0.9.24：网络失败降级梯计划（tgz 镜像 + codeload 端点）
    npmCandidateFromGithubSpec: npmCandidateFromGithubSpec, // 0.9.24：github spec → npm 降级候选（40 块）
    verifyNpmCandidate: verifyNpmCandidate, // 0.9.24：npm 候选校验/防投毒（40 块）
  }
}
