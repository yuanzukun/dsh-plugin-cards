# dsh-plugin-cards

DeepSeek Harness (dsh) 插件：**设置卡片 + 对话节点 + 插件市场**（社区插件发现 / 安装 / 管理）。

版本锚定：`dsh >= 0.1.7-rc.2`（上游最新，见 `docs/dsh-plugin-开发建议方案.md`）。

## 结构

```
├── package.json           # dsh.bundle manifest（组合包）
├── cordis.patch.yml       # 发布形态 patch（按包名引用）
├── cordis.dev.patch.yml   # 本地调试 patch（绝对路径，勿随包发布）
├── src/index.ts           # 插件入口（tsdown 只编译此文件 → lib/index.js）
├── lib/                   # lib/index.js（编译产物）+ lib/client.js（手写客户端，勿手改 tsdown 配置外清理）
├── assets/                # cards-snapshot.json 快照原料（inject-snapshot 注入进 client.js 成出厂快照）
├── scripts/               # verify-*.cjs 版本验证脚本 + inject-snapshot.cjs 注入工具
├── .github/workflows/     # release.yml：tag 触发的全自动发布流水线
├── tsdown.config.ts       # 构建（esm → lib/，clean:false 保护手写 client.js）
└── docs/                  # 开发建议方案
```

## 本地调试（P0）

```sh
pnpm install
pnpm build
# 在 deepseek-harness 源码 checkout 根目录执行：
pnpm dsh web --patch D:/导航/dsh-plugin/cordis.dev.patch.yml
# 验证配置树：
pnpm dsh --profile web --dump-config   # 应出现 "# == dsh-plugin-cards" 层
```

启动后终端应打印 `[dsh-plugin-cards] plugin loaded!`，UI 在 `http://127.0.0.1:3080`。

## 其他人的安装方式（最终形态：桌面端）

普通用户不需要命令行，全程在桌面端 UI 完成：

1. 打开 DSH 桌面端（DSH Desktop / `dsh web` 面板）
2. 进入 **设置 → 插件 → 插件市场**
3. 搜索 `dsh-plugin-cards` → 点击 **安装**
   （市场目录来自官方社区仓库 [github.com/topics/dsh-plugin](https://github.com/topics/dsh-plugin)，本插件已收录；新插件最迟次日快照自动收录，缓存 miss 时静默收割约 6 分钟内可达）
4. 安装后自动启用：**设置卡片**出现在插件详情页内，**对话节点**渲染于 chat 目标

更新同样在市场内完成：已安装插件有新版本时卡片显示「有更新」，一键升级。

> 命令行备选（CI / 无头环境 / 桌面端管理员）：
> ```sh
> dsh plugin --profile desktop add dsh-plugin-cards    # 桌面端固定用 desktop profile
> dsh plugin --profile <name>  add dsh-plugin-cards    # 其他 profile（web 等）
> ```
>
> 桌面端命令安装要点：
> - Home 不用设置：CLI 与桌面端默认都用 `~/.dsh`（即 `C:\Users\<你>\.dsh`），`dsh plugin add` 直接写进 `~/.dsh/profiles/desktop`，装完**重启桌面端**生效
> - `dsh` 命令来源：deepseek-harness 源码 checkout 根目录执行 `pnpm dsh plugin ...`（本机无全局 dsh）
> - ⚠️ 必须用与桌面端一致的 pnpm（v12），旧 pnpm 重建 modules 会假成功
> - ⚠️ 若 npm 装到的版本偏旧，多为 pnpm metadata 缓存陈旧，删除 `%LOCALAPPDATA%/pnpm-cache/v11/metadata/registry.npmjs.org/dsh-plugin-cards.jsonl` 后重试

## 路线

- [x] P0 脚手架 + 加载验证（✅ 2026-09-25 于 dsh-v0.1.7-rc.2 源码宿主实测通过：`pnpm dsh web --patch cordis.dev.patch.yml` 输出 `[dsh-plugin-cards] plugin loaded!`）
- [x] P1 设置卡片（Schemastery Config，schemastery 3.18.4 打包自包含；配置覆盖 + 默认值补全已实测）
- [x] P2 对话节点（P2 v1：`cards-annotation` 节点监听 `user/message`，渲染于 chat 目标；客户端产物 `lib/client.js` 为手写闭包工厂格式，修改后跑 `node --check` 校验）
- [x] P3 打包发布（✅ 2026-09-25 **已发布 npm：[dsh-plugin-cards](https://www.npmjs.com/package/dsh-plugin-cards)**。tarball 安装 + registry 真实安装双路径实测，端到端（安装→启动→加载→客户端 boot graph）全通。npm 发布要求 granular token 勾选 "Bypass two-factor authentication for API and CI"。✅ 2026-09-26 已同步发布 **GitHub：[yuanzukun/dsh-plugin-cards](https://github.com/yuanzukun/dsh-plugin-cards)**（public，topic `dsh-plugin` 等 6 个已挂载），并被官方社区目录（topic + npm keywords 双源）收录，市场可搜可装，CLI 实测干净环境装到最新版）
- [x] **0.1.1 设置卡片修复**：0.1.7 Web UI 的第三方 bundle 配置**不进设置侧边栏**，必须由客户端注册 `plugins.bundle.config` 槽位（keyed by 包名），渲染在「插件页 → dsh-plugin-cards 详情页」内；表单数据走 `ctx.configForms.get(包名)`（服务端导出的 Config schema 自动成为 settings namespace，ns = patch entry id）。官方范例 ui-settings-web-search。
- [ ] P2 扩展：自定义 SessionEvent + 模型可见输入（所见即所记）
- [x] 入驻 dsh-plugin-hub（✅ 已被市场快照收录，topic + npm 双源命中，`source: both`）
- [ ] P4 入驻 awesome-dsh-plugin

## 发布（tag 流水线）

```sh
# ① bump package.json 版本 → commit → push main
# ② 打 tag 推送，其余全自动（版本门禁 → build → 语法检查 → lib 漂移守卫 → npm publish → npmmirror sync → GitHub Release）
git push origin main && git tag v0.8.17 && git push origin v0.8.17
```

前置：仓库 Secret `NPM_TOKEN`（granular token，勾选 Bypass 2FA for API and CI）。✅ 2026-09-26 已配置并跑通（v0.8.16 起全自动发布）。

## License

[MIT](./LICENSE) © yuanzukun
