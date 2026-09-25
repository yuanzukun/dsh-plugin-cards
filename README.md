# dsh-plugin-cards

DeepSeek Harness (dsh) 插件：**设置卡片 + 对话节点**。

版本锚定：`dsh >= 0.1.7-rc.2`（上游最新，见 `docs/dsh-plugin-开发建议方案.md`）。

## 结构

```
├── package.json           # dsh.bundle manifest（组合包）
├── cordis.patch.yml       # 发布形态 patch（按包名引用）
├── cordis.dev.patch.yml   # 本地调试 patch（绝对路径，勿随包发布）
├── src/index.ts           # 插件入口
├── tsdown.config.ts       # 构建（esm → lib/）
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

## 安装进 profile（P3 形态）

```sh
dsh plugin --profile <name> add dsh-plugin-cards        # npm 发布后
dsh plugin --profile <name> add github:yuanzukun/dsh-plugin   # git 安装（prepare 自包含）
```

## 路线

- [x] P0 脚手架 + 加载验证（✅ 2026-09-25 于 dsh-v0.1.7-rc.2 源码宿主实测通过：`pnpm dsh web --patch cordis.dev.patch.yml` 输出 `[dsh-plugin-cards] plugin loaded!`）
- [x] P1 设置卡片（Schemastery Config，schemastery 3.18.4 打包自包含；配置覆盖 + 默认值补全已实测）
- [x] P2 对话节点（P2 v1：`cards-annotation` 节点监听 `user/message`，渲染于 chat 目标；客户端产物 `lib/client.js` 为手写闭包工厂格式，修改后跑 `node --check` 校验）
- [ ] P2 扩展：自定义 SessionEvent + 模型可见输入（所见即所记）
- [ ] P3 npm 发布
- [ ] P4 入驻 awesome-dsh-plugin + dsh-plugin-hub
