-- アプリの設定を保存する表（Googleドライブ接続・LINE bot で使用）
-- ブラウザからは読めない（RLS で全拒否）。Edge Function が管理者キーで読み書きする
create table if not exists public.app_settings (
  key text primary key,
  value text,
  updated_date timestamptz not null default now()
);
alter table public.app_settings enable row level security;
