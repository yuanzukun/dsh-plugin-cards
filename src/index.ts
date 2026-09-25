import type { Context } from '@deepseek-ai/cordis'

export const name = 'dsh-plugin-cards'

/**
 * dsh-plugin-cards —— 设置卡片 + 对话节点
 *
 * P0：脚手架 + 加载验证（当前状态）
 * P1：设置卡片 —— 导出 interface Config + const Config: Schema<Config>（Schemastery），
 *     apply(ctx, config) 第二参数接收校验后配置；禁止硬编码可调参数
 * P2：对话节点 —— 注册 ConversationNodeDefinition + keyed renderer，
 *     渲染数据一律来自 session/event；新增模型可见输入必须新增 SessionEvent（所见即所记）
 */
export function apply(ctx: Context) {
  console.log('[dsh-plugin-cards] plugin loaded!')
}
