import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'

export const name = 'dsh-plugin-cards'

/**
 * dsh-plugin-cards —— 设置卡片 + 对话节点
 *
 * P1：设置卡片 —— 导出 Config schema（下方），Web UI 插件管理页据此渲染配置表单；
 *     配置变更触发 HMR：旧实例卸载（注册自动清理）、新实例加载。
 * P2：对话节点 —— 注册 ConversationNodeDefinition + keyed renderer，
 *     渲染数据一律来自 session/event；新增模型可见输入必须新增 SessionEvent（所见即所记）。
 */

export interface Config {
  /** 是否启用设置卡片与对话节点 */
  enabled: boolean
  /** 卡片/节点标题 */
  cardTitle: string
  /** 对话节点最多渲染的最近事件条数 */
  maxRecentEvents: number
  /** 展示密度 */
  density: 'compact' | 'detailed'
  /** 社区插件目录数据源（返回 GitHub topics API 同构 JSON：items[].full_name/description/stargazers_count/updated_at/html_url） */
  catalogUrl: string
  /** LLM 翻译端点（OpenAI 兼容 base，如 https://api.deepseek.com/v1）；空 = 不用 LLM，回退 MyMemory */
  llmEndpoint: string
  /** LLM 翻译模型名 */
  llmModel: string
  /** LLM 翻译 API Key（浏览器本地使用，不回传任何服务器） */
  llmApiKey: string
}

// 约定：凡部署间可能不同的值一律成为配置字段，禁止硬编码；约束在 schema 表达，加载期响亮失败。
export const Config: Schema<Config> = Schema.object({
  enabled: Schema.boolean().default(true).description('是否启用设置卡片与对话节点'),
  cardTitle: Schema.string().default('Plugin Cards').description('卡片 / 对话节点标题'),
  maxRecentEvents: Schema.number().min(1).max(200).default(20).description('对话节点最多渲染的最近事件条数'),
  density: Schema.union(['compact', 'detailed'] as const).default('compact').description('展示密度'),
  catalogUrl: Schema.string().default('https://github.com/topics/dsh-plugin')
    .description('社区插件目录源：GitHub topics 页面地址（自动转 Search API）或 API 端点')
    .volatile(),
  llmEndpoint: Schema.string().default('https://api.deepseek.com/v1')
    .description('描述翻译用的 OpenAI 兼容端点 base（如 https://api.agnes-ai.cn/v1）；留空则用 MyMemory 免费通道')
    .volatile(),
  llmModel: Schema.string().default('deepseek-chat').description('翻译模型名（与端点配套）').volatile(),
  llmApiKey: Schema.string().default('').description('翻译 API Key（仅浏览器直连翻译端点使用，缓存于本机）').volatile(),
})

/** volatile 字段在运行期是 Reference 对象；日志里安全解包为普通值。 */
function show(v: unknown): string {
  if (v !== null && typeof v === 'object' && 'get' in (v as object)) {
    try { return JSON.stringify((v as { get(): unknown }).get()) } catch { return '<ref>' }
  }
  return JSON.stringify(v)
}

export function apply(ctx: Context, config: Config) {
  console.log(
    `[dsh-plugin-cards] plugin loaded! (enabled=${config.enabled}, cardTitle="${config.cardTitle}", `
      + `maxRecentEvents=${config.maxRecentEvents}, density=${config.density}, `
      + `llmEndpoint=${show(config.llmEndpoint)}, llmModel=${show(config.llmModel)}, `
      + `llmKeySet=${typeof config.llmApiKey === 'string' ? config.llmApiKey.length > 0 : Boolean(config.llmApiKey)})`,
  )
}
