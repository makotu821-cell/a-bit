// メンバー（固定リスト）。ゆうたろう脱退により6名。
export const MEMBERS = ['まっすー', 'はるぴょい', 'とんちゃん', 'ひで', 'ひろむ', 'まこ']

export const MEMBER_COLORS = {
  'まっすー': 'green',
  'はるぴょい': 'purple',
  'とんちゃん': 'yellow',
  'ひで': 'red',
  'ひろむ': 'pink',
  'まこ': 'orange',
}

// フォルダ・メンバーで使う8色
export const COLORS = {
  purple: { label: '紫', hex: '#8b5cf6', from: '#7c3aed', to: '#4c1d95', text: 'text-violet-300', ring: 'ring-violet-500/40', bg: 'bg-violet-500/15' },
  orange: { label: 'オレンジ', hex: '#f97316', from: '#f97316', to: '#9a3412', text: 'text-orange-300', ring: 'ring-orange-500/40', bg: 'bg-orange-500/15' },
  yellow: { label: '黄', hex: '#eab308', from: '#eab308', to: '#854d0e', text: 'text-yellow-300', ring: 'ring-yellow-500/40', bg: 'bg-yellow-500/15' },
  pink: { label: 'ピンク', hex: '#ec4899', from: '#ec4899', to: '#9d174d', text: 'text-pink-300', ring: 'ring-pink-500/40', bg: 'bg-pink-500/15' },
  red: { label: '赤', hex: '#ef4444', from: '#ef4444', to: '#991b1b', text: 'text-red-300', ring: 'ring-red-500/40', bg: 'bg-red-500/15' },
  blue: { label: '青', hex: '#3b82f6', from: '#3b82f6', to: '#1e3a8a', text: 'text-blue-300', ring: 'ring-blue-500/40', bg: 'bg-blue-500/15' },
  green: { label: '緑', hex: '#22c55e', from: '#22c55e', to: '#14532d', text: 'text-green-300', ring: 'ring-green-500/40', bg: 'bg-green-500/15' },
  gray: { label: '灰', hex: '#6b7280', from: '#6b7280', to: '#1f2937', text: 'text-gray-300', ring: 'ring-gray-500/40', bg: 'bg-gray-500/15' },
}

export const SONG_STATUSES = ['原案', 'プリプロ', '本番制作', '完成']
export const STATUS_STYLE = {
  '原案': 'bg-slate-500/20 text-slate-200 border-slate-400/30',
  'プリプロ': 'bg-cyan-500/15 text-cyan-300 border-cyan-400/30',
  '本番制作': 'bg-amber-500/15 text-amber-300 border-amber-400/30',
  '完成': 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
}

export const PHASES = ['原案', 'プリプロ', '本番制作']
export const DEFAULT_SUBFOLDERS = {
  '原案': ['音源', 'cubase'],
  'プリプロ': ['ドラム', 'ベース', 'ピアノ', 'ギター増田', 'ギター大夢', 'ボーカル', 'コーラス', 'トランペット', '他打ち込み', 'cubase', 'MIXwav'],
  '本番制作': ['REC', 'MIX', 'マスタリング'],
}

export const EVENT_TYPES = ['スタジオ', 'ライブ', 'その他']
export const POLL_STATUSES = ['回答中', '締め切り', '確定']

export const ANSWER_MARK = { ok: '○', maybe: '△', ng: '×' }

export const DEFAULT_DECIDE = { start: '11:00', end: '15:00', location: '川崎' }
