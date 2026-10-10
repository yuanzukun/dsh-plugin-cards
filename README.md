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
├── scripts/               # 工具脚本：inject-snapshot.cjs 出厂快照注入 + simulate-client-apply.cjs 客户端冒烟（CI 门禁）+ fetch-all-dsh.cjs 官方源收割复算等
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

> 命令行备选（CI / 无头环境）：
> ```sh
> dsh plugin --profile desktop add dsh-plugin-cards    # 桌面端固定用 desktop profile
> dsh plugin --profile <name>  add dsh-plugin-cards    # 其他 profile（web 等）
> ```
>
> - ✅ **dsh 0.2.0+**：桌面端菜单栏「Manage dsh command」可内置 dsh 命令并管理插件，**无需另装 Node / pnpm**（官方 0.2.0-rc.2 起）；`dsh` 已在 PATH 时 CLI 与桌面端默认都用 `~/.dsh`，装完重启桌面端生效
> - ⚠️ 以下为 **0.1.x 旧版用户**备注：`dsh` 命令需在 deepseek-harness 源码 checkout 根目录执行 `pnpm dsh plugin ...`（本机无全局 dsh）；必须用与桌面端一致的 pnpm（v12），旧 pnpm 重建 modules 会假成功；若 npm 装到偏旧版本，多为 pnpm metadata 缓存陈旧，删除 `%LOCALAPPDATA%/pnpm-cache/v11/metadata/registry.npmjs.org/dsh-plugin-cards.jsonl` 后重试

## 发布（tag 流水线）

```sh
# ① bump package.json 版本 → commit → push main
# ② 打 tag 推送，其余全自动（版本门禁 → build → 语法检查 → lib 漂移守卫 → npm publish → npmmirror sync → GitHub Release）
git push origin main && git tag v0.9.4 && git push origin v0.9.4
```

前置：仓库 Secret `NPM_TOKEN`（granular token，勾选 Bypass 2FA for API and CI）。✅ 2026-09-26 已配置并跑通（v0.8.16 起全自动发布）。

## 内置插件市场的数据口径

市场目录**唯一来源**为官方社区仓库 [github.com/topics/dsh-plugin](https://github.com/topics/dsh-plugin)：

- 发现条件：`topic:dsh-plugin` + 近 12 个月有更新 + 名称/描述/标签含 `dsh`（★ 不限，完整覆盖官方 topic 页）
- 分层合规：L1 声明 `dsh.bundle` 才可安装（宿主硬门禁）→ L2 `dsh.engine` 与桌面端 0.2.0-rc.2 semver 兼容（不兼容默认隐藏）→ L3 展示规范三件套（icon/locale/package.json exports）计 0-3 分仅作排序
- 目录按 GitHub 仓库身份（`full_name`）去重（0.9.10）：同一仓库被多个 npm 镜像/抢注包回挂时收敛为一条（npm-only 条目按包名天然唯一）；保留优先级 可安装 > npm 名与仓库名一致 > 展示合规分 > 星数 > 来源 both>github>npm
- 描述中文优先级（0.9.10）：快照自带 `description_zh`（hub 侧 LLM 预翻译，就绪后离线也全中文）> 运行时翻译（LLM 批量 → MyMemory 兜底）> 原文
- 二级分类（0.9.11）：六个大类（智能体与技能/界面与桌面/记忆与知识/工具与自动化/框架与宿主集成/模型与多模态）选中后浮出子类 chips 行，与父类 AND 过滤、精确计数；分类兜底阶段 `dsh-`/`dsh_` 名称前缀归入框架与宿主集成，「其他」长尾实测 682 → 56 条
- npm 渠道仅作富化（版本/可安装性），不在官方 topic 页的纯 npm 条目默认显示（0.9.5 起默认开，可关回官方 topic 纯口径）；宿主本体仓不借星
- 安装/更新/启停/卸载的生效语义对齐官方：宿主无 HMR 时返回 `restart-required`，界面明确提示「下次启动 DeepSeek Harness 后加载」（桌面端安装后需重启宿主生效，刷新页面无效）
- 数据通道：hub 每日 02:30/14:30 快照（jsDelivr）+ 面板常驻每 30 分钟静默检查 +「官方源同步」实时全量直采兜底；发版时内联出厂快照作离线首屏（**0.9.8 起按星裁剪：GitHub/both Top 1500 + npm-only 可安装 100，约 0.8MB；完整目录打开市场后由在线链路自动补齐**，裁剪参数见 `scripts/inject-snapshot.cjs --keep/--npm-keep`）
- 界面文案只显示中文（EN 词典引用 ZH，完整走官方 locale 服务）

## License

[MIT](./LICENSE) © yuanzukun
