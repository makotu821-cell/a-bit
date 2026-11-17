// 仕様書 05「計算ロジック」の実装（UI から切り離してテスト可能にしている）

/**
 * 交通費精算
 * A    = Σ(f(i) × 2) ÷ メンバー数
 * C    = A × N
 * B(i) = f(i) × 2 × N + Σ(当月の change_amount(i))
 * S(i) = B(i) − C
 */
export function calcSettlement({ members, costs, studioCount, adjustments }) {
  const n = members.length || 1
  const f = (name) => Number(costs[name] || 0)
  const A = members.reduce((s, m) => s + f(m) * 2, 0) / n
  const C = A * studioCount
  const rows = members.map((name) => {
    const adjTotal = adjustments
      .filter((a) => a.member_name === name)
      .reduce((s, a) => s + Number(a.change_amount || 0), 0)
    const base = f(name) * 2 * studioCount
    const B = base + adjTotal
    const S = B - C
    return { name, oneWay: f(name), base, adjTotal, B, S, display: Math.round(S) }
  })
  return { A, C, rows }
}

export function settlementLabel(s) {
  const r = Math.round(s)
  if (r > 0) return { text: 'バンドから受け取り', tone: 'pos' }
  if (r < 0) return { text: 'バンドへ支払い', tone: 'neg' }
  return { text: '±¥0', tone: 'zero' }
}

/**
 * バンド貯金
 * D_auto(m)   = −Σ(当月mの change_amount)
 * D_manual(m) = BandSavingsAdjustment.amount（登録がある場合）
 * D(m)        = D_manual があれば D_manual、なければ D_auto
 * 累計        = Σ D(m)（対象月 = 交通費変更またはスタジオ予定が存在する月）
 */
export function calcSavings({ adjustments, overrides, studioMonths }) {
  const months = new Set([...studioMonths, ...adjustments.map((a) => a.month)])
  overrides.forEach((o) => {
    if (o.amount !== null && o.amount !== undefined) months.add(o.month)
  })
  const history = [...months].sort().reverse().map((month) => {
    const auto = -adjustments
      .filter((a) => a.month === month)
      .reduce((s, a) => s + Number(a.change_amount || 0), 0)
    const ov = overrides.find((o) => o.month === month && o.amount !== null && o.amount !== undefined)
    return {
      month,
      auto: auto === 0 ? 0 : auto,
      manual: ov ? Number(ov.amount) : null,
      note: ov?.note || '',
      value: ov ? Number(ov.amount) : auto === 0 ? 0 : auto,
    }
  })
  const total = history.reduce((s, h) => s + h.value, 0)
  return { history, total }
}

export const yen = (v) => {
  const r = Math.round(Number(v) || 0)
  return `${r < 0 ? '-' : ''}¥${Math.abs(r).toLocaleString('ja-JP')}`
}
export const signedYen = (v) => {
  const r = Math.round(Number(v) || 0)
  return `${r > 0 ? '+' : r < 0 ? '-' : '±'}¥${Math.abs(r).toLocaleString('ja-JP')}`
}
