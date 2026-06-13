// Seed data ported verbatim from the design prototype (Vox Vault.dc.html):
// INIT_SONGS, INIT_LISTS, the initial favorites map, and genSings().

const INIT_SONGS = [
  { id: 1,  title: 'グリッチ・ハート',         artist: 'KairoP',              genre: 'vocaloid', vocals: ['初音ミク'],            tags: ['高速', 'サビ高音'],          date: '2023-11-04', dur: '3:42', views: 2840000, plays: 23 },
  { id: 2,  title: '0と1のララバイ',           artist: 'KairoP',              genre: 'vocaloid', vocals: ['初音ミク', '巡音ルカ'], tags: ['バラード', 'しっとり'],      date: '2022-06-18', dur: '4:05', views: 1520000, plays: 12 },
  { id: 3,  title: '電子の海で',               artist: '硝子P',               genre: 'vocaloid', vocals: ['可不'],                tags: ['ミドル', 'エモい'],          date: '2024-02-29', dur: '3:18', views: 980000,  plays: 8  },
  { id: 4,  title: 'ネオン・カタストロフ',     artist: 'KairoP',              genre: 'vocaloid', vocals: ['初音ミク', '鏡音リン'], tags: ['高速', '盛り上がる', '高音'], date: '2021-09-12', dur: '3:55', views: 5210000, plays: 31 },
  { id: 5,  title: 'エラーラブ',               artist: 'mochP',               genre: 'vocaloid', vocals: ['重音テト'],            tags: ['キュート', '早口'],          date: '2024-08-07', dur: '2:58', views: 410000,  plays: 5  },
  { id: 6,  title: '量子テレパシー',           artist: 'KairoP',              genre: 'vocaloid', vocals: ['星界'],                tags: ['ミドル', '転調あり'],        date: '2023-03-22', dur: '4:21', views: 1870000, plays: 17 },
  { id: 7,  title: '紅蓮の境界線',             artist: 'ASTRA',               genre: 'anime',    work: 'TVアニメ「クロノス・ゲート」',    tags: ['熱い', '高音'],         date: '2022-10-01', dur: '4:12', views: 8800000, plays: 40 },
  { id: 8,  title: 'スターライト・オデッセイ', artist: '結城ハル',            genre: 'anime',    work: 'TVアニメ「銀河鉄道リライト」',   tags: ['爽やか', '覚えやすい'], date: '2023-07-15', dur: '3:48', views: 3300000, plays: 19 },
  { id: 9,  title: '君と最終回',               artist: '結城ハル',            genre: 'anime',    work: '劇場版「サヨナラの向こう側」',   tags: ['バラード', '泣ける'],   date: '2024-01-09', dur: '4:33', views: 2100000, plays: 14 },
  { id: 10, title: 'リブート・マイデイズ',     artist: 'NOVA+',               genre: 'anime',    work: 'TVアニメ「リプレイ・スクール」', tags: ['高速', 'アニメOP'],     date: '2021-04-26', dur: '3:29', views: 6400000, plays: 27 },
  { id: 11, title: '東京ネオンブルース',       artist: 'The Midnights',       genre: 'artist',   tags: ['しっとり', '大人'],          date: '2023-05-30', dur: '4:50', views: 1230000, plays: 11 },
  { id: 12, title: '真夜中ドライブ',           artist: '藍色トリガー',        genre: 'artist',   tags: ['ミドル', 'ドライブ'],        date: '2022-12-12', dur: '5:02', views: 760000,  plays: 9  },
  { id: 13, title: 'フェイドアウト',           artist: '藍色トリガー',        genre: 'artist',   tags: ['バラード', '低音'],          date: '2024-04-18', dur: '3:37', views: 540000,  plays: 6  },
  { id: 14, title: '銀河のアンセム',           artist: 'The Midnights',       genre: 'artist',   tags: ['盛り上がる', '合唱向き'],    date: '2021-08-03', dur: '4:08', views: 2900000, plays: 22 },
  { id: 15, title: 'ラストボス・シンフォニー', artist: 'Chiptune Collective', genre: 'game',     tags: ['壮大', '長尺'],              date: '2023-09-21', dur: '5:44', views: 1800000, plays: 16 },
  { id: 16, title: 'ピクセルの勇者',           artist: '桜井サウンド',        genre: 'game',     tags: ['元気', '早口'],              date: '2022-02-14', dur: '3:11', views: 670000,  plays: 7  },
  { id: 17, title: 'セーブポイント',           artist: 'Chiptune Collective', genre: 'game',     tags: ['チップチューン', '短い'],    date: '2024-06-02', dur: '2:46', views: 320000,  plays: 4  },
];

const INIT_LISTS = [
  { id: 101, name: '深夜の十八番', en: 'MIDNIGHT PICKS', colors: ['#38e8ff', '#ff5db1', '#b18cff', '#ffd24a'], songIds: [2, 9, 12, 14] },
  { id: 102, name: 'ボカロ全力',   en: 'VOCALO FULL',    colors: ['#38e8ff', '#7fd8ff', '#b18cff', '#38e8ff'], songIds: [1, 4, 6] },
  { id: 103, name: 'アニソン履歴', en: 'ANIME LOG',      colors: ['#ff5db1', '#ffd24a', '#ff8fc8', '#b18cff'], songIds: [7, 8, 10] },
  { id: 104, name: '練習中',       en: 'PRACTICING',     colors: ['#b18cff', '#38e8ff', '#ffd24a', '#ff5db1'], songIds: [3, 5] },
];

const INIT_FAVS = [1, 3, 5, 7, 9, 11, 14, 15];

// Deterministic historical sing-dates so the analytics charts are populated
// from the very first launch (mirrors prototype genSings()).
function genSings(id, count) {
  const r = [];
  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor((id * 11 + i * 13 + i * i * 3) % 90);
    r.push(new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10));
  }
  return r;
}

export function seedIfEmpty(db) {
  const count = db.prepare('SELECT COUNT(*) AS n FROM songs').get().n;
  if (count > 0) return;

  const insertSong = db.prepare(`
    INSERT OR IGNORE INTO songs (id, title, artist, genre, vocals, work, tags, date, dur, views, plays, url, created)
    VALUES (@id, @title, @artist, @genre, @vocals, @work, @tags, @date, @dur, @views, @plays, @url, @created)
  `);
  const insertSing = db.prepare('INSERT INTO sings (song_id, date) VALUES (?, ?)');
  const insertFav = db.prepare('INSERT OR IGNORE INTO favorites (song_id) VALUES (?)');
  const insertList = db.prepare(
    'INSERT OR IGNORE INTO playlists (id, name, en, colors, created) VALUES (@id, @name, @en, @colors, @created)'
  );
  const insertListSong = db.prepare(
    'INSERT OR IGNORE INTO playlist_songs (playlist_id, song_id, position) VALUES (?, ?, ?)'
  );

  const seed = db.transaction(() => {
    let order = 0;
    for (const s of INIT_SONGS) {
      insertSong.run({
        id: s.id,
        title: s.title,
        artist: s.artist,
        genre: s.genre,
        vocals: JSON.stringify(s.vocals || []),
        work: s.work || '',
        tags: JSON.stringify(s.tags || []),
        date: s.date,
        dur: s.dur,
        views: s.views,
        plays: s.plays,
        url: '',
        created: order++,
      });
      for (const d of genSings(s.id, s.plays)) insertSing.run(s.id, d);
    }
    for (const id of INIT_FAVS) insertFav.run(id);
    let lorder = 0;
    for (const l of INIT_LISTS) {
      insertList.run({ id: l.id, name: l.name, en: l.en, colors: JSON.stringify(l.colors), created: lorder++ });
      l.songIds.forEach((sid, i) => insertListSong.run(l.id, sid, i));
    }
    db.prepare('INSERT OR IGNORE INTO settings(key, value) VALUES (?, ?)').run('theme', 'holo');
  });
  seed();
}
