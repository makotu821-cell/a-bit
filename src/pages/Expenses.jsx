import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { addMonths, format, parseISO, startOfMonth, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, Settings2, ChevronDown, Plus, Trash2, PiggyBank, Guitar, Pencil } from 'lucide-react'
import { PageHeader } from '../components/Layout'
import { Button, Card, Field, Input, Modal, Select, Skeleton } from '../components/ui'
import { db, useAction, useEvents, useExpenseAdjustments, useMembers, useSavingsAdjustments } from '../lib/api'
import { COLORS, MEMBERS, MEMBER_COLORS } from '../lib/constants'
import { calcSavings, calcSettlement, settlementLabel, signedYen, yen } from '../lib/calc'
import { cn, mdw } from '../lib/utils'

export default function Expenses() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const monthKey = format(month, 'yyyy-MM')
  const { data: members = [], isLoading: lm } = useMembers()
  const { data: events = [], isLoading: le } = useEvents()
  const { data: adjustments = [] } = useExpenseAdjustments()
  const { data: overrides = [] } = useSavingsAdjustments()
  const [editingCosts, setEditingCosts] = useState(false)

  const costs = useMemo(() => Object.fromEntries(members.map((m) => [m.name, m.transport_cost || 0])), [members])
  const studios = useMemo(() => events.filter((e) => e.type === 'スタジオ' && e.date.startsWith(monthKey)).sort((a, b) => a.date.localeCompare(b.date)), [events, monthKey])
  const monthAdj = useMemo(() => adjustments.filter((a) => a.month === monthKey && MEMBERS.includes(a.member_name)), [adjustments, monthKey])

  const { A, C, rows } = useMemo(() => calcSettlement({ members: MEMBERS, costs, studioCount: studios.length, adjustments: monthAdj }), [costs, studios, monthAdj])

  const savings = useMemo(() => calcSavings({
    adjustments,
    overrides,
    studioMonths: [...new Set(events.filter((e) => e.type === 'スタジオ').map((e) => e.date.slice(0, 7)))],
  }), [adjustments, overrides, events])

  const loading = lm || le

  return (
    <div>
      <PageHeader title="交通費精算">
        <Button variant="secondary" onClick={() => setEditingCosts(true)}><Settings2 className="h-4 w-4" />片道設定</Button>
      </PageHeader>

      <Card className="p-4 mb-4">
        <div className="flex items-center justify-between">
          <button onClick={() => setMonth(subMonths(month, 1))} className="p-2 rounded-lg hover:bg-white/5"><ChevronLeft className="h-5 w-5" /></button>
          <div className="text-center">
            <h2 className="font-display text-lg font-bold num">{format(month, 'yyyy年 M月')}</h2>
            <p className="text-xs text-muted flex items-center justify-center gap-1"><Guitar className="h-3 w-3" />スタジオ <span className="num text-slate-200">{studios.length}</span>回</p>
          </div>
          <button onClick={() => setMonth(addMonths(month, 1))} className="p-2 rounded-lg hover:bg-white/5"><ChevronRight className="h-5 w-5" /></button>
        </div>
        {studios.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5 mt-3">
            {studios.map((e) => <span key={e.id} className="num text-xs rounded-full bg-primary/15 text-violet-200 px-2.5 py-0.5">{mdw(e.date)}</span>)}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 mt-4 text-center">
          <div className="rounded-xl bg-bg/60 border border-border py-2">
            <p className="text-[11px] text-muted">① 平均往復額</p>
            <p className="num font-bold">{yen(A)}</p>
          </div>
          <div className="rounded-xl bg-bg/60 border border-border py-2">
            <p className="text-[11px] text-muted">一律負担額（×{studios.length}回）</p>
            <p className="num font-bold">{yen(C)}</p>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-3">{MEMBERS.map((m) => <Skeleton key={m} className="h-36" />)}</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map((r) => (
            <MemberCard key={r.name} row={r} monthKey={monthKey} studios={studios}
              adjustments={monthAdj.filter((a) => a.member_name === r.name)} />
          ))}
        </div>
      )}

      <Savings savings={savings} monthKey={monthKey} overrides={overrides} />

      <p className="text-xs text-muted mt-6 leading-6">
        当日変更には「通常の往復交通費との差額」を入力します。安くなった場合はマイナス、高くなった場合はプラス。
        例: 欠席で往復不要なら往復額のマイナス、車移動で安ければその差額。
      </p>

      <CostsModal open={editingCosts} onClose={() => setEditingCosts(false)} members={members} />
    </div>
  )
}

function MemberCard({ row, monthKey, studios, adjustments }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ event_date: '', change_amount: '', note: '' })
  const c = COLORS[MEMBER_COLORS[row.name]] || COLORS.blue
  const lbl = settlementLabel(row.S)

  const add = useAction((v) => db.ExpenseAdjustment.create(v), ['expense_adjustments'])
  const del = useAction((id) => db.ExpenseAdjustment.delete(id), ['expense_adjustments'])

  const submit = async (e) => {
    e.preventDefault()
    if (!form.event_date || form.change_amount === '') return toast.error('日付と差額を入力してください')
    try {
      await add.mutateAsync({ month: monthKey, member_name: row.name, event_date: form.event_date, change_amount: Math.round(Number(form.change_amount)), note: form.note || null })
      setForm({ event_date: '', change_amount: '', note: '' })
      toast.success('記録しました')
    } catch (err) { toast.error(err.message) }
  }

  return (
    <Card className="overflow-hidden" style={{ borderColor: c.hex + '55' }}>
      <div className="h-1" style={{ background: c.hex }} />
      <div className="p-4">
        <div className="flex items-center justify-between">
          <p className="font-bold" style={{ color: c.hex }}>{row.name}</p>
          <p className="text-xs text-muted">片道 <span className="num text-slate-200">{yen(row.oneWay)}</span></p>
        </div>
        <div className="mt-3 space-y-1 text-sm">
          <Row label="② 支給ベース額" value={yen(row.base)} />
          <Row label="当日変更" value={signedYen(row.adjTotal)} dim={!row.adjTotal} />
        </div>
        <div className={cn('mt-3 rounded-xl px-3 py-2 flex items-center justify-between',
          lbl.tone === 'pos' ? 'bg-emerald-500/10' : lbl.tone === 'neg' ? 'bg-red-500/10' : 'bg-white/5')}>
          <span className="text-xs text-muted">③ 精算額</span>
          <span className="text-right">
            <span className={cn('num text-lg font-bold', lbl.tone === 'pos' ? 'text-emerald-400' : lbl.tone === 'neg' ? 'text-red-400' : 'text-slate-300')}>
              {lbl.tone === 'zero' ? '±¥0' : yen(Math.abs(row.S))}
            </span>
            {lbl.tone !== 'zero' && <span className={cn('block text-[11px]', lbl.tone === 'pos' ? 'text-emerald-300' : 'text-red-300')}>{lbl.text}</span>}
          </span>
        </div>
        <button onClick={() => setOpen(!open)} className="w-full mt-2 flex items-center justify-center gap-1 text-xs text-muted hover:text-slate-200 py-1">
          当日変更 {adjustments.length}件<ChevronDown className={cn('h-3.5 w-3.5 transition', open && 'rotate-180')} />
        </button>
        {open && (
          <div className="mt-2 space-y-2">
            {adjustments.map((a) => (
              <div key={a.id} className="flex items-center gap-2 rounded-lg bg-bg/60 px-2.5 py-1.5 text-sm">
                <span className="num text-xs text-muted w-14">{mdw(a.event_date)}</span>
                <span className={cn('num font-medium', a.change_amount < 0 ? 'text-emerald-400' : 'text-red-400')}>{signedYen(a.change_amount)}</span>
                <span className="flex-1 truncate text-xs text-muted">{a.note}</span>
                <button onClick={() => confirm('この記録を削除しますか？') && del.mutate(a.id)} className="p-1 text-muted hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
            <form onSubmit={submit} className="space-y-1.5 rounded-lg border border-dashed border-border p-2">
              <div className="grid grid-cols-2 gap-1.5">
                {studios.length ? (
                  <Select className="h-10" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })}>
                    <option value="">日付</option>
                    {studios.map((e) => <option key={e.id} value={e.date}>{mdw(e.date)}</option>)}
                  </Select>
                ) : (
                  <Input className="h-10" type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
                )}
                <Input className="h-10" type="number" inputMode="numeric" placeholder="差額 例:-1200" value={form.change_amount} onChange={(e) => setForm({ ...form, change_amount: e.target.value })} />
              </div>
              <Input className="h-10" placeholder="備考（欠席・車移動など）" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              <Button size="sm" type="submit" className="w-full justify-center" loading={add.isPending}><Plus className="h-3.5 w-3.5" />記録を追加</Button>
            </form>
          </div>
        )}
      </div>
    </Card>
  )
}

const Row = ({ label, value, dim }) => (
  <div className="flex justify-between"><span className="text-muted">{label}</span><span className={cn('num', dim && 'text-muted')}>{value}</span></div>
)

function Savings({ savings, monthKey, overrides }) {
  const [editing, setEditing] = useState(false)
  const cur = savings.history.find((h) => h.month === monthKey) || { auto: 0, manual: null, value: 0, note: '' }
  const existing = overrides.find((o) => o.month === monthKey)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')

  const save = useAction(async () => {
    const empty = amount === '' || amount === null
    if (existing) {
      if (empty) return db.BandSavingsAdjustment.delete(existing.id)
      return db.BandSavingsAdjustment.update(existing.id, { amount: Math.round(Number(amount)), note: note || null })
    }
    if (empty) return null
    return db.BandSavingsAdjustment.create({ month: monthKey, amount: Math.round(Number(amount)), note: note || null })
  }, ['band_savings_adjustments'])

  return (
    <Card className="mt-6 p-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold"><PiggyBank className="h-5 w-5 text-accent" />バンド貯金</h2>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="rounded-xl bg-gradient-to-br from-primary/25 to-accent/10 border border-primary/30 p-3">
          <p className="text-[11px] text-muted">累計</p>
          <p className="num text-2xl font-bold">{yen(savings.total)}</p>
        </div>
        <div className="rounded-xl bg-bg/60 border border-border p-3 relative">
          <p className="text-[11px] text-muted">{format(parseISO(monthKey + '-01'), 'M月')}の変動</p>
          <p className={cn('num text-2xl font-bold', cur.value > 0 ? 'text-emerald-400' : cur.value < 0 ? 'text-red-400' : '')}>{signedYen(cur.value)}</p>
          {cur.manual !== null && <p className="text-[10px] text-muted">手動設定（自動計算: {signedYen(cur.auto)}）</p>}
          <button onClick={() => { setAmount(existing?.amount ?? ''); setNote(existing?.note ?? ''); setEditing(true) }}
            className="absolute top-2 right-2 p-1.5 rounded-lg text-muted hover:text-slate-200 hover:bg-white/5"><Pencil className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      <h3 className="text-sm font-medium text-muted mt-5 mb-2">月別履歴</h3>
      {savings.history.length === 0 ? <p className="text-sm text-muted">まだ履歴はありません</p> : (
        <div className="divide-y divide-border">
          {savings.history.map((h) => (
            <div key={h.month} className="flex items-center justify-between py-2 text-sm">
              <span className="num">{format(parseISO(h.month + '-01'), 'yyyy年M月')}</span>
              <span className="text-right">
                <span className={cn('num font-medium', h.value > 0 ? 'text-emerald-400' : h.value < 0 ? 'text-red-400' : 'text-muted')}>{signedYen(h.value)}</span>
                {h.manual !== null && <span className="block text-[10px] text-muted">{h.note?.startsWith('Base44') ? h.note : <>手動設定（自動計算: {signedYen(h.auto)}）{h.note && ` ・ ${h.note}`}</>}</span>}
              </span>
            </div>
          ))}
        </div>
      )}

      <Modal open={editing} onClose={() => setEditing(false)} title={`${format(parseISO(monthKey + '-01'), 'yyyy年M月')}の変動額`}
        footer={<>
          <Button variant="secondary" onClick={() => setEditing(false)}>キャンセル</Button>
          <Button loading={save.isPending} onClick={async () => { await save.mutateAsync(); setEditing(false); toast.success('保存しました') }}>保存</Button>
        </>}>
        <p className="text-xs text-muted mb-3">自動計算: <span className="num text-slate-200">{signedYen(cur.auto)}</span>。入力するとこの金額で置き換えます（加算ではありません）。空欄で保存すると自動計算に戻ります。</p>
        <div className="space-y-3">
          <Field label="変動額（円）"><Input type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="例: 3000 / -1500" /></Field>
          <Field label="理由・備考"><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        </div>
      </Modal>
    </Card>
  )
}

function CostsModal({ open, onClose, members }) {
  const [v, setV] = useState({})
  const [lastOpen, setLastOpen] = useState(false)
  if (open !== lastOpen) {
    setLastOpen(open)
    if (open) setV(Object.fromEntries(MEMBERS.map((n) => [n, members.find((m) => m.name === n)?.transport_cost ?? 0])))
  }
  const save = useAction(async () => {
    for (const name of MEMBERS) {
      const cost = Math.max(0, Math.round(Number(v[name]) || 0))
      const m = members.find((x) => x.name === name)
      if (m) { if (m.transport_cost !== cost) await db.Member.update(m.id, { transport_cost: cost }) }
      else await db.Member.create({ name, transport_cost: cost, color: MEMBER_COLORS[name] })
    }
  }, ['members'])

  return (
    <Modal open={open} onClose={onClose} title="片道交通費の設定"
      footer={<>
        <Button variant="secondary" onClick={onClose}>キャンセル</Button>
        <Button loading={save.isPending} onClick={async () => { try { await save.mutateAsync(); toast.success('保存しました'); onClose() } catch (e) { toast.error(e.message) } }}>保存</Button>
      </>}>
      <div className="space-y-2">
        {MEMBERS.map((n) => (
          <div key={n} className="flex items-center gap-3">
            <span className="w-24 text-sm font-medium" style={{ color: COLORS[MEMBER_COLORS[n]].hex }}>{n}</span>
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">¥</span>
              <Input className="pl-7 num" type="number" inputMode="numeric" min="0" value={v[n] ?? ''} onChange={(e) => setV({ ...v, [n]: e.target.value })} />
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}
