import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Folder, Plus, Search, Music, HardDrive, RefreshCw, LogIn, ExternalLink } from 'lucide-react'
import { PageHeader } from '../components/Layout'
import { Badge, Button, Drawer, Empty, Input, Skeleton } from '../components/ui'
import SongFormModal from '../components/songs/SongFormModal'
import SongDrawer from '../components/songs/SongDrawer'
import { db, useAction, useSongFiles, useSongFolders, useSongs } from '../lib/api'
import { COLORS, STATUS_STYLE } from '../lib/constants'
import { useDriveFiles, driveRootUrl } from '../lib/driveSync'
import { cn } from '../lib/utils'

export default function Songs() {
  const { data: songs = [], isLoading } = useSongs()
  const { data: files = [] } = useSongFiles()
  const { data: folders = [] } = useSongFolders()
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)
  const [selectedId, setSelectedId] = useState(null)

  const create = useAction((v) => db.Song.create(v), ['songs'])
  const drive = useDriveFiles(songs, folders)

  // 手動登録済みのリンクと同じドライブファイルは二重に出さない
  const driveBySong = useMemo(() => {
    const out = {}
    for (const [songId, list] of Object.entries(drive.bySong)) {
      const urls = files.filter((f) => f.song_id === songId).map((f) => f.file_url || '')
      out[songId] = list.filter((d) => !urls.some((u) => u.includes(d.id)))
    }
    return out
  }, [drive.bySong, files])

  const counts = useMemo(() => {
    const m = {}
    files.forEach((f) => { m[f.song_id] = (m[f.song_id] || 0) + 1 })
    Object.entries(driveBySong).forEach(([id, l]) => { m[id] = (m[id] || 0) + l.length })
    return m
  }, [files, driveBySong])

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase()
    return k ? songs.filter((s) => s.title.toLowerCase().includes(k)) : songs
  }, [songs, q])

  const selected = songs.find((s) => s.id === selectedId)

  return (
    <div>
      <PageHeader title="楽曲フォルダ" sub={isLoading ? '' : `${songs.length}曲`}>
        <Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" />楽曲追加</Button>
      </PageHeader>

      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
        <Input className="pl-9" placeholder="楽曲名で検索" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {drive.enabled && <DriveStatus drive={drive} />}

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Empty icon={Music} title={songs.length ? '該当する楽曲がありません' : 'まだ楽曲がありません'}>
          {songs.length ? '検索ワードを変えてみてください' : '「楽曲追加」から最初の曲を登録しましょう'}
        </Empty>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((s, i) => {
            const c = COLORS[s.color] || COLORS.purple
            return (
              <motion.button key={s.id} onClick={() => setSelectedId(s.id)}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.3) }}
                whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
                className="relative text-left rounded-2xl p-4 h-32 flex flex-col justify-between overflow-hidden border border-white/10 shadow-lg"
                style={{ background: `linear-gradient(140deg, ${c.from}, ${c.to})` }}>
                <div className="flex items-start justify-between">
                  <Folder className="h-7 w-7 text-white/90" fill="rgba(255,255,255,0.15)" />
                  <Badge className={`${STATUS_STYLE[s.status]} backdrop-blur bg-black/30`}>{s.status}</Badge>
                </div>
                <div>
                  <p className="font-bold text-white leading-tight line-clamp-2 drop-shadow">{s.title}</p>
                  <p className="num text-xs text-white/70 mt-0.5">{counts[s.id] || 0} files</p>
                </div>
              </motion.button>
            )
          })}
        </div>
      )}

      <SongFormModal open={adding} onClose={() => setAdding(false)} loading={create.isPending}
        onSubmit={async (v) => {
          try { await create.mutateAsync(v); setAdding(false); toast.success('楽曲を追加しました') }
          catch (e) { toast.error(e.message) }
        }} />

      <Drawer open={!!selected} onClose={() => setSelectedId(null)}>
        {selected && (
          <SongDrawer song={selected} onClose={() => setSelectedId(null)}
            files={files.filter((f) => f.song_id === selected.id)}
            folders={folders.filter((f) => f.song_id === selected.id)}
            driveFiles={driveBySong[selected.id] || []} />
        )}
      </Drawer>
    </div>
  )
}

function DriveStatus({ drive }) {
  const time = drive.fetchedAt ? new Date(drive.fetchedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : ''
  return (
    <div className="-mt-2 mb-4 flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs">
      <HardDrive className="h-4 w-4 text-accent shrink-0" />
      <div className="flex-1 min-w-0">
        {drive.needsConnect ? (
          <span className="text-amber-300">ドライブ未接続：バンドのGoogleアカウントで最初に1回だけ接続してください</span>
        ) : drive.needsLogin ? (
          <span className="text-amber-300">ドライブ連携: フォルダを読むにはGoogleログインが必要です</span>
        ) : drive.error ? (
          <span className="text-red-300">ドライブ連携エラー: {drive.error.message}</span>
        ) : drive.isFetching && !drive.fetchedAt ? (
          <span className="text-muted">Googleドライブを読み込み中…</span>
        ) : (
          <span className="text-muted">
            ドライブ連携 <span className="num text-slate-200">{drive.total}</span>件を曲に自動振り分け
            <span className="hidden sm:inline">（全{drive.allCount}件中）</span>{time && ` ・ ${time}更新`}
          </span>
        )}
      </div>
      {drive.needsConnect ? (
        <Button size="sm" onClick={() => drive.connect().catch((e) => toast.error(e.message))}>
          <LogIn className="h-3.5 w-3.5" />接続
        </Button>
      ) : drive.needsLogin ? (
        <Button size="sm" onClick={() => drive.login().catch((e) => toast.error(e.message || 'ログインできませんでした'))}>
          <LogIn className="h-3.5 w-3.5" />Googleログイン
        </Button>
      ) : (
        <>
          {driveRootUrl && <a href={driveRootUrl} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg text-muted hover:text-slate-200" title="ドライブを開く"><ExternalLink className="h-4 w-4" /></a>}
          <button onClick={drive.refresh} className="p-1.5 rounded-lg text-muted hover:text-slate-200" title="今すぐ同期">
            <RefreshCw className={cn('h-4 w-4', drive.isFetching && 'animate-spin')} />
          </button>
        </>
      )}
    </div>
  )
}
