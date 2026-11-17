import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { Modal, Button, Input, Select, Field } from '../ui'
import { COLORS, SONG_STATUSES } from '../../lib/constants'
import { cn } from '../../lib/utils'

const EMPTY = { title: '', composer: '', lyricist: '', arranger: '', status: '原案', color: 'purple' }

export default function SongFormModal({ open, onClose, initial, onSubmit, loading, mode = 'create' }) {
  const [v, setV] = useState(EMPTY)
  useEffect(() => { if (open) setV({ ...EMPTY, ...(initial || {}) }) }, [open, initial])
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value })

  const submit = (e) => {
    e.preventDefault()
    if (!v.title.trim()) return
    onSubmit({
      title: v.title.trim(), composer: v.composer || null, lyricist: v.lyricist || null,
      arranger: v.arranger || null, status: v.status, color: v.color,
    })
  }

  return (
    <Modal open={open} onClose={onClose} title={mode === 'create' ? '楽曲を追加' : '楽曲情報を編集'}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="楽曲名" required><Input autoFocus value={v.title} onChange={set('title')} placeholder="例: 片想い" required /></Field>
        <div className="grid grid-cols-3 gap-2">
          <Field label="作曲"><Input value={v.composer || ''} onChange={set('composer')} /></Field>
          <Field label="作詞"><Input value={v.lyricist || ''} onChange={set('lyricist')} /></Field>
          <Field label="編曲"><Input value={v.arranger || ''} onChange={set('arranger')} /></Field>
        </div>
        <Field label="ステータス">
          <Select value={v.status} onChange={set('status')}>
            {SONG_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="カラー">
          <div className="flex flex-wrap gap-2">
            {Object.entries(COLORS).map(([k, c]) => (
              <button type="button" key={k} title={c.label} onClick={() => setV({ ...v, color: k })}
                className={cn('h-9 w-9 rounded-full grid place-items-center ring-offset-2 ring-offset-surface transition', v.color === k && 'ring-2 ring-white')}
                style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }}>
                {v.color === k && <Check className="h-4 w-4 text-white" />}
              </button>
            ))}
          </div>
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>キャンセル</Button>
          <Button type="submit" loading={loading}>{mode === 'create' ? '追加' : '保存'}</Button>
        </div>
      </form>
    </Modal>
  )
}
