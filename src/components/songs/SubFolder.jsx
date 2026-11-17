import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { ChevronRight, Folder, FolderOpen, Upload, HardDrive, Link2, ExternalLink, Download, Trash2, FileAudio, X } from 'lucide-react'
import { Button, Input } from '../ui'
import { db, uploadFile, removeStorageFile, useAction } from '../../lib/api'
import { pickFromDrive, driveEnabled } from '../../lib/googleDrive'
import { cn, formatBytes } from '../../lib/utils'

export default function SubFolder({ song, phase, name, label, files, driveFiles = [], onDeleteFolder }) {
  const [open, setOpen] = useState(false)
  const [urlMode, setUrlMode] = useState(false)
  const [link, setLink] = useState({ name: '', url: '' })
  const [busy, setBusy] = useState(false)
  const inputRef = useRef()

  const create = useAction((rows) => db.SongFile.bulkCreate(rows), ['song_files'])
  const remove = useAction(async (f) => { await db.SongFile.delete(f.id); await removeStorageFile(f.storage_path) }, ['song_files'])

  const base = { song_id: song.id, phase, sub_folder: name }

  const onUpload = async (e) => {
    const list = [...(e.target.files || [])]
    e.target.value = ''
    if (!list.length) return
    setBusy(true)
    try {
      const rows = []
      for (const f of list) {
        const up = await uploadFile(f, `songs/${song.id}`)
        rows.push({ ...base, file_name: f.name, ...up })
      }
      await create.mutateAsync(rows)
      toast.success(`${rows.length}件アップロードしました`)
    } catch (err) {
      toast.error('アップロードに失敗しました: ' + err.message)
    } finally { setBusy(false) }
  }

  const onDrive = async () => {
    if (!driveEnabled) return toast.info('Google Drive 連携が未設定です。「URL登録」から共有リンクを貼り付けてください')
    try {
      const picked = await pickFromDrive()
      if (!picked.length) return
      await create.mutateAsync(picked.map((p) => ({ ...base, ...p, file_size: null })))
      toast.success(`${picked.length}件登録しました`)
    } catch (err) { toast.error(err.message || 'Google Drive の読み込みに失敗しました') }
  }

  const onLink = async (e) => {
    e.preventDefault()
    if (!link.url.trim()) return
    await create.mutateAsync([{ ...base, file_name: link.name.trim() || link.url.trim(), file_url: link.url.trim(), file_size: null }])
    setLink({ name: '', url: '' }); setUrlMode(false)
    toast.success('リンクを登録しました')
  }

  const Icon = open ? FolderOpen : Folder
  return (
    <div className="rounded-xl border border-border bg-bg/50">
      <div className="flex items-center">
        <button onClick={() => setOpen(!open)} className="flex-1 flex items-center gap-2 px-3 py-2.5 text-sm text-left">
          <ChevronRight className={cn('h-4 w-4 text-muted transition', open && 'rotate-90')} />
          <Icon className="h-4 w-4 text-accent" />
          <span className="flex-1">{label || name}</span>
          {driveFiles.length > 0 && <HardDrive className="h-3.5 w-3.5 text-emerald-400/80" title="ドライブ連携あり" />}
          <span className="num text-xs text-muted">{files.length + driveFiles.length}</span>
        </button>
        {onDeleteFolder && (
          <button onClick={onDeleteFolder} title="フォルダを削除" className="p-2 mr-1 text-muted hover:text-red-400"><X className="h-4 w-4" /></button>
        )}
      </div>

      {open && (
        <div className="px-3 pb-3 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            <input ref={inputRef} type="file" multiple hidden onChange={onUpload} />
            <Button size="sm" variant="secondary" loading={busy} onClick={() => inputRef.current.click()}><Upload className="h-3.5 w-3.5" />アップロード</Button>
            <Button size="sm" variant="secondary" onClick={onDrive}><HardDrive className="h-3.5 w-3.5" />Googleドライブ</Button>
            <Button size="sm" variant="secondary" onClick={() => setUrlMode(!urlMode)}><Link2 className="h-3.5 w-3.5" />URL登録</Button>
          </div>

          {urlMode && (
            <form onSubmit={onLink} className="space-y-2 rounded-lg bg-surface2 p-2.5">
              <Input placeholder="表示名（任意）" value={link.name} onChange={(e) => setLink({ ...link, name: e.target.value })} />
              <Input placeholder="https://drive.google.com/..." value={link.url} onChange={(e) => setLink({ ...link, url: e.target.value })} required />
              <div className="flex justify-end gap-2">
                <Button size="sm" type="button" variant="ghost" onClick={() => setUrlMode(false)}>キャンセル</Button>
                <Button size="sm" type="submit" loading={create.isPending}>登録</Button>
              </div>
            </form>
          )}

          {driveFiles.length > 0 && (
            <ul className="space-y-1">{driveFiles.map((f) => <DriveFileRow key={f.id} f={f} />)}</ul>
          )}

          {files.length === 0 && driveFiles.length === 0 ? (
            <p className="text-xs text-muted py-2 text-center">ファイルはまだありません</p>
          ) : files.length > 0 && (
            <ul className="space-y-1">
              {files.map((f) => {
                const isLink = f.file_size === null || f.file_size === undefined
                return (
                  <li key={f.id} className="flex items-center gap-2 rounded-lg bg-surface2 px-2.5 py-2">
                    {isLink ? <ExternalLink className="h-4 w-4 text-cyan-300 shrink-0" /> : <FileAudio className="h-4 w-4 text-violet-300 shrink-0" />}
                    <a href={f.file_url} target="_blank" rel="noreferrer" className="flex-1 min-w-0 text-sm truncate hover:underline">{f.file_name}</a>
                    <span className="text-[11px] text-muted shrink-0">{isLink ? 'リンク' : formatBytes(f.file_size)}</span>
                    {!isLink && (
                      <a href={f.file_url} download={f.file_name} target="_blank" rel="noreferrer" className="p-1 text-muted hover:text-slate-100"><Download className="h-4 w-4" /></a>
                    )}
                    <button onClick={() => confirm(`「${f.file_name}」を削除しますか？`) && remove.mutate(f)} className="p-1 text-muted hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

/** ドライブから自動で振り分けられたファイル（読み取り専用。整理はドライブ側で行う） */
export function DriveFileRow({ f, showPath }) {
  return (
    <li className="flex items-center gap-2 rounded-lg bg-emerald-500/5 border border-emerald-500/15 px-2.5 py-2">
      <HardDrive className="h-4 w-4 text-emerald-400 shrink-0" />
      <a href={f.webViewLink} target="_blank" rel="noreferrer" className="flex-1 min-w-0 hover:underline">
        <span className="block text-sm truncate">{f.name}</span>
        {showPath && f.path && <span className="block text-[11px] text-muted truncate">{f.path}</span>}
      </a>
      <span className="text-[11px] text-muted shrink-0">{f.size ? formatBytes(f.size) : 'ドライブ'}</span>
      <a href={f.webViewLink} target="_blank" rel="noreferrer" className="p-1 text-muted hover:text-slate-100" title="ドライブで開く"><ExternalLink className="h-4 w-4" /></a>
    </li>
  )
}
