-- =========================================================
-- 新規登録を「バンドの合言葉」を知っている人だけに制限する
-- 下の 'ここに合言葉' を好きな言葉に変えてから SQL Editor で実行
-- 合言葉を変えたいときは、言葉を書き換えてもう一度実行するだけ
-- =========================================================
create or replace function public.check_band_invite()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.raw_user_meta_data->>'invite', '') <> 'ここに合言葉' then
    raise exception '合言葉が違います';
  end if;
  return new;
end $$;

drop trigger if exists check_band_invite on auth.users;
create trigger check_band_invite before insert on auth.users
  for each row execute function public.check_band_invite();

-- ※ これを入れると、ダッシュボードの「Add user」からは作れなくなります（アプリの新規登録を使う）。
--   外したいときは:  drop trigger if exists check_band_invite on auth.users;
