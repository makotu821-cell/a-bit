import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isConfigured = Boolean(url && key)

// ?demo を付けて開くと、Supabase なしでブラウザ内に保存するデモモードになる
export const isDemo = (() => {
  if (typeof window === 'undefined') return false
  if (new URLSearchParams(window.location.search).has('demo')) sessionStorage.setItem('a-bit-demo', '1')
  return !isConfigured && sessionStorage.getItem('a-bit-demo') === '1'
})()

export const supabase = isConfigured
  ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } })
  : null

export const BUCKET = 'song-files'
