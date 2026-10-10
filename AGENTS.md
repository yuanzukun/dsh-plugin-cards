# dsh-plugin 项目规则

本文件是项目级规则，适用于 WorkBuddy / Codex / Trae 等所有在用工具（按全局规则体系，优先于全局层）。

## Git 纪律（最高优先级，2026-10-10 用户两次强调）

- **严禁未经用户指令的任何 git 操作**：commit、打 tag、push 一律不许。
- 改完码 / 验证完之后，只报告改动清单（`git status` + diff 摘要），工作区保持原样。
- 用户指令的边界必须严格遵守：例如「推送」只授权 push 本身，**不授权**打 tag、触发发布等衍生操作。
- tag 必须**逐个 push**（2026-10-10 实测：单次 push 超过 3 个 tag 会丢失 GitHub Actions 触发事件，release 流水线零运行）。

## 验证与预览约定（2026-10-10）

- 真机验证**不要产出截图 png 文件**：不用 playwright screenshot 落盘。验证用 snapshot / DOM 断言，结果通过保持 dev server 连接 + 刷新让用户在线查看（`dsh web` → 内置浏览器预览）。
- 历史遗留的 market-0.9.12/13/14 png 不主动删除。

## 文档同步约定（2026-09-30）

- 每次发版 / 修 bug / 落地功能后，同步更新 **README.md**（口径与安装）与 **docs/dsh-plugin-开发建议方案.md**（立项史与版本状态），不允许代码先行文档滞后。
- 单一真相源 + 指针：正文不复制，过时内容就地标注（✏️）并指向新真相源，防双层漂移。

## 分发渠道约定（2026-09-30）

- 插件获取途径唯一：`https://github.com/topics/dsh-plugin`（官方社区 topic 页）。
- 不向任何第三方策展站/聚合站提交收录；仓库保持 `dsh-plugin` topic 标签。
- 官方桌面端内置市场（聚合 npm 数据）属官方体系，不在此列。

## 环境与构建

- 本地开发循环：改码 → `pnpm build` → `dsh plugin --profile web add <本地路径>` → 重启 `dsh web` → 浏览器 DevTools。
- 官方 CLI 必须用 `@deepseek-ai/dsh`（npm 裸名 `dsh` 是无关 JS shell）；desktop profile 被 CLI 拒绝，调试用 web profile。
- Node/Python 用 WorkBuddy managed 版本（隔离目录），不污染全局环境。

## 关键坑位

- PowerShell 5.1 `Out-File -Encoding utf8` 附带 UTF-8 BOM（strip-bom 工具已部署）；写文件优先用编辑工具而非 shell 重定向。
- 批量替换脚本失败时若不写盘会整轮回滚：「部分成功也要写盘 + 报告失败清单」。
- grep 中文用 `grep -P "[\x{4e00}-\x{9fff}]"`；bash 控制台中文乱码是 GBK 显示问题，文件本身 UTF-8 无损。
