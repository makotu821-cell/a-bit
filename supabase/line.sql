-- LINE 自動通知を使う場合だけ実行（bot が入ったグループの ID を保存する表）
create table if not exists public.app_settings (
  key text primary key,
  value text,
  updated_date timestamptz not null default now()
);
-- アプリ（ブラウザ）からは読めないようにする。Edge Function は管理者キーで読み書きする
alter table public.app_settings enable row level security;
