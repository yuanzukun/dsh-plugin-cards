import { defineConfig } from 'tsdown'

// 参考 turtle-ui（官方 git 安装示例）：直接转译 src/，不做类型检查、不用项目引用，
// 保证 git 安装场景下 prepare 脚本自包含可构建。
export default defineConfig({
  entry: ['src/index.ts'],
  format: 'esm',
  outDir: 'lib',
  platform: 'node',
  dts: false,
})
