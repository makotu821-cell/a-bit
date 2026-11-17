import { ANSWER_MARK } from './constants.js'
import { mdw, timeRange } from './utils.js'

/**
 * 指定日のアンケート情報（日程確定の備考・メンバーの○△×とコメント）
 * 対象: その日を候補日に含むアンケート（確定済みのものは確定日のみ）
 * メンバー行: その日に回答かコメントがある全員（回答した順）
 */
export function getDateInfo(date, polls, responses) {
  // 確定済みアンケートは確定日だけを対象にする（確定しなかった日には吹き出しを出さない）
  const related = polls.filter((p) => (p.candidate_dates || []).includes(date)
    && (p.status !== '確定' || (p.decided_dates || []).includes(date)))
  if (!related.length) return null
  const memo = related
    .filter((p) => (p.decided_dates || []).includes(date))
    .map((p) => p.decide_memo).filter(Boolean).join(' / ')
  const entries = []
  related.forEach((p) => {
    responses
      .filter((r) => r.poll_id === p.id)
      .sort((a, b) => (a.created_date || '').localeCompare(b.created_date || ''))
      .forEach((r) => {
        const ans = r.responses?.[date]
        const comment = (r.date_memos?.[date] || '').trim()
        if (ans || comment) entries.push({ member: r.member_name, mark: ANSWER_MARK[ans] || '', comment })
      })
  })
  if (!memo && !entries.length) return null
  return { memo, entries }
}

/** 「全部コピー」用のテキスト整形 */
export function formatEventsText(events, polls, responses) {
  return events
    .map((e) => {
      const head = [mdw(e.date), timeRange(e.start_time, e.end_time), e.location, e.title].filter(Boolean).join(' ')
      const lines = [head]
      const info = getDateInfo(e.date, polls, responses)
      const memo = [e.memo, info?.memo].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(' / ')
      if (memo) lines.push(`  備考: ${memo}`)
      info?.entries.forEach((x) => lines.push(`  ${x.mark}${x.member}${x.comment ? `: ${x.comment}` : ''}`))
      return lines.join('\n')
    })
    .join('\n\n')
}
