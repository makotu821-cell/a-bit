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
