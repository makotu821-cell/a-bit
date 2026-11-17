// ホーム画面に追加したアプリは開きっぱなしになりやすいので、
// 画面に戻ってきたときに公開中の版を確認し、新しければ自動で読み直す。
/* global __BUILD_ID__ */
const BUILD = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev'
let checking = false

async function check() {
  if (checking || import.meta.env.DEV) return
  checking = true
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: 'no-store' })
    if (res.ok) {
      const { id } = await res.json()
      // 同じ版への読み直しは1回だけ（キャッシュで古い画面が返っても無限に読み直さない）
      if (id && id !== BUILD && sessionStorage.getItem('a-bit-reloaded') !== id) {
        sessionStorage.setItem('a-bit-reloaded', id)
        const url = new URL(location.href)
        url.searchParams.set('v', id) // URL を変えてキャッシュを避ける
        location.replace(url.toString())
      }
    }
  } catch { /* オフライン等は無視 */ } finally { checking = false }
}

export function startAutoUpdate() {
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check() })
  window.addEventListener('focus', check)
  setInterval(check, 10 * 60 * 1000)
  check()
}
