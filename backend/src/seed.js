import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── static seed data (mirrors the original prototype) ────────────────────────
const INIT_SONGS = [
  { id: 1,  title: 'グリッチ・ハート',         artist: 'KairoP',              genre: 'vocaloid', vocals: ['初音ミク'],            tags: ['高速', 'サビ高音'],           date: '2023-11-04', dur: '3:42', views: 2840000, plays: 23 },
  { id: 2,  title: '0と1のララバイ',           artist: 'KairoP',              genre: 'vocaloid', vocals: ['初音ミク', '巡音ルカ'], tags: ['バラード', 'しっとり'],       date: '2022-06-18', dur: '4:05', views: 1520000, plays: 12 },
  { id: 3,  title: '電子の海で',               artist: '硝子P',               genre: 'vocaloid', vocals: ['可不'],                tags: ['ミドル', 'エモい'],           date: '2024-02-29', dur: '3:18', views: 980000,  plays: 8  },
  { id: 4,  title: 'ネオン・カタストロフ',     artist: 'KairoP',              genre: 'vocaloid', vocals: ['初音ミク', '鏡音リン'], tags: ['高速', '盛り上がる', '高音'], date: '2021-09-12', dur: '3:55', views: 5210000, plays: 31 },
  { id: 5,  title: 'エラーラブ',               artist: 'mochP',               genre: 'vocaloid', vocals: ['重音テト'],            tags: ['キュート', '早口'],           date: '2024-08-07', dur: '2:58', views: 410000,  plays: 5  },
  { id: 6,  title: '量子テレパシー',           artist: 'KairoP',              genre: 'vocaloid', vocals: ['星界'],                tags: ['ミドル', '転調あり'],         date: '2023-03-22', dur: '4:21', views: 1870000, plays: 17 },
  { id: 7,  title: '紅蓮の境界線',             artist: 'ASTRA',               genre: 'anime',    work: 'TVアニメ「クロノス・ゲート」',    tags: ['熱い', '高音'],          date: '2022-10-01', dur: '4:12', views: 8800000, plays: 40 },
  { id: 8,  title: 'スターライト・オデッセイ', artist: '結城ハル',            genre: 'anime',    work: 'TVアニメ「銀河鉄道リライト」',   tags: ['爽やか', '覚えやすい'],  date: '2023-07-15', dur: '3:48', views: 3300000, plays: 19 },
  { id: 9,  title: '君と最終回',               artist: '結城ハル',            genre: 'anime',    work: '劇場版「サヨナラの向こう側」',   tags: ['バラード', '泣ける'],    date: '2024-01-09', dur: '4:33', views: 2100000, plays: 14 },
  { id: 10, title: 'リブート・マイデイズ',     artist: 'NOVA+',               genre: 'anime',    work: 'TVアニメ「リプレイ・スクール」', tags: ['高速', 'アニメOP'],      date: '2021-04-26', dur: '3:29', views: 6400000, plays: 27 },
  { id: 11, title: '東京ネオンブルース',       artist: 'The Midnights',       genre: 'artist',   tags: ['しっとり', '大人'],           date: '2023-05-30', dur: '4:50', views: 1230000, plays: 11 },
  { id: 12, title: '真夜中ドライブ',           artist: '藍色トリガー',        genre: 'artist',   tags: ['ミドル', 'ドライブ'],         date: '2022-12-12', dur: '5:02', views: 760000,  plays: 9  },
  { id: 13, title: 'フェイドアウト',           artist: '藍色トリガー',        genre: 'artist',   tags: ['バラード', '低音'],           date: '2024-04-18', dur: '3:37', views: 540000,  plays: 6  },
  { id: 14, title: '銀河のアンセム',           artist: 'The Midnights',       genre: 'artist',   tags: ['盛り上がる', '合唱向き'],     date: '2021-08-03', dur: '4:08', views: 2900000, plays: 22 },
  { id: 15, title: 'ラストボス・シンフォニー', artist: 'Chiptune Collective', genre: 'game',     tags: ['壮大', '長尺'],               date: '2023-09-21', dur: '5:44', views: 1800000, plays: 16 },
  { id: 16, title: 'ピクセルの勇者',           artist: '桜井サウンド',        genre: 'game',     tags: ['元気', '早口'],               date: '2022-02-14', dur: '3:11', views: 670000,  plays: 7  },
  { id: 17, title: 'セーブポイント',           artist: 'Chiptune Collective', genre: 'game',     tags: ['チップチューン', '短い'],     date: '2024-06-02', dur: '2:46', views: 320000,  plays: 4  },
];

const INIT_LISTS = [
  { id: 101, name: '深夜の十八番', en: 'MIDNIGHT PICKS', colors: ['#38e8ff', '#ff5db1', '#b18cff', '#ffd24a'], songIds: [2, 9, 12, 14] },
  { id: 102, name: 'ボカロ全力',   en: 'VOCALO FULL',    colors: ['#38e8ff', '#7fd8ff', '#b18cff', '#38e8ff'], songIds: [1, 4, 6] },
  { id: 103, name: 'アニソン履歴', en: 'ANIME LOG',      colors: ['#ff5db1', '#ffd24a', '#ff8fc8', '#b18cff'], songIds: [7, 8, 10] },
  { id: 104, name: '練習中',       en: 'PRACTICING',     colors: ['#b18cff', '#38e8ff', '#ffd24a', '#ff5db1'], songIds: [3, 5] },
];

const INIT_FAVS = [1, 3, 5, 7, 9, 11, 14, 15];

function genSings(id, count) {
  const r = [];
  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor((id * 11 + i * 13 + i * i * 3) % 90);
    r.push(new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10));
  }
  return r;
}

// ── migration import (from SQLite export JSON) ────────────────────────────────
async function importMigrationData(pool, state) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const s of state.songs) {
      const artists = Array.isArray(s.artists) && s.artists.length ? s.artists : [s.artist];
      await client.query(`
        INSERT INTO songs (id,title,artist,artists,genre,vocals,work,tags,date,dur,views,plays,url,rating,last_played,created)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
        ON CONFLICT (id) DO NOTHING`,
        [
          s.id, s.title, s.artist,
          JSON.stringify(artists),
          s.genre,
          JSON.stringify(s.vocals || []),
          s.work || '',
          JSON.stringify(s.tags || []),
          s.date || '', s.dur || '',
          s.views || 0, s.plays || 0,
          s.url || '',
          s.rating ?? null,
          s.lastPlayed ?? null,
          s.id,
        ],
      );
      for (const sing of s.sings || []) {
        await client.query(
          'INSERT INTO sings (song_id, date) VALUES ($1, $2)',
          [s.id, sing.date],
        );
      }
    }

    for (const [songId, on] of Object.entries(state.favs || {})) {
      if (on) await client.query(
        'INSERT INTO favorites (song_id) VALUES ($1) ON CONFLICT DO NOTHING',
        [Number(songId)],
      );
    }

    let lorder = 0;
    for (const l of state.lists || []) {
      await client.query(`
        INSERT INTO playlists (id, name, en, colors, created)
        VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
        [l.id, l.name, l.en || '', JSON.stringify(l.colors || []), lorder++],
      );
      for (let i = 0; i < (l.songIds || []).length; i++) {
        await client.query(
          'INSERT INTO playlist_songs (playlist_id, song_id, position) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
          [l.id, l.songIds[i], i],
        );
      }
    }

    const theme = state.settings?.theme || 'holo';
    await client.query(
      'INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value',
      ['theme', theme],
    );

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// ── static seed (fresh install) ───────────────────────────────────────────────
async function seedInitial(pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let order = 0;
    for (const s of INIT_SONGS) {
      const artists = s.artists || [s.artist];
      await client.query(`
        INSERT INTO songs (id,title,artist,artists,genre,vocals,work,tags,date,dur,views,plays,url,created)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        ON CONFLICT (id) DO NOTHING`,
        [
          s.id, s.title, s.artist,
          JSON.stringify(artists),
          s.genre,
          JSON.stringify(s.vocals || []),
          s.work || '',
          JSON.stringify(s.tags || []),
          s.date, s.dur,
          s.views, s.plays,
          '', order++,
        ],
      );
      for (const date of genSings(s.id, s.plays)) {
        await client.query('INSERT INTO sings (song_id, date) VALUES ($1,$2)', [s.id, date]);
      }
    }

    for (const id of INIT_FAVS) {
      await client.query('INSERT INTO favorites (song_id) VALUES ($1) ON CONFLICT DO NOTHING', [id]);
    }

    let lorder = 0;
    for (const l of INIT_LISTS) {
      await client.query(`
        INSERT INTO playlists (id,name,en,colors,created)
        VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
        [l.id, l.name, l.en, JSON.stringify(l.colors), lorder++],
      );
      for (let i = 0; i < l.songIds.length; i++) {
        await client.query(
          'INSERT INTO playlist_songs (playlist_id,song_id,position) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
          [l.id, l.songIds[i], i],
        );
      }
    }

    await client.query(
      "INSERT INTO settings(key,value) VALUES('theme','holo') ON CONFLICT DO NOTHING",
    );

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// ── entry point ───────────────────────────────────────────────────────────────
export async function seedIfEmpty(pool) {
  const { rows } = await pool.query('SELECT COUNT(*) AS n FROM songs');
  if (Number(rows[0].n) > 0) return;

  const migPath = resolve(__dirname, 'migration-data.json');
  if (existsSync(migPath)) {
    console.log('[seed] migration-data.json found — importing existing data…');
    const raw   = readFileSync(migPath, 'utf8').replace(/^﻿/, '');
    const state = JSON.parse(raw);
    await importMigrationData(pool, state);
    console.log(`[seed] imported ${state.songs?.length ?? 0} songs from SQLite export.`);
    return;
  }

  console.log('[seed] seeding fresh database with initial data…');
  await seedInitial(pool);
}
