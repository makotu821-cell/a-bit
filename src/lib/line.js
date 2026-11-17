import { supabase, isDemo } from './supabase'
import { formatEventsText } from './pollInfo'

export const APP_URL = typeof window !== 'undefined' ? window.location.origin + import.meta.env.BASE_URL : ''

/** LINE の「送信先を選択」画面を開く URL（グループを選んで送るだけ） */
export const lineShareUrl = (text) => `https://line.me/R/share?text=${encodeURIComponent(text)}`

/** 日程確定のお知らせ文 */
export function decideMessage(poll, events, responses) {
  const body = formatEventsText(
    [...events].sort((a, b) => a.date.localeCompare(b.date)),
    [poll],
    responses.filter((r) => r.poll_id === poll.id),
  )
  return `📅 スタジオ日程が確定しました\n（${poll.title}）\n\n${body}\n\n${APP_URL}`
}

/**
 * LINE グループへ自動送信（Edge Function「line-notify」）。
 * 未設定・失敗時は { ok:false } を返すので、呼び出し側で共有ボタンにフォールバックする。
 */
export async function notifyLine(text) {
  if (isDemo || !supabase) return { ok: false, reason: 'demo' }
  try {
    const { data, error } = await supabase.functions.invoke('line-notify', { body: { text } })
    if (error) return { ok: false, reason: 'not_deployed' }
    return data || { ok: false }
  } catch {
    return { ok: false, reason: 'error' }
  }
}
