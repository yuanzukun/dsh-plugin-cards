import { defineConfig } from 'tsdown'

// 参考 turtle-ui（官方 git 安装示例）：直接转译 src/，不做类型检查、不用项目引用，
// 保证 git 安装场景下 prepare 脚本自包含可构建。
export default defineConfig({
  entry: ['src/index.ts'],
  format: 'esm',
  outDir: 'lib',
  platform: 'node',
  dts: false,
  // 关键：lib/client.js 是手写客户端产物（闭包工厂格式，见仓库根该文件头注），
  // 不在 tsdown entry 内；clean 开着会把它在每次构建时删掉，导致发布的包缺客户端（0.2.0 踩坑）。
  clean: false,
})
