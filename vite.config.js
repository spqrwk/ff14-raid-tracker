import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// GitHub Pages 部署：将 base 改为你的仓库名
// 例如仓库名为 ff14-raid-tracker，则 base: '/ff14-raid-tracker/'
// 如果使用自定义域名，改为 base: '/'
export default defineConfig({
  base: '/ff14-raid-tracker/',
  plugins: [vue()],
  server: {
    port: 3000,
    open: true
  }
})
