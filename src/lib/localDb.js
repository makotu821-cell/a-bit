// デモモード: Supabase 未設定でも ?demo で画面を試せるよう、ブラウザの localStorage に保存する簡易DB
import { MEMBERS, MEMBER_COLORS } from './constants.js'

const KEY = 'a-bit-demo-db'
const SEED_SONGS = [
  ['夏風とはしゃぐ君', '原案'], ['スニーカー', '原案'], ['stuck in your heart', '原案'], ['パレット', '原案'],
  ['Reboot', '完成'], ['Fighter', '原案'], ['長尾曲', '原案'], ['冬桜', '完成'], ['いざ、修羅の道', 'プリプロ'],
  ['Micarch', '完成'], ['恋する乙女', '本番制作'], ['ヒカリ', '完成'], ['輪廻', '完成'], ['不釣り合い', '完成'],
  ['リファーレ', 'プリプロ'], ['ストーリー', '完成'], ['陽ハマタ昇ル~Heads tails?~', '完成'], ['願い星', '完成'],
  ['paradier', '完成'], ['缶ジュース', '完成'], ['偽りの迷宮', '完成'], ['夏が始まる前に', '完成'], ['シオン', '原案'],
  ['タイムトラベラー', '完成'], ['片想い', 'プリプロ'],
]

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* noop */ }
  const now = Date.now()
  const colors = ['purple', 'orange', 'yellow', 'pink', 'red', 'blue', 'green', 'gray']
  const data = {
    songs: SEED_SONGS.map(([title, status], i) => ({
      id: crypto.randomUUID(), title, status, color: colors[i % colors.length],
      created_date: new Date(now - (SEED_SONGS.length - i) * 60000).toISOString(),
    })).reverse(),
    members: MEMBERS.map((name, i) => ({ id: crypto.randomUUID(), name, transport_cost: 0, color: MEMBER_COLORS[name], created_date: new Date(now + i).toISOString() })),
  }
  save(data)
  return data
}
function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)) } catch { /* noop */ } }

const sorter = (order) => {
  const desc = order.startsWith('-')
  const col = order.replace(/^-/, '')
  return (a, b) => {
    const x = a[col] ?? ''; const y = b[col] ?? ''
    return (x < y ? -1 : x > y ? 1 : 0) * (desc ? -1 : 1)
  }
}

export function localEntity(table) {
  const rows = () => load()[table] || []
  const write = (fn) => { const d = load(); d[table] = fn(d[table] || []); save(d); return d[table] }
  const stamp = (v) => ({ id: crypto.randomUUID(), created_date: new Date().toISOString(), updated_date: new Date().toISOString(), ...v })
  return {
    async list(order = '-created_date') { return [...rows()].sort(sorter(order)) },
    async filter(where, order = 'created_date') {
      return rows().filter((r) => Object.entries(where).every(([k, v]) => r[k] === v)).sort(sorter(order))
    },
    async create(v) { const r = stamp(v); write((l) => [...l, r]); return r },
    async bulkCreate(list) { const rs = list.map(stamp); write((l) => [...l, ...rs]); return rs },
    async update(id, v) {
      let out
      write((l) => l.map((r) => (r.id === id ? (out = { ...r, ...v, updated_date: new Date().toISOString() }) : r)))
      return out
    },
    async delete(id) {
      write((l) => l.filter((r) => r.id !== id))
      // 楽曲・アンケート削除時の関連データ削除（DB の on delete cascade 相当）
      const d = load()
      if (table === 'songs') { d.song_files = (d.song_files || []).filter((f) => f.song_id !== id); d.song_folders = (d.song_folders || []).filter((f) => f.song_id !== id) }
      if (table === 'schedule_polls') d.poll_responses = (d.poll_responses || []).filter((r) => r.poll_id !== id)
      save(d)
    },
  }
}
