# A-BiT

バンド運営管理アプリ（楽曲制作・日程調整・交通費精算）。
Base44 版（band-base-sync.base44.app）を GitHub + Supabase で作り直したもの。

- メンバー: まっすー / はるぴょい / とんちゃん / ひで / ひろむ / まこ（6名。ゆうたろう脱退）
- 画面: 楽曲フォルダ `/`・カレンダー `/calendar`・日程アンケート `/poll`・交通費精算 `/expenses`・仕様書 `/spec`
- 技術: React 18 + Vite / Tailwind CSS / TanStack Query / date-fns / framer-motion / Supabase / Google Drive Picker

## Base44 版からの変更点

| 項目 | Base44 版 | この版 |
|---|---|---|
| バックエンド | Base44（認証・DB・ストレージ） | Supabase（同じ3つを担当） |
| メンバー数 | 7名 | 6名（交通費の平均は ÷6） |
| ログイン | Base44 ログイン | メールのログインリンク（パスワード不要） |
| ホスティング | base44.app | GitHub Pages（自動デプロイ） |

データ構造（Song / SongFile / SongFolder / Event / SchedulePoll / PollResponse / Member / ExpenseAdjustment / BandSavingsAdjustment / BandSavings）と計算式は仕様書 v1.0 のまま。

---

## セットアップ（初回だけ・15分くらい）

### 1. Supabase プロジェクトを作る

1. https://supabase.com で無料アカウントを作り、**New project**（リージョンは Tokyo がおすすめ）
2. 左メニュー **SQL Editor** → `supabase/schema.sql` の中身を貼り付けて **Run**
3. 続けて `supabase/seed.sql` を貼り付けて **Run**（メンバー6名と楽曲25曲が入る）
4. **Authentication → Sign In / Providers → Email** が有効になっていることを確認
5. **Authentication → URL Configuration** の *Site URL* に公開URL（手順3で決まる `https://makotu821-cell.github.io/a-bit/`）を入れる
6. **Project Settings → API** で `Project URL` と `anon public` キーを控える

> **ログインメールに6桁コードを入れる**（ホーム画面に追加したアプリでログインするのに必要）: **Authentication → Emails → Magic Link** のテンプレート本文に `<p>ログインコード: <b>{{ .Token }}</b></p>` を1行追加して保存。

> メンバー以外に使われないように: **Authentication → Sign In / Providers** で *Allow new users to sign up* をオフにし、**Authentication → Users → Invite user** からメンバー6人のメールアドレスを招待するのがおすすめ。

### 2. GitHub に Secrets を登録

リポジトリの **Settings → Secrets and variables → Actions → New repository secret** で:

| 名前 | 値 |
|---|---|
| `VITE_SUPABASE_URL` | Supabase の Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase の anon public キー |
| `VITE_GOOGLE_CLIENT_ID` | （任意）Google Drive 連携用 |
| `VITE_GOOGLE_API_KEY` | （任意）Google Drive 連携用 |
| `VITE_GOOGLE_DRIVE_FOLDER_ID` | （任意）ドライブ自動連携するバンド共有フォルダのID |

#### 各 Secret の値の取り方

**`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`**（Supabase）

1. supabase.com にログイン → 自分のプロジェクトを開く
2. 画面上部の **Connect** ボタンを押すと、URL と公開用キーがまとめて表示される
   （または左下の歯車 **Project Settings** → **API Keys**）
3. `https://xxxx.supabase.co` の形の URL → `VITE_SUPABASE_URL`
4. 公開用キー → `VITE_SUPABASE_ANON_KEY`
   - `sb_publishable_...` で始まる **Publishable key** と、`eyJ...` で始まる **anon public**（Legacy API keys タブ）のどちらでも動く
   - `secret` / `service_role` のキーは**絶対に使わない**（全データを無制限に触れる鍵なので）

**`VITE_GOOGLE_API_KEY`**（Google Cloud）

1. https://console.cloud.google.com にログインし、上部のプロジェクト選択から **新しいプロジェクト**（名前は例: `a-bit`）
2. **APIとサービス → ライブラリ** で **Google Drive API** と **Google Picker API** を検索して、それぞれ **有効にする**
3. **APIとサービス → 認証情報 → 認証情報を作成 → API キー**
4. 表示されたキー（`AIza...`）→ `VITE_GOOGLE_API_KEY`
5. （おすすめ）作ったキーを開き、「アプリケーションの制限」を **ウェブサイト** にして `https://makotu821-cell.github.io/*` を追加、「API の制限」で Drive API と Picker API だけに絞る

**`VITE_GOOGLE_CLIENT_ID`**（Google Cloud・同じプロジェクト）

1. 左メニュー **Google Auth Platform**（または「APIとサービス → OAuth 同意画面」）を開き、初回はアプリ名・サポートメールを入れて登録（対象は **外部**）
2. **対象（Audience）** → **テストユーザー** にメンバーの Gmail を追加（自分も含めて）
3. **クライアント → クライアントを作成** → 種類は **ウェブ アプリケーション**
4. **承認済みの JavaScript 生成元** に `https://makotu821-cell.github.io` を追加（末尾の `/a-bit` は付けない）。手元で試すなら `http://localhost:5173` も
5. 作成後に表示される `xxxx.apps.googleusercontent.com` → `VITE_GOOGLE_CLIENT_ID`（クライアントシークレットは不要）

**`VITE_GOOGLE_DRIVE_FOLDER_ID`**（Googleドライブ）

1. バンドの共有フォルダをブラウザのドライブで開く
2. アドレスバーの `https://drive.google.com/drive/folders/1AbCdEfGh...` の **`folders/` より後ろの文字列**（`?usp=...` が付いていたらその前まで）→ `VITE_GOOGLE_DRIVE_FOLDER_ID`

> **バンド共有のGoogleアカウントを使っている場合**は `root` と入れると「マイドライブ全体」が対象になる。この場合は API キーでは読めないので、各自アプリの「Googleログイン」でその共有アカウントにログインする（テストユーザーにはその共有アカウントの Gmail を追加）。

> Secret を追加・変更したら、**Actions → Deploy to GitHub Pages → Run workflow** で再ビルドすると反映される。

### 3. GitHub Pages を有効化

**Settings → Pages → Build and deployment → Source** を **GitHub Actions** にする。
以降は `main` に push するたびに自動でビルド・公開される（Actions タブで進捗が見られる）。

公開URL: `https://makotu821-cell.github.io/a-bit/`

### Google Drive 連携（任意）

使わない場合は「URL登録」で共有リンクを貼り付ければOK。使う場合:

1. https://console.cloud.google.com でプロジェクトを作成し、**Google Picker API** と **Google Drive API** を有効化
2. **認証情報** で *API キー* と *OAuth クライアントID（ウェブアプリ）* を作成
3. OAuth クライアントの「承認済みの JavaScript 生成元」に `https://makotu821-cell.github.io` を追加
4. 上の Secrets に `VITE_GOOGLE_CLIENT_ID` / `VITE_GOOGLE_API_KEY` を登録

---

## Googleドライブ自動連携（曲ごとのリンク登録が不要になる）

バンドの共有フォルダを1つ指定しておくと、その中のファイルが**曲名で自動的に各曲のフォルダに表示**される。ドライブにファイルを置くだけでOK。

**振り分けルール**

1. 曲名と同じ名前のフォルダの中にあるファイル → その曲（例: `片想い/プリプロ/ドラム/take2.wav`）
2. ファイル名に曲名が入っているファイル → その曲（例: `タイムトラベラー_mix_v3.wav`）。全角半角・大文字小文字・空白・記号の違いは無視
3. 途中に `原案` `プリプロ` `本番制作` フォルダがあればそのフェーズ、`ドラム` `REC` `MIX` などのフォルダ名があればそのサブフォルダに入る。どちらも無ければ曲画面の「Googleドライブ」欄に出る

おすすめのドライブ構成:

```
A-BiT（共有フォルダ）
├─ 片想い
│   ├─ プリプロ
│   │   ├─ ドラム
│   │   └─ ボーカル
│   └─ 本番制作
│       └─ MIX
└─ 音源まとめ        ← ここに「曲名入りファイル名」で放り込んでもOK
```

**設定**

1. 上の「Google Drive 連携」の手順で API キー（と OAuth クライアントID）を作る。**Google Drive API** を有効にしておく
2. 共有フォルダを開き、URL `https://drive.google.com/drive/folders/XXXX` の `XXXX` を Secret `VITE_GOOGLE_DRIVE_FOLDER_ID` に登録
3. 読み取り方は2通り（アプリが自動で判定）
   - フォルダが「リンクを知っている全員が閲覧可」→ ログイン不要で全員に表示される
   - 限定共有のまま → 楽曲画面の「Googleログイン」ボタンで各自ログインすると表示される（OAuth 同意画面が「テスト」状態の間は、メンバーの Gmail を *テストユーザー* に追加しておく）

画面を開いたとき・5分ごと（画面に戻ったとき）に自動で再読み込み。⟳ ボタンで今すぐ同期もできる。
ドライブから来たファイルは緑のドライブアイコンで表示され、削除・移動はドライブ側で行う。

## LINE グループへのお知らせ

### そのまま使える（設定不要）
アンケートで日程を確定すると「LINEでお知らせ」画面が出る。**LINEで送る** → バンドのグループを選んで送信。
確定済みアンケートの「LINEで送る」、カレンダーの「LINE」ボタンからも送れる。

### 自動で送る（LINE bot をグループに入れる・任意）
設定すると、確定した瞬間に bot がグループへ自動投稿する（上の画面は出なくなる）。

1. **LINE公式アカウントを作る**: https://entry.line.biz/ から作成（無料プラン）
2. **Messaging API を有効化**: LINE Official Account Manager → 設定 → Messaging API → 有効にする（プロバイダーは新規作成でOK）
3. **グループ参加を許可**: 同じく 設定 → アカウント設定 → 「グループ・複数人チャットへの参加を許可する」をオン。応答設定の「応答メッセージ」「あいさつメッセージ」はオフ
4. **キーを控える**: https://developers.line.biz/console/ → 作ったチャネル
   - チャネル基本設定 → **チャネルシークレット**
   - Messaging API設定 → **チャネルアクセストークン（長期）** を発行
5. **Supabase に表を作る**: SQL Editor で `supabase/line.sql` を実行
6. **Supabase に関数を置く**: Edge Functions → Deploy a new function → Via Editor
   - 関数名 `line-notify`、中身は `supabase/functions/line-notify/index.ts` を貼り付けて Deploy
   - 関数の Details で **Enforce JWT verification（Verify JWT）をオフ**（LINE からの Webhook を受けるため。アプリからの呼び出しは関数内でログイン確認している）
   - Edge Functions → Secrets に `LINE_CHANNEL_ACCESS_TOKEN` と `LINE_CHANNEL_SECRET` を登録
7. **Webhook をつなぐ**: LINE Developers → Messaging API設定 → Webhook URL に
   `https://<SupabaseのProject ID>.supabase.co/functions/v1/line-notify` を入れて「Webhookの利用」をオン（「検証」で成功すればOK）
8. **bot をバンドのグループに招待**: 入ると「A-BiT の通知をこのグループに送ります」と返事が来る（返事が来ない場合はグループで何か一言送ると認識される）

bot の push は月の無料通数を使う（月2〜3回のお知らせなら無料枠内）。

## 手元で動かす

```bash
npm install
cp .env.example .env   # Supabase の値を入れる
npm run dev            # http://localhost:5173
npm test               # 交通費・貯金の計算テスト
```

Supabase を設定する前に見た目だけ確認したい場合は `http://localhost:5173/?demo` を開くとデモモード（データはブラウザ内のみ保存）で動く。

## Base44 からのデータ移行について

`seed.sql` には Base44 版の公開ページから取得できた **楽曲25曲のタイトルとステータス** を入れてある。
次のデータはログインが必要で取り出せなかったため、新アプリで再登録が必要:

- 楽曲ごとの作曲・作詞・編曲・歌詞・楽譜・カラー
- 楽曲ファイル（計64件。片想い18・偽りの迷宮16・タイムトラベラー10 など）→ ドライブにあるものは、上の自動連携で曲名どおりに置けば登録不要
- カレンダーの予定、日程アンケート、片道交通費、当日変更、バンド貯金の履歴

Base44 のエディタからデータを CSV / JSON で書き出せる場合は、Supabase の **Table Editor → Import data** で取り込める（列名は仕様書と同じ）。
