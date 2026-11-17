-- =========================================================
-- A-BiT 初期データ（schema.sql の後に実行）
-- メンバー6名（ゆうたろう脱退後）と、Base44 版から移した楽曲25曲
-- 片道交通費は 0 で入れてあるので、アプリの「片道設定」から入力してください
-- =========================================================

insert into public.members (name, transport_cost, color) values
  ('まっすー', 0, 'green'),
  ('はるぴょい', 0, 'purple'),
  ('とんちゃん', 0, 'yellow'),
  ('ひで', 0, 'red'),
  ('ひろむ', 0, 'pink'),
  ('まこ', 0, 'orange')
on conflict (name) do nothing;

-- 楽曲（タイトル・ステータス）。カラーは後から各楽曲の編集で変更できます
insert into public.songs (title, status, created_date) values
  ('片想い',                     'プリプロ', now() - interval '25 minutes'),
  ('タイムトラベラー',           '完成',     now() - interval '24 minutes'),
  ('シオン',                     '原案',     now() - interval '23 minutes'),
  ('夏が始まる前に',             '完成',     now() - interval '22 minutes'),
  ('偽りの迷宮',                 '完成',     now() - interval '21 minutes'),
  ('缶ジュース',                 '完成',     now() - interval '20 minutes'),
  ('paradier',                   '完成',     now() - interval '19 minutes'),
  ('願い星',                     '完成',     now() - interval '18 minutes'),
  ('陽ハマタ昇ル~Heads tails?~', '完成',     now() - interval '17 minutes'),
  ('ストーリー',                 '完成',     now() - interval '16 minutes'),
  ('リファーレ',                 'プリプロ', now() - interval '15 minutes'),
  ('不釣り合い',                 '完成',     now() - interval '14 minutes'),
  ('輪廻',                       '完成',     now() - interval '13 minutes'),
  ('ヒカリ',                     '完成',     now() - interval '12 minutes'),
  ('恋する乙女',                 '本番制作', now() - interval '11 minutes'),
  ('Micarch',                    '完成',     now() - interval '10 minutes'),
  ('いざ、修羅の道',             'プリプロ', now() - interval '9 minutes'),
  ('冬桜',                       '完成',     now() - interval '8 minutes'),
  ('長尾曲',                     '原案',     now() - interval '7 minutes'),
  ('Fighter',                    '原案',     now() - interval '6 minutes'),
  ('Reboot',                     '完成',     now() - interval '5 minutes'),
  ('パレット',                   '原案',     now() - interval '4 minutes'),
  ('stuck in your heart',        '原案',     now() - interval '3 minutes'),
  ('スニーカー',                 '原案',     now() - interval '2 minutes'),
  ('夏風とはしゃぐ君',           '原案',     now() - interval '1 minutes');
