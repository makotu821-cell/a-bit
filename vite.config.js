import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages では https://<user>.github.io/<repo>/ で配信されるため base を合わせる。
// 独自ドメインや Vercel 等で配信する場合は VITE_BASE=/ を指定する。
const BUILD_ID = String(Date.now())

export default defineConfig({
  plugins: [
    react(),
    // 公開中の版を知らせる version.json（アプリが開かれたときに比べて、新しければ読み直す）
    { name: 'a-bit-version', generateBundle() { this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ id: BUILD_ID }) }) } },
  ],
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  base: process.env.VITE_BASE || '/',
})
