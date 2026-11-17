import { format, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'

export const cn = (...a) => a.filter(Boolean).join(' ')

export const ymd = (d) => format(d, 'yyyy-MM-dd')
export const ym = (d) => format(d, 'yyyy-MM')
export const fmt = (s, pattern) => format(typeof s === 'string' ? parseISO(s) : s, pattern, { locale: ja })

// "11/8(土)"
export const mdw = (s) => fmt(s, 'M/d(E)')

export const timeRange = (start, end) => {
  if (start && end) return `${start}〜${end}`
  if (start) return `${start}〜`
  if (end) return `〜${end}`
  return ''
}

// 30分刻みの時刻リスト
export const HALF_HOURS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, '0')
  return `${h}:${i % 2 ? '30' : '00'}`
})

export function formatBytes(n) {
  if (n === null || n === undefined) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`
  return `${(n / 1024 ** 3).toFixed(2)} GB`
}
