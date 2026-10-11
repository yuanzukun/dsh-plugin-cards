function apply(ctx) {
  // ---- locale 双语化（官方 ui-plugin-manager 同款：effect 注册词典 + bind 稳定 translator）----
  // getSnapshot/subscribe 接进 LOCALE_GET/SUB 供 useLocaleTick 驱动语言切换重渲染；
  // ctx.locale 缺失（极旧宿主）时 T 维持 ZH 回退，功能不劣化。
  if (ctx.locale && typeof ctx.locale.register === 'function') {
    ctx.effect(function () {
      return ctx.locale.register(LOC_NS, { zh: ZH, en: EN })
    }, 'dsh-plugin-cards: dictionaries')
    T = ctx.locale.bind(LOC_NS)
    LOCALE_GET = function () { return ctx.locale.getSnapshot().revision }
    LOCALE_SUB = function (cb) { return ctx.locale.subscribe(cb) }
  }
  ctx.uiConversation.events.register(definition)
  ctx.slots.inject('conversation.chat.node', function () {
    return ctx.slots.register(
      { name: 'conversation.chat.node', key: CARDS_KIND, locale: LOC_NS },
      CardsNodeView,
    )
  })
  // 设置卡片：bundle 详情页在 Host 服务本插件 namespace 期间渲染配置表单
  //（服务端导出的 Config schema 自动成为 settings namespace，ns = entry id = 包名）。
  if (ctx.configForms) {
    var form = ctx.configForms.get(PKG_NAME)
    ctx.effect(function () {
      return ctx.configForms.whileServed([PKG_NAME], function () {
        return ctx.slots.inject('plugins.bundle.config', function () {
          return ctx.slots.register(
            { name: 'plugins.bundle.config', key: PKG_NAME, locale: LOC_NS },
            createConfigCardView(form),
          )
        })
      })
    }, 'dsh-plugin-cards: bundle config page')
    // 社区插件市场：settings.section 槽位 = 设置侧边栏条目（order 30，排在 Agent 预设之后）。
    if (ctx.remote && ctx.remote.pluginManager) {
      ctx.effect(function () {
        return ctx.slots.inject('settings.section', function () {
          return ctx.slots.register(
            {
              name: 'settings.section',
              id: 'dsh-plugin-community',
              order: 30,
              label: function () { return T('mk.section') },
              locale: LOC_NS,
            },
            createCommunitySection(ctx, form),
          )
        })
      }, 'dsh-plugin-cards: community section')
    }
  }
}

exports.name = 'dsh-plugin-cards'
exports.inject = ['uiConversation', 'slots', 'configForms', 'remote', 'remote.pluginManager', 'locale']
exports.apply = apply

/* ---- 0.5.5 出厂快照（由 scripts/inject-snapshot.cjs 从 assets/cards-snapshot.json 生成，勿手改）：
   内联进包保证开箱秒级就绪、免外部托管；每个大版本/快照刷新时重新注入。 ---- */
var FACTORY_SNAPSHOT = null /*__FACTORY_SNAPSHOT__*/

return module.exports; } });
