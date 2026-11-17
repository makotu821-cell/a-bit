// Google ドライブの「バンド共有フォルダ」以下を丸ごと読み込み、楽曲に自動で振り分ける
import { useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { isDemo, isConfigured, supabase } from './supabase'
import { clearDriveToken, currentDriveToken, loginGoogleDrive } from './googleDrive'
import { matchDriveFiles } from './driveMatch'

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY
const ROOT = import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID

// ブラウザから直接読む方式（API キー or 各自 Google ログイン）が設定されているか
const clientModeReady = Boolean(ROOT && (API_KEY || import.meta.env.VITE_GOOGLE_CLIENT_ID))
// サーバー方式（drive-sync 関数）も試すので、Supabase が設定されていれば有効
export const driveSyncEnabled = isDemo || isConfigured
// ROOT に "root" を指定するとマイドライブ全体が対象になる（共有アカウント運用向け）
const IS_MY_DRIVE = ROOT === 'root'
export const driveRootUrl = !ROOT || IS_MY_DRIVE ? 'https://drive.google.com/drive/my-drive' : `https://drive.google.com/drive/folders/${ROOT}`
const _unused = IS_MY_DRIVE ? 'https://drive.google.com/drive/my-drive' : `https://drive.google.com/drive/folders/${ROOT}`

const FOLDER_MIME = 'application/vnd.google-apps.folder'
const FIELDS = 'nextPageToken,files(id,name,mimeType,parents,webViewLink,size,modifiedTime,iconLink)'

export class DriveAuthError extends Error {}
export class DriveConnectError extends Error {}   // サーバー方式で未接続
export class DriveNotSetupError extends Error {}  // どの方式も未設定（表示しない）

/** サーバー方式: drive-sync 関数がバンドのアカウントでドライブを読む。関数が無ければ null */
async function fetchViaServer() {
  try {
    const { data, error } = await supabase.functions.invoke('drive-sync', { body: { action: 'list', root: ROOT || 'root' } })
    if (error || !data) return null
    if (data.ok) return data.tree
    if (data.reason === 'not_connected') throw new DriveConnectError('Googleドライブが未接続です')
    if (data.reason === 'drive_error') throw new Error('Googleドライブの読み込みに失敗しました')
    return null // not_configured など → ブラウザ方式へ
  } catch (e) {
    if (e instanceof DriveConnectError || e.message?.startsWith('Google')) throw e
    return null
  }
}

async function fetchTree() {
  const tree = await fetchViaServer()
  if (tree) return tree
  if (!clientModeReady) throw new DriveNotSetupError('not setup')
  return fetchDriveTree()
}

/** バンドの Google アカウントで1回だけ接続（Google の画面が開く） */
export async function connectDrive() {
  const { data, error } = await supabase.functions.invoke('drive-sync', { body: { action: 'start' } })
  if (error || !data?.ok) throw new Error('接続の準備に失敗しました（drive-sync 関数の設定を確認してください）')
  // 接続が終わると Google → 関数 → アプリに自動で戻ってくる
  window.location.href = data.url
}

async function list(q, pageToken) {
  const token = currentDriveToken()
  // マイドライブ全体は API キーでは読めないので、最初から Google ログインを求める
  if (!token && (IS_MY_DRIVE || !API_KEY)) throw new DriveAuthError('Googleログインが必要です')
  const params = new URLSearchParams({
    q, fields: FIELDS, pageSize: '1000',
    supportsAllDrives: 'true', includeItemsFromAllDrives: 'true',
  })
  if (pageToken) params.set('pageToken', pageToken)
  if (!token) params.set('key', API_KEY || '')
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (token && res.status === 401) clearDriveToken()
  if (res.status === 401 || res.status === 403 || res.status === 404 || (!token && res.status === 400)) {
    throw new DriveAuthError('Googleドライブのフォルダを読めませんでした')
  }
  if (!res.ok) throw new Error(`Google Drive API エラー (${res.status})`)
  return res.json()
}

/** ルートフォルダ以下を幅優先でたどる（親フォルダ40件ずつまとめて問い合わせ） */
export async function fetchDriveTree(rootId = ROOT) {
  const folders = { [rootId]: { id: rootId, name: '', parent: null } }
  const files = []
  let frontier = [rootId]
  while (frontier.length) {
    const next = []
    for (let i = 0; i < frontier.length; i += 40) {
      const chunk = frontier.slice(i, i + 40)
      const q = `(${chunk.map((id) => `'${id}' in parents`).join(' or ')}) and trashed = false`
      let pageToken
      do {
        const data = await list(q, pageToken)
        for (const f of data.files || []) {
          const parent = (f.parents || []).find((p) => chunk.includes(p)) || chunk[0]
          if (f.mimeType === FOLDER_MIME) {
            if (!folders[f.id]) { folders[f.id] = { id: f.id, name: f.name, parent }; next.push(f.id) }
          } else {
            files.push({ ...f, parents: [parent], size: f.size ? Number(f.size) : null })
          }
        }
        pageToken = data.nextPageToken
      } while (pageToken)
    }
    frontier = next
  }
  return { rootId, folders, files, fetchedAt: Date.now() }
}

// デモモード用のダミーのドライブ
function demoTree() {
  const F = (id, name, parent) => ({ id, name, parent })
  const file = (id, name, parent, size = 3_400_000) => ({
    id, name, parents: [parent], size, mimeType: 'audio/wav',
    webViewLink: `https://drive.google.com/file/d/${id}/view`, modifiedTime: new Date().toISOString(),
  })
  return {
    rootId: 'root',
    fetchedAt: Date.now(),
    folders: {
      root: F('root', 'A-BiT', null),
      k: F('k', '片想い', 'root'), kp: F('kp', 'プリプロ', 'k'), kd: F('kd', 'ドラム', 'kp'), kb: F('kb', 'ベース', 'kp'),
      o: F('o', '音源まとめ', 'root'), om: F('om', 'MIX', 'o'),
    },
    files: [
      file('d1', '片想い_drum_take1.wav', 'kd'), file('d2', '片想い_drum_take2.wav', 'kd'),
      file('d3', 'bass_line.wav', 'kb'), file('d4', 'ガイドメロ.mp3', 'kp', 820_000),
      file('d5', 'タイムトラベラー_mix_v3.wav', 'om'), file('d6', '偽りの迷宮 demo.mp3', 'o', 1_200_000),
      { ...file('d7', '冬桜 歌詞', 'root', null), mimeType: 'application/vnd.google-apps.document' },
      file('d8', '機材メモ.txt', 'root', 2000),
    ],
  }
}

/** 楽曲ごとのドライブファイルを返すフック */
export function useDriveFiles(songs, customFolders) {
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: ['drive_tree'],
    queryFn: () => (isDemo ? new Promise((r) => setTimeout(() => r(demoTree()), 400)) : fetchTree()),
    enabled: driveSyncEnabled,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    retry: false,
  })
  const bySong = useMemo(
    () => (q.data ? matchDriveFiles(q.data, songs, customFolders) : {}),
    [q.data, songs, customFolders],
  )
  const total = useMemo(() => Object.values(bySong).reduce((s, l) => s + l.length, 0), [bySong])
  return {
    enabled: driveSyncEnabled && !(q.error instanceof DriveNotSetupError),
    bySong,
    total,
    allCount: q.data?.files.length ?? 0,
    isFetching: q.isFetching,
    fetchedAt: q.data?.fetchedAt,
    needsLogin: q.error instanceof DriveAuthError,
    needsConnect: q.error instanceof DriveConnectError,
    connect: connectDrive,
    error: q.error,
    refresh: () => qc.invalidateQueries({ queryKey: ['drive_tree'] }),
    login: async () => { await loginGoogleDrive(); await qc.invalidateQueries({ queryKey: ['drive_tree'] }) },
  }
}
