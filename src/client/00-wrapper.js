/*
 * dsh-plugin-cards —— 客户端入口（浏览器半区）
 *
 * 产物格式：闭包工厂（与官方 tsdown.client 预设一致的 wire 格式）：
 *   执行时调用 window.__ModuleLoader__.load({id, factory})，仅注册工厂；
 *   物化发生在首次 import/require，外部依赖经注入的 require 从模块表解析。
 * 源码真相源 = src/client/ 目录（按域分块，组装时按文件名序用 \n 连接）：
 *   00-wrapper   闭包工厂开头（本文件）
 *   10-runtime   react 接线 + locale 词典 + T（唯一真实词典处）
 *   20-node-ui   对话注记节点 + 设置卡片
 *   30-market-pure 市场纯逻辑（分类/缓存/快照源/搜索URL/翻译/版本比对；含 Node 测试出口）
 *   40-market-helpers 无状态分类/样式辅助（2026-10-11 自 createCommunitySection 外提）
 *   80-market-section createCommunitySection（市场 UI 主体，状态闭包部分；内部拆分待后续）
 *   99-apply     apply 注册 + module.exports + 出厂快照占位 + 闭包收尾
 * lib/client.js 是组装产物：scripts/assemble-client.cjs 按序连接各块，并把
 *   __FACTORY_SNAPSHOT__ 占位行替换为 assets/cards-snapshot.json 裁剪出的出厂快照。
 * 出厂快照：99-apply 里的 FACTORY_SNAPSHOT 行仅为 null 占位，真实数据构建期注入，
 *   裁剪参数见 assemble-client.cjs --keep/--npm-keep（0.9.8 M1 口径沿用）。
 */
window.__ModuleLoader__.load({ id: 'dsh-plugin-cards', factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
