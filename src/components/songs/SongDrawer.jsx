import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { X, Pencil, Trash2, FileText, ChevronDown, Upload, HardDrive, Plus, ExternalLink, Music2 } from 'lucide-react'
import { Badge, Button, Input, Textarea, Confirm } from '../ui'
import SongFormModal from './SongFormModal'
import SubFolder, { DriveFileRow } from './SubFolder'
import { db, uploadFile, useAction } from '../../lib/api'
import { pickFromDrive, driveEnabled } from '../../lib/googleDrive'
import { COLORS, DEFAULT_SUBFOLDERS, PHASES, STATUS_STYLE } from '../../lib/constants'
import { cn } from '../../lib/utils'

export default function SongDrawer({ song, files, folders, driveFiles = [], onClose }) {
  const [editMeta, setEditMeta] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const c = COLORS[song.color] || COLORS.purple

  const update = useAction((v) => db.Song.update(song.id, v), ['songs'])
  const del = useAction(() => db.Song.delete(song.id), ['songs', 'song_files', 'song_folders'])

  return (
    <div>
      <div className="relative p-5 pb-6" style={{ background: `linear-gradient(135deg, ${c.from}55, ${c.to}22 70%, transparent)` }}>
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <Badge className={STATUS_STYLE[song.status]}>{song.status}</Badge>
            <h2 className="font-display text-2xl font-bold mt-2 break-words">{song.title}</h2>
            <div className="mt-2 text-sm text-slate-300 space-y-0.5">
              <p><span className="text-muted mr-2">作曲</span>{song.composer || '—'}</p>
              <p><span className="text-muted mr-2">作詞</span>{song.lyricist || '—'}</p>
              <p><span className="text-muted mr-2">編曲</span>{song.arranger || '—'}</p>
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={() => setEditMeta(true)} className="p-2 rounded-lg hover:bg-white/10" title="編集"><Pencil className="h-4 w-4" /></button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10"><X className="h-5 w-5" /></button>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-6">
        <SheetMusic song={song} update={update} />
        <Lyrics song={song} update={update} />

        {PHASES.map((phase) => (
          <PhaseSection key={phase} song={song} phase={phase}
            files={files.filter((f) => f.phase === phase)}
            folders={folders.filter((f) => f.phase === phase)}
            driveFiles={driveFiles.filter((f) => f.phase === phase)} />
        ))}

        {driveFiles.some((f) => !f.phase) && (
          <Section title="Googleドライブ" icon={HardDrive} right={<span className="num text-xs text-muted">{driveFiles.filter((f) => !f.phase).length} files</span>}>
            <p className="text-xs text-muted mb-2">曲名が一致したファイルです。ドライブで「原案／プリプロ／本番制作」フォルダに入れると各フェーズに表示されます。</p>
            <ul className="space-y-1">
              {driveFiles.filter((f) => !f.phase).map((f) => <DriveFileRow key={f.id} f={f} showPath />)}
            </ul>
          </Section>
        )}

        <div className="pt-4 border-t border-border">
          <Button variant="ghost" className="text-red-400 hover:bg-red-500/10" onClick={() => setConfirmDel(true)}>
            <Trash2 className="h-4 w-4" />この楽曲を削除
          </Button>
        </div>
      </div>

      <SongFormModal open={editMeta} mode="edit" initial={song} loading={update.isPending} onClose={() => setEditMeta(false)}
        onSubmit={async (v) => { await update.mutateAsync(v); setEditMeta(false); toast.success('保存しました') }} />
      <Confirm open={confirmDel} onClose={() => setConfirmDel(false)} loading={del.isPending}
        title="楽曲を削除" message={`「${song.title}」と登録されたファイル情報をすべて削除します。よろしいですか？`}
        onConfirm={async () => { await del.mutateAsync(); setConfirmDel(false); onClose(); toast.success('削除しました') }} />
    </div>
  )
}

function Section({ title, icon: Icon, children, right }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h3 className="flex items-center gap-2 font-display font-bold">{Icon && <Icon className="h-4 w-4 text-accent" />}{title}</h3>
        {right}
      </div>
      {children}
    </section>
  )
}

function SheetMusic({ song, update }) {
  const ref = useRef()
  const [busy, setBusy] = useState(false)
  const onFile = async (e) => {
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f) return
    setBusy(true)
    try {
      const up = await uploadFile(f, `sheets/${song.id}`)
      await update.mutateAsync({ sheet_music_url: up.file_url })
      toast.success('楽譜を登録しました')
    } catch (err) { toast.error(err.message) } finally { setBusy(false) }
  }
  const onDrive = async () => {
    if (!driveEnabled) return toast.info('Google Drive 連携が未設定です')
    try {
      const [p] = await pickFromDrive({ multi: false, mimeTypes: 'application/pdf,image/jpeg,image/png' })
      if (p) { await update.mutateAsync({ sheet_music_url: p.file_url }); toast.success('楽譜を登録しました') }
    } catch (err) { toast.error(err.message) }
  }
  return (
    <Section title="楽譜" icon={FileText}>
      <div className="rounded-xl border border-border bg-bg/50 p-3 space-y-2">
        {song.sheet_music_url ? (
          <a href={song.sheet_music_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-cyan-300 hover:underline">
            <ExternalLink className="h-4 w-4" />楽譜ファイルを開く
          </a>
        ) : <p className="text-sm text-muted">楽譜は未登録です</p>}
        <div className="flex gap-1.5">
          <input ref={ref} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" hidden onChange={onFile} />
          <Button size="sm" variant="secondary" loading={busy} onClick={() => ref.current.click()}><Upload className="h-3.5 w-3.5" />アップロード</Button>
          <Button size="sm" variant="secondary" onClick={onDrive}><HardDrive className="h-3.5 w-3.5" />Googleドライブ</Button>
        </div>
      </div>
    </Section>
  )
}

function Lyrics({ song, update }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  return (
    <section className="rounded-xl border border-border bg-bg/50">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-3 py-3">
        <span className="flex items-center gap-2 font-display font-bold"><Music2 className="h-4 w-4 text-accent" />歌詞</span>
        <ChevronDown className={cn('h-4 w-4 text-muted transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="px-3 pb-3">
          {editing ? (
            <div className="space-y-2">
              <Textarea rows={12} value={text} onChange={(e) => setText(e.target.value)} placeholder="歌詞を入力" />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>キャンセル</Button>
                <Button size="sm" loading={update.isPending} onClick={async () => {
                  await update.mutateAsync({ lyrics: text || null }); setEditing(false); toast.success('歌詞を保存しました')
                }}>保存</Button>
              </div>
            </div>
          ) : (
            <>
              <p className={cn('whitespace-pre-wrap text-sm leading-7', !song.lyrics && 'text-muted')}>{song.lyrics || '歌詞なし'}</p>
              <Button size="sm" variant="secondary" className="mt-2" onClick={() => { setText(song.lyrics || ''); setEditing(true) }}>
                <Pencil className="h-3.5 w-3.5" />編集
              </Button>
            </>
          )}
        </div>
      )}
    </section>
  )
}

function PhaseSection({ song, phase, files, folders, driveFiles }) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const createFolder = useAction((v) => db.SongFolder.create(v), ['song_folders'])
  const deleteFolder = useAction((id) => db.SongFolder.delete(id), ['song_folders'])

  const names = useMemo(() => {
    const defaults = DEFAULT_SUBFOLDERS[phase]
    const custom = [...folders].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    // 既定フォルダに無い sub_folder を持つファイルも見えるようにする
    const orphan = [...new Set([...files, ...driveFiles].map((f) => f.sub_folder).filter(Boolean))]
      .filter((n) => !defaults.includes(n) && !custom.some((c) => c.name === n))
    return [
      ...defaults.map((n) => ({ name: n })),
      ...custom.map((c) => ({ name: c.name, folder: c })),
      ...orphan.map((n) => ({ name: n })),
    ]
  }, [phase, folders, files, driveFiles])

  const add = async (e) => {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    if (names.some((x) => x.name === n)) return toast.error('同じ名前のフォルダがあります')
    await createFolder.mutateAsync({ song_id: song.id, phase, name: n, sort_order: folders.length })
    setName(''); setAdding(false)
  }

  const noFolder = files.filter((f) => !f.sub_folder)
  const driveNoFolder = driveFiles.filter((f) => !f.sub_folder)
  const total = files.length + driveFiles.length

  return (
    <Section title={phase} right={<span className="num text-xs text-muted">{total} files</span>}>
      <div className="space-y-1.5">
        {names.map(({ name: n, folder }) => (
          <SubFolder key={n} song={song} phase={phase} name={n}
            files={files.filter((f) => f.sub_folder === n)}
            driveFiles={driveFiles.filter((f) => f.sub_folder === n)}
            onDeleteFolder={folder ? () => {
              if (confirm(`フォルダ「${n}」を削除しますか？（中のファイル情報は残ります）`)) deleteFolder.mutate(folder.id)
            } : null} />
        ))}
        {(noFolder.length > 0 || driveNoFolder.length > 0) && (
          <SubFolder song={song} phase={phase} name="" label="（フォルダなし）" files={noFolder} driveFiles={driveNoFolder} />
        )}
        {adding ? (
          <form onSubmit={add} className="flex gap-2">
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="フォルダ名" />
            <Button type="submit" loading={createFolder.isPending}>追加</Button>
            <Button type="button" variant="ghost" onClick={() => setAdding(false)}>×</Button>
          </form>
        ) : (
          <button onClick={() => setAdding(true)} className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2 text-sm text-muted hover:text-slate-200 hover:border-primary/50">
            <Plus className="h-4 w-4" />フォルダを追加
          </button>
        )}
      </div>
    </Section>
  )
}
