import { test } from 'node:test'
import assert from 'node:assert/strict'
import { matchDriveFiles, norm } from './driveMatch.js'

const songs = [
  { id: 's1', title: '片想い' },
  { id: 's2', title: 'タイムトラベラー' },
  { id: 's3', title: 'stuck in your heart' },
  { id: 's4', title: '夏' }, // 1文字の曲名はファイル名一致に使わない
  { id: 's5', title: '夏が始まる前に' },
]
const F = (id, name, parent) => ({ id, name, parent })
const tree = {
  rootId: 'root',
  folders: {
    root: F('root', 'A-BiT', null),
    f1: F('f1', '片想い', 'root'),
    f2: F('f2', 'プリプロ', 'f1'),
    f3: F('f3', 'ドラム', 'f2'),
    f4: F('f4', '音源置き場', 'root'),
    f5: F('f5', '本番制作', 'f4'),
    f6: F('f6', 'MIX', 'f5'),
    f7: F('f7', 'REC', 'f1'),
  },
  files: [
    { id: 'a', name: 'take2.wav', parents: ['f3'] },                       // フォルダ名で片想い/プリプロ/ドラム
    { id: 'b', name: 'タイムトラベラー_mix_v3.wav', parents: ['f6'] },     // ファイル名で一致、本番制作/MIX
    { id: 'c', name: 'Stuck In Your Heart (demo).mp3', parents: ['root'] }, // 大文字小文字・空白無視
    { id: 'd', name: '夏が始まる前に 歌詞.pdf', parents: ['f4'] },          // 長い曲名を優先（「夏」ではない）
    { id: 'e', name: 'memo.txt', parents: ['root'] },                      // どれにも一致しない
    { id: 'g', name: 'タイムトラベラー.wav', parents: ['f2'] },            // フォルダ（片想い）優先
    { id: 'h', name: 'vocal.wav', parents: ['f7'] },                       // REC は本番制作だけ → フェーズ推定
  ],
}

test('正規化', () => {
  assert.equal(norm('Ｓｔｕｃｋ In_Your-Heart！'), 'stuckinyourheart')
})

test('曲ごとに振り分け', () => {
  const r = matchDriveFiles(tree, songs)
  assert.deepEqual(r.s1.map((f) => f.id).sort(), ['a', 'g', 'h'])
  const a = r.s1.find((f) => f.id === 'a')
  assert.equal(a.phase, 'プリプロ')
  assert.equal(a.sub_folder, 'ドラム')
  assert.equal(a.path, '片想い / プリプロ / ドラム')
  const g = r.s1.find((f) => f.id === 'g')
  assert.equal(g.phase, 'プリプロ')
  assert.equal(g.sub_folder, null)
  const h = r.s1.find((f) => f.id === 'h')
  assert.equal(h.phase, '本番制作')
  assert.equal(h.sub_folder, 'REC')

  assert.equal(r.s2.length, 1)
  assert.equal(r.s2[0].phase, '本番制作')
  assert.equal(r.s2[0].sub_folder, 'MIX')
  assert.equal(r.s3[0].id, 'c')
  assert.equal(r.s3[0].phase, null)
  assert.equal(r.s5[0].id, 'd')
  assert.equal(r.s4, undefined)
})

test('カスタムフォルダにも振り分け', () => {
  const t = {
    rootId: 'root',
    folders: { root: F('root', 'x', null), k: F('k', '片想い', 'root'), p: F('p', '原案', 'k'), q: F('q', '弾き語り', 'p') },
    files: [{ id: 'z', name: 'a.m4a', parents: ['q'] }],
  }
  const r = matchDriveFiles(t, songs, [{ song_id: 's1', phase: '原案', name: '弾き語り' }])
  assert.equal(r.s1[0].sub_folder, '弾き語り')
  assert.equal(r.s1[0].phase, '原案')
})
