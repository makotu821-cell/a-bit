import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { eachDayOfInterval, endOfMonth, parseISO, startOfMonth } from 'date-fns'
import { Plus, Trash2, CheckCircle2, ClipboardList, MessageSquare, CalendarCheck, Send, MessageCircle } from 'lucide-react'
import { PageHeader } from '../components/Layout'
import { Badge, Button, Card, Empty, Field, Input, Modal, Select, Skeleton, Textarea } from '../components/ui'
import { db, useAction, useEvents, usePollResponses, usePolls } from '../lib/api'
import { decideMessage, lineShareUrl, notifyLine } from '../lib/line'
import { ANSWER_MARK, COLORS, DEFAULT_DECIDE, MEMBERS, MEMBER_COLORS } from '../lib/constants'
import { cn, fmt, mdw, ymd, HALF_HOURS, timeRange } from '../lib/utils'

const STATUS_BADGE = {
  '回答中': 'bg-cyan-500/15 text-cyan-300 border-cyan-400/30',
  '締め切り': 'bg-slate-500/20 text-slate-300 border-slate-400/30',
  '確定': 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
}
const MARK_CLS = { ok: 'text-emerald-400', maybe: 'text-amber-300', ng: 'text-red-400' }
const MARK_ON = {
  ok: 'bg-emerald-500/25 border-emerald-400 text-emerald-300',
  maybe: 'bg-amber-400/20 border-amber-300 text-amber-200',
  ng: 'bg-red-500/20 border-red-400 text-red-300',
}

export default function Poll() {
  const { data: polls = [], isLoading } = usePolls()
  const { data: responses = [] } = usePollResponses()
  const [selectedId, setSelectedId] = useState(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!selectedId && polls.length) setSelectedId(polls[0].id)
    if (selectedId && polls.length && !polls.some((p) => p.id === selectedId)) setSelectedId(polls[0].id)
  }, [polls, selectedId])

  const poll = polls.find((p) => p.id === selectedId)

  return (
    <div>
      <PageHeader title="日程アンケート">
        <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" />新規作成</Button>
      </PageHeader>

      {isLoading ? <Skeleton className="h-64" /> : polls.length === 0 ? (
        <Card><Empty icon={ClipboardList} title="アンケートはまだありません">「新規作成」で月を選ぶと候補日が自動で作られます</Empty></Card>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-4 px-4">
            {polls.map((p) => (
              <button key={p.id} onClick={() => setSelectedId(p.id)}
                className={cn('shrink-0 rounded-xl border px-3 py-2 text-left transition',
                  p.id === selectedId ? 'border-primary bg-primary/15' : 'border-border bg-surface hover:border-primary/40')}>
                <p className="text-sm font-medium whitespace-nowrap">{p.title}</p>
                <Badge className={cn('mt-1', STATUS_BADGE[p.status])}>{p.status}</Badge>
              </button>
            ))}
          </div>
          {poll && <PollDetail key={poll.id} poll={poll} responses={responses.filter((r) => r.poll_id === poll.id)} />}
        </>
      )}

      <CreateModal open={creating} onClose={() => setCreating(false)} onCreated={(p) => setSelectedId(p.id)} />
    </div>
  )
}

function CreateModal({ open, onClose, onCreated }) {
  const now = new Date()
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const [year, setYear] = useState(next.getFullYear())
  const [month, setMonth] = useState(next.getMonth() + 1)
  const [title, setTitle] = useState('')
  const create = useAction((v) => db.SchedulePoll.create(v), ['schedule_polls'])

  const submit = async (e) => {
    e.preventDefault()
    const first = new Date(year, month - 1, 1)
    const dates = eachDayOfInterval({ start: startOfMonth(first), end: endOfMonth(first) }).map(ymd)
    try {
      const p = await create.mutateAsync({
        title: title.trim() || `${year}年${month}月 スタジオ候補日`,
        status: '回答中', candidate_dates: dates, decided_dates: [],
      })
      toast.success('アンケートを作成しました'); onCreated(p); setTitle(''); onClose()
    } catch (err) { toast.error(err.message) }
  }

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]
  return (
    <Modal open={open} onClose={onClose} title="アンケートを作成">
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Field label="年"><Select value={year} onChange={(e) => setYear(+e.target.value)}>{years.map((y) => <option key={y} value={y}>{y}年</option>)}</Select></Field>
          <Field label="月"><Select value={month} onChange={(e) => setMonth(+e.target.value)}>{Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{i + 1}月</option>)}</Select></Field>
        </div>
        <Field label="タイトル（任意）"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`${year}年${month}月 スタジオ候補日`} /></Field>
        <p className="text-xs text-muted">{month}月の全日付（1日〜月末）が候補日になります</p>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>キャンセル</Button>
          <Button type="submit" loading={create.isPending}>作成</Button>
        </div>
      </form>
    </Modal>
  )
}

function PollDetail({ poll, responses }) {
  const dates = poll.candidate_dates || []
  const decided = poll.status === '確定'
  const [confirmDel, setConfirmDel] = useState(false)
  const [deciding, setDeciding] = useState(false)
  const del = useAction(() => db.SchedulePoll.delete(poll.id), ['schedule_polls', 'poll_responses'])
  const { data: events = [] } = useEvents()
  const [shareText, setShareText] = useState(null)
  const resendLine = () => {
    const evs = events.filter((e) => e.type === 'スタジオ' && (poll.decided_dates || []).includes(e.date))
    setShareText(decideMessage(poll, evs, responses))
  }

  const byMember = useMemo(() => Object.fromEntries(responses.map((r) => [r.member_name, r])), [responses])

  const stats = useMemo(() => {
    const s = {}
    dates.forEach((d) => {
      const c = { ok: 0, maybe: 0, ng: 0, answered: 0 }
      MEMBERS.forEach((m) => {
        const a = byMember[m]?.responses?.[d]
        if (a) { c[a]++; c.answered++ }
      })
      s[d] = c
    })
    return s
  }, [dates, byMember])

  const maxOk = Math.max(0, ...Object.values(stats).map((c) => c.ok))
  const highlight = (d) => {
    if (decided) return (poll.decided_dates || []).includes(d) ? 'bg-emerald-500/15' : ''
    const c = stats[d]
    if (maxOk > 0 && c.ok === maxOk) return 'bg-emerald-500/15'
    if (c.answered === MEMBERS.length && c.ng === 0 && c.maybe > 0) return 'bg-yellow-400/10'
    return ''
  }

  const comments = useMemo(() => dates
    .map((d) => ({
      date: d,
      items: MEMBERS.map((m) => ({ m, a: byMember[m]?.responses?.[d], c: (byMember[m]?.date_memos?.[d] || '').trim() })).filter((x) => x.c),
    }))
    .filter((x) => x.items.length), [dates, byMember])

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold">{poll.title}</h2>
            <p className="text-xs text-muted mt-0.5">回答 {responses.length}/{MEMBERS.length}名</p>
          </div>
          {confirmDel ? (
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-muted">削除しますか？</span>
              <Button size="sm" variant="danger" loading={del.isPending} onClick={async () => { await del.mutateAsync(); toast.success('削除しました') }}>はい</Button>
              <Button size="sm" variant="secondary" onClick={() => setConfirmDel(false)}>いいえ</Button>
            </div>
          ) : (
            <button onClick={() => setConfirmDel(true)} className="p-2 rounded-lg text-muted hover:text-red-400 hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></button>
          )}
        </div>

        {decided && (
          <div className="mt-3 rounded-xl bg-emerald-500/10 border border-emerald-400/30 p-3">
            <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-300 mb-2"><CheckCircle2 className="h-4 w-4" />日程確定</p>
            <div className="flex flex-wrap gap-1.5">
              {(poll.decided_dates || []).map((d) => <Badge key={d} className="bg-emerald-500/20 text-emerald-200 border-emerald-400/30 num">{mdw(d)}</Badge>)}
            </div>
            {poll.decide_memo && <p className="text-sm mt-2 text-slate-300"><span className="text-xs text-muted mr-2">備考</span>{poll.decide_memo}</p>}
            <Button size="sm" variant="secondary" className="mt-3" onClick={resendLine}><MessageCircle className="h-4 w-4 text-[#06C755]" />LINEで送る</Button>
          </div>
        )}
      </Card>

      {/* 集計表 */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface2 text-xs">
                <th className="sticky left-0 bg-surface2 text-left px-3 py-2 font-medium text-muted">日付</th>
                {MEMBERS.map((m) => (
                  <th key={m} className="px-2 py-2 font-medium whitespace-nowrap" style={{ color: COLORS[MEMBER_COLORS[m]].hex }}>{m}</th>
                ))}
                <th className="px-3 py-2 font-medium text-muted text-right">集計</th>
              </tr>
            </thead>
            <tbody>
              {dates.map((d) => {
                const dow = parseISO(d).getDay()
                const c = stats[d]
                return (
                  <tr key={d} className={cn('border-t border-border', highlight(d))}>
                    <td className={cn('sticky left-0 bg-surface px-3 py-1.5 num whitespace-nowrap', dow === 0 ? 'text-red-400' : dow === 6 ? 'text-blue-400' : '')}>{mdw(d)}</td>
                    {MEMBERS.map((m) => {
                      const a = byMember[m]?.responses?.[d]
                      const memo = byMember[m]?.date_memos?.[d]
                      return (
                        <td key={m} className="text-center px-2 py-1.5" title={memo || ''}>
                          <span className={cn('text-base', MARK_CLS[a])}>{a ? ANSWER_MARK[a] : <span className="text-white/15">−</span>}</span>
                          {memo && <sup className="text-amber-300">*</sup>}
                        </td>
                      )
                    })}
                    <td className="px-3 py-1.5 text-right whitespace-nowrap num text-xs">
                      <span className="text-emerald-400">○{c.ok}</span> <span className="text-amber-300">△{c.maybe}</span> <span className="text-red-400">×{c.ng}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {!decided && (
          <div className="flex flex-wrap gap-3 px-3 py-2 text-[11px] text-muted border-t border-border">
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-emerald-500/40" />○が最多</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-yellow-400/30" />全員○か△（×なし）</span>
          </div>
        )}
      </Card>

      {comments.length > 0 && (
        <Card className="p-4">
          <h3 className="flex items-center gap-2 font-display font-bold mb-3"><MessageSquare className="h-4 w-4 text-accent" />メンバーコメント</h3>
          <div className="space-y-2">
            {comments.map(({ date, items }) => (
              <div key={date} className="text-sm">
                <p className="num text-xs text-muted mb-1">{mdw(date)}</p>
                {items.map((x) => (
                  <p key={x.m} className="pl-2 border-l-2 border-border">
                    <span className={cn('mr-1', MARK_CLS[x.a])}>{ANSWER_MARK[x.a] || ''}</span>
                    <span style={{ color: COLORS[MEMBER_COLORS[x.m]].hex }}>{x.m}</span>: {x.c}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </Card>
      )}

      {!decided && (
        <>
          <AnswerForm poll={poll} byMember={byMember} />
          <Button variant="accent" className="w-full justify-center" size="lg" onClick={() => setDeciding(true)}>
            <CalendarCheck className="h-5 w-5" />日程を確定する
          </Button>
          <DecideModal open={deciding} onClose={() => setDeciding(false)} poll={poll} stats={stats} responses={responses} onShare={setShareText} />
        </>
      )}
      <LineShareModal text={shareText} onClose={() => setShareText(null)} />
    </div>
  )
}

function AnswerForm({ poll, byMember }) {
  const [member, setMember] = useState('')
  const [ans, setAns] = useState({})
  const [memos, setMemos] = useState({})
  const dates = poll.candidate_dates || []
  const existing = member ? byMember[member] : null

  useEffect(() => {
    setAns(existing?.responses || {})
    setMemos(existing?.date_memos || {})
  }, [member, existing?.id]) // eslint-disable-line

  const save = useAction(async () => {
    const cleanMemos = Object.fromEntries(Object.entries(memos).filter(([, v]) => v && v.trim()))
    const cleanAns = Object.fromEntries(Object.entries(ans).filter(([, v]) => v))
    const payload = { poll_id: poll.id, member_name: member, responses: cleanAns, date_memos: cleanMemos }
    return existing ? db.PollResponse.update(existing.id, payload) : db.PollResponse.create(payload)
  }, ['poll_responses'])

  const submit = async () => {
    if (!member) return toast.error('名前を選んでください')
    try { await save.mutateAsync(); toast.success(existing ? '回答を更新しました' : '回答を送信しました') }
    catch (e) { toast.error(e.message) }
  }

  const [pen, setPen] = useState('ng')
  const [showMemo, setShowMemo] = useState(false)
  // 同じペンでもう一度タップすると未回答に戻す
  const paint = (d) => {
    const next = { ...ans }
    if (next[d] === pen) delete next[d]
    else next[d] = pen
    setAns(next)
  }
  const unanswered = dates.filter((d) => !ans[d]).length
  const fillRest = (v) => setAns({ ...Object.fromEntries(dates.map((d) => [d, v])), ...Object.fromEntries(Object.entries(ans).filter(([, x]) => x)) })

  return (
    <Card className="p-4">
      <h3 className="font-display font-bold mb-3">回答する</h3>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {MEMBERS.map((m) => {
          const c = COLORS[MEMBER_COLORS[m]]
          return (
            <button key={m} onClick={() => setMember(m)}
              className={cn('rounded-full px-3 py-1.5 text-sm border transition', member === m ? 'text-white' : 'border-border text-slate-300')}
              style={member === m ? { background: c.hex, borderColor: c.hex } : {}}>
              {m}{byMember[m] && <span className="ml-1 text-[10px] opacity-80">✓</span>}
            </button>
          )
        })}
      </div>

      {member && (
        <>
          {/* ペンを選んで日付をタップ → 残りを一括で埋める */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-muted">ペン</span>
            {['ok', 'maybe', 'ng'].map((k) => (
              <button key={k} onClick={() => setPen(k)}
                className={cn('h-10 w-12 rounded-xl border-2 text-xl transition', pen === k ? MARK_ON[k] : 'border-border text-white/40')}>
                {ANSWER_MARK[k]}
              </button>
            ))}
            <span className="text-[11px] text-muted leading-tight">で日付を<br />タップ</span>
          </div>

          <div className="grid grid-cols-7 text-center text-[11px] mb-1">
            {['日', '月', '火', '水', '木', '金', '土'].map((w, i) => (
              <div key={w} className={i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-muted'}>{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: dates.length ? parseISO(dates[0]).getDay() : 0 }).map((_, i) => <div key={'b' + i} />)}
            {dates.map((d) => {
              const a = ans[d]
              const dow = parseISO(d).getDay()
              return (
                <button key={d} onClick={() => paint(d)}
                  className={cn('relative h-12 rounded-lg border text-center transition active:scale-95',
                    a ? MARK_ON[a] : 'border-border bg-bg/50')}>
                  <span className={cn('absolute top-0.5 left-1 num text-[10px]', !a && (dow === 0 ? 'text-red-400' : dow === 6 ? 'text-blue-400' : 'text-muted'))}>
                    {parseISO(d).getDate()}
                  </span>
                  <span className="text-lg leading-[3rem]">{a ? ANSWER_MARK[a] : ''}</span>
                  {memos[d] && <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-amber-300" />}
                </button>
              )
            })}
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
            <span className="text-muted self-center">未回答 {unanswered}日 →</span>
            {['ok', 'maybe', 'ng'].map((k) => (
              <button key={k} disabled={!unanswered} onClick={() => fillRest(k)}
                className={cn('px-2.5 py-1.5 rounded-lg border border-border disabled:opacity-40', MARK_CLS[k])}>残りを全部{ANSWER_MARK[k]}</button>
            ))}
            <button onClick={() => setAns({})} className="px-2.5 py-1.5 rounded-lg border border-border text-muted">クリア</button>
          </div>

          <button onClick={() => setShowMemo(!showMemo)} className="mt-3 w-full flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
            <span>日ごとのコメント{Object.values(memos).filter((v) => v && v.trim()).length > 0 && <span className="ml-1 text-amber-300">（{Object.values(memos).filter((v) => v && v.trim()).length}件）</span>}</span>
            <span className="text-muted text-xs">{showMemo ? '閉じる' : '開く'}</span>
          </button>
          {showMemo && (
            <div className="mt-2 space-y-1 max-h-[45vh] overflow-y-auto pr-1">
              {dates.map((d) => {
                const dow = parseISO(d).getDay()
                return (
                  <div key={d} className="flex items-center gap-2">
                    <span className={cn('num text-xs w-14 shrink-0', dow === 0 ? 'text-red-400' : dow === 6 ? 'text-blue-400' : '')}>{mdw(d)}</span>
                    <span className={cn('w-4 text-center', MARK_CLS[ans[d]])}>{ANSWER_MARK[ans[d]] || '−'}</span>
                    <input value={memos[d] || ''} onChange={(e) => setMemos({ ...memos, [d]: e.target.value })} placeholder="コメント（休み確定 など）"
                      className="flex-1 min-w-0 h-9 rounded-lg bg-transparent border border-border px-2 text-[16px] placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                )
              })}
            </div>
          )}

          <Button className="w-full justify-center mt-3" size="lg" loading={save.isPending} onClick={submit}>
            <Send className="h-4 w-4" />{existing ? '回答を更新' : '回答を送信'}
          </Button>
        </>
      )}
    </Card>
  )
}

function DecideModal({ open, onClose, poll, stats, responses, onShare }) {
  const [sel, setSel] = useState({}) // date -> {start,end,location}
  const [memo, setMemo] = useState('')
  const dates = poll.candidate_dates || []

  const decide = useAction(async () => {
    const chosen = Object.keys(sel).sort()
    const events = await db.Event.bulkCreate(chosen.map((d) => ({
      title: 'スタジオ練習', type: 'スタジオ', date: d,
      start_time: sel[d].start || null, end_time: sel[d].end || null,
      location: sel[d].location || null, memo: memo || null,
    })))
    const updated = await db.SchedulePoll.update(poll.id, { status: '確定', decided_dates: chosen, decide_memo: memo || null })
    return { events, poll: updated }
  }, ['events', 'schedule_polls'])

  const toggle = (d) => {
    const n = { ...sel }
    if (n[d]) delete n[d]
    else n[d] = { ...DEFAULT_DECIDE }
    setSel(n)
  }
  const upd = (d, k, v) => setSel({ ...sel, [d]: { ...sel[d], [k]: v } })
  const count = Object.keys(sel).length

  return (
    <Modal open={open} onClose={onClose} title="日程を確定" wide
      footer={<>
        <Button variant="secondary" onClick={onClose}>キャンセル</Button>
        <Button disabled={!count} loading={decide.isPending} onClick={async () => {
          try {
            const { events, poll: updated } = await decide.mutateAsync()
            toast.success(`${count}日をカレンダーに登録しました`)
            onClose()
            // LINE グループへ自動送信。bot 未設定なら「LINEで送る」画面を出す
            const text = decideMessage(updated, events, responses)
            const r = await notifyLine(text)
            if (r.ok) toast.success('LINEグループにお知らせしました')
            else onShare(text)
          }
          catch (e) { toast.error(e.message) }
        }}>{count}日を確定</Button>
      </>}>
      <p className="text-xs text-muted mb-3">確定する日を選んで、時間と場所を指定してください。カレンダーに一括登録されます。</p>
      <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
        {dates.map((d) => {
          const c = stats[d]
          const on = !!sel[d]
          return (
            <div key={d} className={cn('rounded-xl border p-2', on ? 'border-primary bg-primary/10' : 'border-border')}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={on} onChange={() => toggle(d)} className="h-4 w-4 accent-violet-500" />
                <span className="num text-sm w-16">{mdw(d)}</span>
                <span className="num text-xs"><span className="text-emerald-400">○{c.ok}</span> <span className="text-amber-300">△{c.maybe}</span> <span className="text-red-400">×{c.ng}</span></span>
              </label>
              {on && (
                <div className="grid grid-cols-[1fr_1fr_1.4fr] gap-1.5 mt-2">
                  <Select value={sel[d].start} onChange={(e) => upd(d, 'start', e.target.value)} className="h-9">{HALF_HOURS.map((t) => <option key={t}>{t}</option>)}</Select>
                  <Select value={sel[d].end} onChange={(e) => upd(d, 'end', e.target.value)} className="h-9">{HALF_HOURS.map((t) => <option key={t}>{t}</option>)}</Select>
                  <Input value={sel[d].location} onChange={(e) => upd(d, 'location', e.target.value)} className="h-9" placeholder="場所" />
                </div>
              )}
            </div>
          )
        })}
      </div>
      <Field label="備考（カレンダーに表示）" className="mt-3">
        <Textarea className="min-h-[70px]" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="集合10:45 など" />
      </Field>
    </Modal>
  )
}

function LineShareModal({ text, onClose }) {
  return (
    <Modal open={!!text} onClose={onClose} title="LINEでお知らせ">
      <pre className="whitespace-pre-wrap text-sm bg-bg rounded-xl p-3 max-h-[45vh] overflow-y-auto font-sans">{text}</pre>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="secondary" className="justify-center" onClick={async () => {
          try { await navigator.clipboard.writeText(text); toast.success('コピーしました') } catch { toast.error('コピーできませんでした') }
        }}>コピー</Button>
        <a href={text ? lineShareUrl(text) : '#'} target="_blank" rel="noreferrer" onClick={onClose}
          className="inline-flex items-center justify-center gap-2 h-10 rounded-xl font-medium text-white bg-[#06C755] hover:brightness-110">
          <MessageCircle className="h-4 w-4" />LINEで送る
        </a>
      </div>
      <p className="text-[11px] text-muted mt-2">「LINEで送る」→ バンドのグループを選んで送信</p>
    </Modal>
  )
}
