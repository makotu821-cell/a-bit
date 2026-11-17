-- =========================================================
-- A-BiT Supabase スキーマ
-- Supabase ダッシュボード → SQL Editor に貼り付けて実行
-- （Base44 のエンティティ構成をそのまま Postgres に移植）
-- =========================================================

create extension if not exists "pgcrypto";

-- 共通: id / created_date / updated_date / created_by_id
create or replace function public.touch_updated_date()
returns trigger language plpgsql as $$
begin
  new.updated_date = now();
  return new;
end $$;

-- ---------- Song（楽曲） ----------
create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status text not null default '原案' check (status in ('原案','プリプロ','本番制作','完成')),
  composer text,
  lyricist text,
  arranger text,
  lyrics text,
  sheet_music_url text,
  memo text,
  color text default 'purple',
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id uuid default auth.uid()
);

-- ---------- SongFile（楽曲ファイル） ----------
create table if not exists public.song_files (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  phase text check (phase in ('原案','プリプロ','本番制作')),
  sub_folder text,
  file_size bigint,               -- null はリンク扱い
  storage_path text,              -- Supabase Storage 上のパス（削除用）
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id uuid default auth.uid()
);
create index if not exists song_files_song_id_idx on public.song_files(song_id);

-- ---------- SongFolder（カスタムフォルダ） ----------
create table if not exists public.song_folders (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs(id) on delete cascade,
  phase text not null check (phase in ('原案','プリプロ','本番制作')),
  name text not null,
  sort_order int,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id uuid default auth.uid()
);

-- ---------- Event（予定） ----------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null default 'スタジオ' check (type in ('スタジオ','ライブ','その他')),
  date date not null,
  start_time text,
  end_time text,
  location text,
  memo text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id uuid default auth.uid()
);
create index if not exists events_date_idx on public.events(date);

-- ---------- SchedulePoll（日程アンケート） ----------
create table if not exists public.schedule_polls (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status text not null default '回答中' check (status in ('回答中','締め切り','確定')),
  candidate_dates text[] not null default '{}',
  decided_dates text[] not null default '{}',
  memo text,
  decide_memo text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id uuid default auth.uid()
);

-- ---------- PollResponse（出欠回答） ----------
create table if not exists public.poll_responses (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.schedule_polls(id) on delete cascade,
  member_name text not null,
  responses jsonb not null default '{}'::jsonb,   -- { "YYYY-MM-DD": "ok" | "maybe" | "ng" }
  date_memos jsonb not null default '{}'::jsonb,  -- { "YYYY-MM-DD": "コメント" }
  memo text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id uuid default auth.uid(),
  unique (poll_id, member_name)
);

-- ---------- Member（メンバー） ----------
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  transport_cost int not null default 0,  -- 片道交通費（円）
  color text default 'blue',
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id uuid default auth.uid()
);

-- ---------- ExpenseAdjustment（当日の交通費変更） ----------
create table if not exists public.expense_adjustments (
  id uuid primary key default gen_random_uuid(),
  month text not null,          -- YYYY-MM
  member_name text not null,
  event_date text not null,     -- YYYY-MM-DD
  change_amount int default 0,  -- 通常往復費との差額（安い=マイナス）
  note text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id uuid default auth.uid()
);

-- ---------- BandSavingsAdjustment（バンド貯金の月次上書き） ----------
create table if not exists public.band_savings_adjustments (
  id uuid primary key default gen_random_uuid(),
  month text not null unique,   -- YYYY-MM
  amount int,
  note text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id uuid default auth.uid()
);

-- ---------- BandSavings（メンバー別残高・将来拡張用） ----------
create table if not exists public.band_savings (
  id uuid primary key default gen_random_uuid(),
  member_name text not null,
  balance int default 0,
  note text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id uuid default auth.uid()
);

-- ---------- updated_date トリガー & RLS ----------
-- データはメンバー全員で共有（ログイン済みユーザーは全件読み書き可）。
do $$
declare t text;
begin
  foreach t in array array['songs','song_files','song_folders','events','schedule_polls',
    'poll_responses','members','expense_adjustments','band_savings_adjustments','band_savings']
  loop
    execute format('drop trigger if exists trg_touch on public.%I', t);
    execute format('create trigger trg_touch before update on public.%I for each row execute function public.touch_updated_date()', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "members full access" on public.%I', t);
    execute format('create policy "members full access" on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- ---------- ファイル保存用 Storage バケット ----------
insert into storage.buckets (id, name, public)
values ('song-files', 'song-files', true)
on conflict (id) do nothing;

drop policy if exists "auth upload song-files" on storage.objects;
create policy "auth upload song-files" on storage.objects
  for insert to authenticated with check (bucket_id = 'song-files');

drop policy if exists "auth delete song-files" on storage.objects;
create policy "auth delete song-files" on storage.objects
  for delete to authenticated using (bucket_id = 'song-files');

drop policy if exists "public read song-files" on storage.objects;
create policy "public read song-files" on storage.objects
  for select using (bucket_id = 'song-files');
