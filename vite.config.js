import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages では https://<user>.github.io/<repo>/ で配信されるため base を合わせる。
// 独自ドメインや Vercel 等で配信する場合は VITE_BASE=/ を指定する。
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE || '/',
})
