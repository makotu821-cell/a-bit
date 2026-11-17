import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AnimatePresence, motion } from 'framer-motion'
import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, isToday, startOfMonth, startOfWeek, subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight, Copy, Check, Plus, MapPin, Clock, Mic2, Guitar, CalendarDays, MessageSquare, Trash2 } from 'lucide-react'
import { PageHeader } from '../components/Layout'
import { Button, Card, Empty, Field, Input, Modal, Select, Skeleton, Confirm } from '../components/ui'
import { db, useAction, useEvents, usePollResponses, usePolls } from '../lib/api'
import { EVENT_TYPES } from '../lib/constants'
import { getDateInfo, formatEventsText } from '../lib/pollInfo'
import { cn, fmt, mdw, timeRange, ymd, HALF_HOURS } from '../lib/utils'

const TYPE_STYLE = {
  'スタジオ': { cls: 'bg-violet-500/20 text-violet-200 border-violet-400/30', icon: Guitar },
  'ライブ': { cls: 'bg-pink-500/20 text-pink-200 border-pink-400/30', icon: Mic2 },
  'その他': { cls: 'bg-cyan-500/15 text-cyan-200 border-cyan-400/30', icon: CalendarDays },
}
const WEEK = ['日', '月', '火', '水', '木', '金', '土']

export default function Calendar() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const { data: events = [], isLoading } = useEvents()
  const { data: polls = [] } = usePolls()
  const { data: responses = [] } = usePollResponses()
  const [editing, setEditing] = useState(null) // {event} or {date}
  const [popup, setPopup] = useState(null) // date string
  const [expanded, setExpanded] = useState({})
  const [copied, setCopied] = useState(false)

  const days = useMemo(() => eachDayOfInterval({
    start: startOfWeek(startOfMonth(month)), end: endOfWeek(endOfMonth(month)),
  }), [month])

  const byDate = useMemo(() => {
    const m = {}
    events.forEach((e) => { (m[e.date] ||= []).push(e) })
    Object.values(m).forEach((l) => l.sort((a, b) => (a.start_time || '').localeCompare(b.start_time || '')))
    return m
  }, [events])

  const infoByDate = useMemo(() => {
    const m = {}
    days.forEach((d) => { const k = ymd(d); const i = getDateInfo(k, polls, responses); if (i) m[k] = i })
    return m
  }, [days, polls, responses])

  const monthKey = format(month, 'yyyy-MM')
  const monthEvents = useMemo(() => events
    .filter((e) => e.date.startsWith(monthKey))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.start_time || '').localeCompare(b.start_time || '')), [events, monthKey])

  const onDayTap = (d) => {
    const k = ymd(d)
    if (byDate[k]?.length || infoByDate[k]) setPopup(popup === k ? null : k)
    else setEditing({ date: k })
  }

  const copyAll = async () => {
    const text = formatEventsText(monthEvents, polls, responses)
    if (!text) return toast.info('今月の予定はありません')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true); setTimeout(() => setCopied(false), 2000)
      toast.success('コピーしました')
    } catch { toast.error('コピーできませんでした') }
  }

  return (
    <div>
      <PageHeader title="カレンダー">
        <Button onClick={() => setEditing({ date: ymd(new Date()) })}><Plus className="h-4 w-4" />予定追加</Button>
      </PageHeader>

      <Card className="p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => { setMonth(subMonths(month, 1)); setPopup(null) }} className="p-2 rounded-lg hover:bg-white/5"><ChevronLeft className="h-5 w-5" /></button>
          <h2 className="font-display text-lg font-bold num">{format(month, 'yyyy年 M月')}</h2>
          <button onClick={() => { setMonth(addMonths(month, 1)); setPopup(null) }} className="p-2 rounded-lg hover:bg-white/5"><ChevronRight className="h-5 w-5" /></button>
        </div>
        <div className="grid grid-cols-7 text-center text-xs mb-1">
          {WEEK.map((w, i) => <div key={w} className={cn('py-1', i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-muted')}>{w}</div>)}
        </div>
        {isLoading ? <Skeleton className="h-80" /> : (
          <div className="grid grid-cols-7 gap-1">
            {days.map((d) => {
              const k = ymd(d)
              const evs = byDate[k] || []
              const info = infoByDate[k]
              const dow = d.getDay()
              const inMonth = isSameMonth(d, month)
              return (
                <div key={k} className="relative">
                  <button onClick={() => onDayTap(d)}
                    className={cn('w-full min-h-[64px] sm:min-h-[92px] rounded-lg p-1 text-left border transition align-top flex flex-col',
                      inMonth ? 'bg-bg/60 border-border hover:border-primary/50' : 'bg-transparent border-transparent opacity-40',
                      isToday(d) && 'ring-2 ring-accent/70 border-accent/40')}>
                    <div className="flex items-center justify-between">
                      <span className={cn('num text-xs sm:text-sm font-medium',
                        isToday(d) && 'grid place-items-center h-5 w-5 rounded-full bg-accent text-slate-900',
                        !isToday(d) && (dow === 0 ? 'text-red-400' : dow === 6 ? 'text-blue-400' : 'text-slate-200'))}>{d.getDate()}</span>
                      {info && <MessageSquare className="h-3 w-3 text-amber-300" />}
                    </div>
                    <div className="mt-0.5 space-y-0.5 overflow-hidden">
                      {evs.slice(0, 3).map((e) => (
                        <div key={e.id} onClick={(ev) => { ev.stopPropagation(); setEditing({ event: e }) }}
                          className={cn('truncate rounded px-1 text-[10px] sm:text-[11px] border cursor-pointer', TYPE_STYLE[e.type]?.cls)}>
                          <span className="hidden sm:inline">{e.start_time ? e.start_time + ' ' : ''}</span>{e.title}
                        </div>
                      ))}
                      {evs.length > 3 && <div className="text-[10px] text-muted">+{evs.length - 3}</div>}
                    </div>
                  </button>
                  <AnimatePresence>
                    {popup === k && (
                      <DayPopup date={k} dow={dow} events={evs} info={info}
                        onClose={() => setPopup(null)}
                        onAdd={() => { setPopup(null); setEditing({ date: k }) }}
                        onEdit={(e) => { setPopup(null); setEditing({ event: e }) }} />
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-bold">今月の予定</h2>
          <Button size="sm" variant="secondary" onClick={copyAll}>
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}{copied ? 'コピー完了' : '全部コピー'}
          </Button>
        </div>
        {monthEvents.length === 0 ? (
          <Card><Empty icon={CalendarDays} title="今月の予定はありません">日付をタップして予定を追加できます</Empty></Card>
        ) : (
          <div className="space-y-2">
            {monthEvents.map((e) => {
              const T = TYPE_STYLE[e.type] || TYPE_STYLE['その他']
              const info = getDateInfo(e.date, polls, responses)
              return (
                <Card key={e.id} className="p-3">
                  <div className="flex items-center gap-3">
                    <div className={cn('grid place-items-center h-10 w-10 rounded-xl border shrink-0', T.cls)}><T.icon className="h-5 w-5" /></div>
                    <button onClick={() => setEditing({ event: e })} className="flex-1 min-w-0 text-left">
                      <p className="font-medium truncate">{e.title}</p>
                      <p className="text-xs text-muted flex flex-wrap gap-x-3 mt-0.5">
                        <span className="num">{mdw(e.date)}</span>
                        {timeRange(e.start_time, e.end_time) && <span className="flex items-center gap-1 num"><Clock className="h-3 w-3" />{timeRange(e.start_time, e.end_time)}</span>}
                        {e.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{e.location}</span>}
                      </p>
                    </button>
                    {(info || e.memo) && (
                      <button onClick={() => setExpanded({ ...expanded, [e.id]: !expanded[e.id] })}
                        className={cn('p-2 rounded-lg', expanded[e.id] ? 'bg-amber-400/15 text-amber-300' : 'text-amber-300/80 hover:bg-white/5')}>
                        <MessageSquare className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {expanded[e.id] && <InfoBlock memo={[e.memo, info?.memo].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(' / ')} entries={info?.entries || []} className="mt-3" />}
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <EventModal state={editing} onClose={() => setEditing(null)} />
    </div>
  )
}

function InfoBlock({ memo, entries, className }) {
  return (
    <div className={cn('rounded-xl bg-amber-400/5 border border-amber-400/20 p-2.5 text-sm space-y-1', className)}>
      {memo && <p><span className="text-amber-300 text-xs mr-2">備考</span>{memo}</p>}
      {entries.map((x, i) => (
        <p key={i} className="text-slate-300"><span className="num mr-1">{x.mark}</span>{x.member}{x.comment && <span className="text-muted">: {x.comment}</span>}</p>
      ))}
    </div>
  )
}

function DayPopup({ date, dow, events, info, onClose, onAdd, onEdit }) {
  const align = dow <= 1 ? 'left-0' : dow >= 5 ? 'right-0' : 'left-1/2 -translate-x-1/2'
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
        className={cn('absolute z-20 top-full mt-1 w-64 rounded-2xl bg-surface2 border border-border shadow-2xl p-3', align)}>
        <p className="font-display font-bold text-sm mb-2 num">{fmt(date, 'M月d日(E)')}</p>
        {events.length > 0 && (
          <div className="space-y-1 mb-2">
            {events.map((e) => (
              <button key={e.id} onClick={() => onEdit(e)} className={cn('w-full text-left rounded-lg px-2 py-1.5 text-xs border', TYPE_STYLE[e.type]?.cls)}>
                <span className="font-medium">{e.title}</span>
                <span className="block opacity-80 num">{[timeRange(e.start_time, e.end_time), e.location].filter(Boolean).join(' ・ ')}</span>
              </button>
            ))}
          </div>
        )}
        {info && <InfoBlock memo={info.memo} entries={info.entries} className="mb-2 text-xs" />}
        <Button size="sm" variant="secondary" className="w-full justify-center" onClick={onAdd}><Plus className="h-3.5 w-3.5" />予定を追加</Button>
      </motion.div>
    </>
  )
}

const EMPTY = { title: '', type: 'スタジオ', date: '', start_time: '', end_time: '', location: '', memo: '' }

function EventModal({ state, onClose }) {
  const isEdit = !!state?.event
  const [v, setV] = useState(EMPTY)
  const [confirmDel, setConfirmDel] = useState(false)
  const [lastState, setLastState] = useState(null)
  if (state !== lastState) {
    setLastState(state)
    if (state) setV(state.event ? { ...EMPTY, ...Object.fromEntries(Object.entries(state.event).map(([k, x]) => [k, x ?? ''])) } : { ...EMPTY, date: state.date })
  }
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value })

  const save = useAction(async () => {
    const payload = {
      title: v.title.trim(), type: v.type, date: v.date,
      start_time: v.start_time || null, end_time: v.end_time || null,
      location: v.location || null, memo: v.memo || null,
    }
    return isEdit ? db.Event.update(state.event.id, payload) : db.Event.create(payload)
  }, ['events'])
  const del = useAction(() => db.Event.delete(state.event.id), ['events'])

  const submit = async (e) => {
    e.preventDefault()
    if (!v.title.trim() || !v.date) return
    try { await save.mutateAsync(); toast.success(isEdit ? '予定を更新しました' : '予定を追加しました'); onClose() }
    catch (err) { toast.error(err.message) }
  }

  return (
    <>
      <Modal open={!!state} onClose={onClose} title={isEdit ? '予定を編集' : '予定を追加'}>
        <form onSubmit={submit} className="space-y-3">
          <Field label="タイトル" required><Input value={v.title} onChange={set('title')} placeholder="スタジオ練習" required /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="種別"><Select value={v.type} onChange={set('type')}>{EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
            <Field label="日付" required><Input type="date" value={v.date} onChange={set('date')} required /></Field>
            <Field label="開始時間">
              <Select value={v.start_time} onChange={set('start_time')}><option value="">—</option>{HALF_HOURS.map((t) => <option key={t}>{t}</option>)}</Select>
            </Field>
            <Field label="終了時間">
              <Select value={v.end_time} onChange={set('end_time')}><option value="">—</option>{HALF_HOURS.map((t) => <option key={t}>{t}</option>)}</Select>
            </Field>
          </div>
          <Field label="場所"><Input value={v.location} onChange={set('location')} placeholder="川崎" /></Field>
          <Field label="メモ・備考"><Input value={v.memo} onChange={set('memo')} placeholder="集合10:45 など" /></Field>
          <div className="flex items-center justify-between pt-2">
            {isEdit ? (
              <Button type="button" variant="ghost" className="text-red-400" onClick={() => setConfirmDel(true)}><Trash2 className="h-4 w-4" />削除</Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={onClose}>キャンセル</Button>
              <Button type="submit" loading={save.isPending}>{isEdit ? '保存' : '追加'}</Button>
            </div>
          </div>
        </form>
      </Modal>
      <Confirm open={confirmDel} onClose={() => setConfirmDel(false)} loading={del.isPending}
        title="予定を削除" message={`「${v.title}」を削除しますか？`}
        onConfirm={async () => { await del.mutateAsync(); setConfirmDel(false); onClose(); toast.success('削除しました') }} />
    </>
  )
}
