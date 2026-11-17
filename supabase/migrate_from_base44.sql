-- =========================================================
-- Base44 版からの引き継ぎ（2026-11-17 時点のスクショより）
-- schema.sql と seed.sql の後に、SQL Editor で1回だけ実行
-- 何度実行しても同じ結果になる（上書き）ように書いてある
-- =========================================================

-- ---------- 楽曲のカラー ----------
update public.songs s set color = v.color
from (values
  ('夏風とはしゃぐ君', 'orange'),
  ('スニーカー', 'gray'),
  ('stuck in your heart', 'gray'),
  ('パレット', 'gray'),
  ('Reboot', 'pink'),
  ('Fighter', 'yellow'),
  ('長尾曲', 'blue'),
  ('冬桜', 'red'),
  ('いざ、修羅の道', 'red'),
  ('Micarch', 'pink'),
  ('恋する乙女', 'pink'),
  ('ヒカリ', 'purple'),
  ('輪廻', 'red'),
  ('不釣り合い', 'orange'),
  ('リファーレ', 'pink'),
  ('ストーリー', 'orange'),
  ('陽ハマタ昇ル~Heads tails?~', 'red'),
  ('願い星', 'pink'),
  ('paradier', 'gray'),
  ('缶ジュース', 'orange'),
  ('偽りの迷宮', 'red'),
  ('夏が始まる前に', 'orange'),
  ('シオン', 'purple'),
  ('タイムトラベラー', 'red'),
  ('片想い', 'orange')
) as v(title, color)
where s.title = v.title;

-- ---------- 片道交通費 ----------
update public.members m set transport_cost = v.cost
from (values
  ('まっすー', 2365),
  ('はるぴょい', 209),
  ('とんちゃん', 2600),
  ('ひで', 349),
  ('ひろむ', 393),
  ('まこ', 981)
) as v(name, cost)
where m.name = v.name;

-- ---------- バンド貯金の月別履歴（累計 ¥24,824） ----------
-- 各月の金額を「手動設定」として登録（Base44 の当日変更記録はゆうたろう分も含めて反映済みの値）
insert into public.band_savings_adjustments (month, amount, note) values
  ('2026-06', 384,   'Base44から引き継ぎ'),
  ('2026-07', 2740,  'Base44から引き継ぎ'),
  ('2026-08', 5089,  'Base44から引き継ぎ'),
  ('2026-09', 6261,  'Base44から引き継ぎ'),
  ('2026-10', 10350, 'Base44から引き継ぎ')
on conflict (month) do update set amount = excluded.amount, note = excluded.note;

-- ---------- 今月・先月のスタジオ予定（交通費計算に必要） ----------
-- 時間・場所はわからないので空欄。カレンダーから編集できる
insert into public.events (title, type, date)
select 'スタジオ練習', 'スタジオ', d::date
from (values ('2026-10-14'), ('2026-10-28'), ('2026-11-09'), ('2026-11-18')) as v(d)
where not exists (select 1 from public.events e where e.date = v.d::date and e.type = 'スタジオ');

-- ---------- 12月の確定済みアンケートとスタジオ予定 ----------
-- 回答は確定日（12/9・12/30）の分だけ引き継ぎ（他の候補日の回答は空欄）
do $$
declare pid uuid;
begin
  if not exists (select 1 from public.schedule_polls where title = '2026年12月 スタジオ候補日') then
    insert into public.schedule_polls (title, status, candidate_dates, decided_dates)
    values (
      '2026年12月 スタジオ候補日', '確定',
      (select array_agg(to_char(d, 'YYYY-MM-DD') order by d)
         from generate_series(date '2026-12-01', date '2026-12-31', interval '1 day') d),
      array['2026-12-09', '2026-12-30']
    )
    returning id into pid;

    insert into public.poll_responses (poll_id, member_name, responses, date_memos, created_date) values
      (pid, 'ひろむ',     '{"2026-12-09":"ok","2026-12-30":"ok"}', '{}', now() - interval '6 minutes'),
      (pid, 'まこ',       '{"2026-12-09":"ok","2026-12-30":"ok"}', '{}', now() - interval '5 minutes'),
      (pid, 'まっすー',   '{"2026-12-09":"ok","2026-12-30":"ok"}', '{}', now() - interval '4 minutes'),
      (pid, 'ひで',       '{"2026-12-09":"ok","2026-12-30":"ok"}', '{}', now() - interval '3 minutes'),
      (pid, 'はるぴょい', '{"2026-12-09":"ng","2026-12-30":"ok"}', '{"2026-12-30":"休み確定"}', now() - interval '2 minutes'),
      (pid, 'とんちゃん', '{"2026-12-09":"ok","2026-12-30":"ok"}', '{}', now() - interval '1 minutes');
  end if;
end $$;

insert into public.events (title, type, date, start_time, end_time, location)
select 'スタジオ練習', 'スタジオ', d::date, '11:00', '15:00', '川崎'
from (values ('2026-12-09'), ('2026-12-30')) as v(d)
where not exists (select 1 from public.events e where e.date = v.d::date and e.type = 'スタジオ');
