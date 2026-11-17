import { Printer } from 'lucide-react'
import { Button, Card } from '../components/ui'
import { MEMBERS, DEFAULT_SUBFOLDERS } from '../lib/constants'

// 仕様書（PDF出力用）。ブラウザの印刷 → PDF として保存できる。
export default function Spec() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs tracking-[0.3em] text-accent">SOFTWARE SPECIFICATION</p>
          <h1 className="font-display text-3xl font-bold">A-BiT アプリ仕様書</h1>
          <p className="text-sm text-muted">バンド運営管理アプリ（楽曲制作・日程調整・交通費精算） v2.0</p>
        </div>
        <Button variant="secondary" onClick={() => window.print()}><Printer className="h-4 w-4" />PDF出力</Button>
      </div>

      <S title="01 概要">
        <T rows={[
          ['目的', '楽曲制作の進行管理、練習日程の調整、交通費の精算・バンド貯金の管理を同一アプリで完結させる'],
          ['利用者', `バンドメンバー ${MEMBERS.length}名（固定）`],
          ['メンバー', MEMBERS.join(' / ')],
          ['画面テーマ', 'ダークテーマ（プライマリ＝紫、アクセント＝シアン）'],
          ['技術構成', 'React 18 + Vite / Tailwind CSS / TanStack Query / date-fns / framer-motion / Supabase（認証・DB・ストレージ）/ Google Drive Picker API'],
        ]} />
      </S>

      <S title="02 画面構成">
        <T head={['パス', '画面', '役割']} rows={[
          ['/', '楽曲フォルダ', '楽曲一覧・検索・詳細（ファイル／歌詞／楽譜）管理'],
          ['/calendar', 'カレンダー', '月表示の予定管理、アンケート結果の参照、予定のまとめコピー'],
          ['/poll', '日程アンケート', '候補日の出欠回答（○△×）と日程確定'],
          ['/expenses', '交通費精算', '月次の交通費精算とバンド貯金の管理'],
          ['/spec', '仕様書', '本仕様書（PDF出力用）'],
        ]} />
        <p className="text-sm text-muted mt-2">768px以上はヘッダー右上のリンクナビ、未満は画面下部固定のタブナビ。</p>
      </S>

      <S title="03 楽曲の既定サブフォルダ">
        <T head={['フェーズ', '既定サブフォルダ']} rows={Object.entries(DEFAULT_SUBFOLDERS).map(([k, v]) => [k, v.join('、')])} />
      </S>

      <S title="05 計算ロジック">
        <pre className="text-sm bg-bg rounded-xl p-4 overflow-x-auto num leading-7">{`A    = Σ(f(i) × 2) ÷ ${MEMBERS.length}       平均往復交通費
C    = A × N                 一律負担額（N = 当月のスタジオ回数）
B(i) = f(i) × 2 × N + Σ(当月の change_amount(i))
S(i) = B(i) − C              > 0 受け取り / < 0 支払い / = 0 ±¥0

D_auto(m) = −Σ(当月mの change_amount)
D(m)      = 手動上書きがあればその値、なければ D_auto(m)
累計      = Σ D(m)`}</pre>
      </S>

      <S title="変更履歴">
        <T rows={[
          ['v2.0', 'Base44 から GitHub + Supabase へ移行。ゆうたろう脱退によりメンバー6名に変更（平均交通費は6名で按分）。Googleドライブ自動連携（曲名一致で各曲フォルダに自動表示）を追加'],
          ['v1.0', 'Base44 版（7名）'],
        ]} />
      </S>
    </div>
  )
}

const S = ({ title, children }) => (
  <Card className="p-5 mb-4 print:border-gray-300">
    <h2 className="font-display text-lg font-bold mb-3 text-violet-300 print:text-black">{title}</h2>
    {children}
  </Card>
)

const T = ({ head, rows }) => (
  <table className="w-full text-sm">
    {head && <thead><tr>{head.map((h) => <th key={h} className="text-left text-muted font-medium pb-2 pr-3">{h}</th>)}</tr></thead>}
    <tbody>
      {rows.map((r, i) => (
        <tr key={i} className="border-t border-border">
          {r.map((c, j) => <td key={j} className={j === 0 ? 'py-2 pr-3 whitespace-nowrap text-slate-300 align-top' : 'py-2 pr-3'}>{c}</td>)}
        </tr>
      ))}
    </tbody>
  </table>
)
