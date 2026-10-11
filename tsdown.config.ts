import { defineConfig } from 'tsdown'

// 参考 turtle-ui（官方 git 安装示例）：直接转译 src/，不做类型检查、不用项目引用，
// 保证 git 安装场景下 prepare 脚本自包含可构建。
// 客户端 lib/client.js 不在本 entry（tsdown 只产出 index.js）；它由 scripts/assemble-client.cjs
// 在 build 后从 src/client.js 组装（含出厂快照注入）。clean 可安全开启——assemble 在
// tsdown 清空 lib/ 之后重建 client.js（旧方案 clean:false 是因为 client.js 当时既是产物又是源）。
export default defineConfig({
  entry: ['src/index.ts'],
  format: 'esm',
  outDir: 'lib',
  platform: 'node',
  dts: false,
  clean: true,
})
