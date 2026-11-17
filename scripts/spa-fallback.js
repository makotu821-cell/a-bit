// GitHub Pages で /calendar などに直接アクセスしても表示できるよう、
// index.html を 404.html としてコピーする。
import { copyFileSync } from 'node:fs'
copyFileSync('dist/index.html', 'dist/404.html')
