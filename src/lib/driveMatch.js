// Google ドライブのファイルを楽曲に自動で振り分けるロジック（UI・通信から独立）
import { DEFAULT_SUBFOLDERS, PHASES } from './constants.js'

/** 比較用の正規化: 全角半角・大文字小文字・空白・記号の違いを無視する */
export const norm = (s) =>
  (s || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s_\-‐－・~〜～!?！？、。,.:：;；()（）「」『』[\]【】'"“”’]/g, '')

const stripExt = (name) => name.replace(/\.[a-z0-9]{1,5}$/i, '')

const ALL_SUBS = Object.entries(DEFAULT_SUBFOLDERS).flatMap(([phase, subs]) => subs.map((name) => ({ phase, name })))

/**
 * @param {{ folders: Record<string,{id,name,parent}>, files: Array<{id,name,parents,...}>, rootId: string }} tree
 * @param {Array<{id,title}>} songs
 * @param {Array<{song_id,phase,name}>} customFolders  アプリで追加したカスタムフォルダ
 * @returns {Record<string, Array>} song_id → 振り分け済みファイル
 *
 * 振り分けルール
 *  1. 祖先フォルダに「曲名と同じ名前のフォルダ」があれば、その曲（いちばん近いフォルダ優先）
 *  2. なければ、ファイル名に曲名が含まれていればその曲（長い曲名を優先）
 *  3. 祖先フォルダ名が「原案／プリプロ／本番制作」ならそのフェーズ、
 *     「ドラム」「REC」などの既定サブフォルダ名やカスタムフォルダ名ならそのサブフォルダに入れる
 */
export function matchDriveFiles(tree, songs, customFolders = []) {
  const songsN = songs
    .map((s) => ({ s, n: norm(s.title) }))
    .filter((x) => x.n.length >= 2)
    .sort((a, b) => b.n.length - a.n.length)
  const byNorm = new Map(songsN.map((x) => [x.n, x.s]))
  const phaseByNorm = new Map(PHASES.map((p) => [norm(p), p]))

  const ancestorsOf = (file) => {
    const out = []
    let id = (file.parents || []).find((p) => tree.folders[p]) || null
    const seen = new Set()
    while (id && id !== tree.rootId && tree.folders[id] && !seen.has(id)) {
      seen.add(id)
      out.push(tree.folders[id])
      id = tree.folders[id].parent
    }
    return out // 近い順
  }

  const result = {}
  for (const file of tree.files) {
    const anc = ancestorsOf(file)
    let song = null
    for (const a of anc) {
      const hit = byNorm.get(norm(a.name))
      if (hit) { song = hit; break }
    }
    if (!song) {
      const base = norm(stripExt(file.name))
      song = songsN.find((x) => base.includes(x.n))?.s || null
    }
    if (!song) continue

    // フェーズ
    let phase = null
    for (const a of anc) {
      const p = phaseByNorm.get(norm(a.name))
      if (p) { phase = p; break }
    }
    // サブフォルダ（近い祖先から）
    const custom = customFolders.filter((f) => f.song_id === song.id)
    let sub = null
    for (const a of anc) {
      const n = norm(a.name)
      const c = custom.find((f) => norm(f.name) === n && (!phase || f.phase === phase))
      if (c) { sub = c.name; phase ||= c.phase; break }
      const cands = ALL_SUBS.filter((d) => norm(d.name) === n && (!phase || d.phase === phase))
      if (cands.length) {
        sub = cands[0].name
        if (!phase && cands.length === 1) phase = cands[0].phase
        break
      }
    }
    if (!phase) sub = null

    ;(result[song.id] ||= []).push({
      ...file,
      phase,
      sub_folder: sub,
      path: anc.map((a) => a.name).reverse().join(' / '),
    })
  }
  for (const list of Object.values(result)) list.sort((a, b) => a.name.localeCompare(b.name, 'ja'))
  return result
}
