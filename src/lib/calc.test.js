import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calcSettlement, calcSavings, settlementLabel, signedYen } from './calc.js'

const members = ['まっすー', 'はるぴょい', 'とんちゃん', 'ひで', 'ひろむ', 'まこ']

test('精算: 6名で平均往復額を割る', () => {
  const costs = { まっすー: 300, はるぴょい: 600, とんちゃん: 0, ひで: 900, ひろむ: 300, まこ: 0 }
  const { A, C, rows } = calcSettlement({ members, costs, studioCount: 2, adjustments: [] })
  // 往復合計 = (300+600+0+900+300+0)*2 = 4200 → ÷6 = 700
  assert.equal(A, 700)
  assert.equal(C, 1400)
  const hide = rows.find((r) => r.name === 'ひで')
  assert.equal(hide.B, 900 * 2 * 2) // 3600
  assert.equal(hide.S, 2200)
  const tonchan = rows.find((r) => r.name === 'とんちゃん')
  assert.equal(tonchan.S, -1400)
  // 全員の精算額の合計は 0
  assert.equal(rows.reduce((s, r) => s + r.S, 0), 0)
})

test('精算: 当日変更（欠席で往復分マイナス）が反映される', () => {
  const costs = { まっすー: 500, はるぴょい: 500, とんちゃん: 500, ひで: 500, ひろむ: 500, まこ: 500 }
  const adjustments = [{ member_name: 'まっすー', change_amount: -1000, month: '2026-11' }]
  const { rows } = calcSettlement({ members, costs, studioCount: 1, adjustments })
  assert.equal(rows.find((r) => r.name === 'まっすー').S, -1000)
  assert.equal(rows.find((r) => r.name === 'ひで').S, 0)
})

test('ラベル', () => {
  assert.equal(settlementLabel(10).text, 'バンドから受け取り')
  assert.equal(settlementLabel(-10).text, 'バンドへ支払い')
  assert.equal(settlementLabel(0.4).text, '±¥0')
  assert.equal(signedYen(-1200), '-¥1,200')
})

test('貯金: 自動計算は符号反転、手動は上書き', () => {
  const adjustments = [
    { month: '2026-10', change_amount: -1000 },
    { month: '2026-10', change_amount: 200 },
    { month: '2026-11', change_amount: -500 },
  ]
  const overrides = [{ month: '2026-11', amount: 3000, note: '差し入れ分' }]
  const { history, total } = calcSavings({ adjustments, overrides, studioMonths: ['2026-09'] })
  assert.deepEqual(history.map((h) => h.month), ['2026-11', '2026-10', '2026-09'])
  assert.equal(history[1].value, 800)
  assert.equal(history[0].auto, 500)
  assert.equal(history[0].value, 3000)
  assert.equal(history[2].value, 0)
  assert.equal(total, 3800)
})

test('カレンダーのコピー文（Base44と同じ形式）', async () => {
  const { formatEventsText } = await import('./pollInfo.js')
  const polls = [{ id: 'p', status: '確定', candidate_dates: ['2026-12-09', '2026-12-10'], decided_dates: ['2026-12-09'] }]
  const responses = [
    { poll_id: 'p', member_name: 'ひろむ', created_date: '1', responses: { '2026-12-09': 'ok' }, date_memos: {} },
    { poll_id: 'p', member_name: 'はるぴょい', created_date: '2', responses: { '2026-12-09': 'ng' }, date_memos: {} },
    { poll_id: 'p', member_name: 'まこ', created_date: '3', responses: { '2026-12-09': 'ok' }, date_memos: { '2026-12-09': '休み確定' } },
  ]
  const events = [{ date: '2026-12-09', start_time: '11:00', end_time: '15:00', location: '川崎', title: 'スタジオ練習' }]
  assert.equal(formatEventsText(events, polls, responses),
    '12/9(水) 11:00〜15:00 川崎 スタジオ練習\n  ○ひろむ\n  ×はるぴょい\n  ○まこ: 休み確定')
})
