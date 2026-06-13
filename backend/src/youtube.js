// YouTube search.
//
// The design prototype noted "YOUTUBE DATA API · v3 (connect later)" — the
// register flow only needs UI + structure. This module returns mock candidates
// by default, and transparently calls the real YouTube Data API v3 when a
// YOUTUBE_API_KEY environment variable is provided. The response shape is the
// same either way, so the frontend needs no changes when you flip the switch.

const THUMB_COLORS = ['#38e8ff', '#7b5bff', '#ff5db1', '#22d3ee', '#b18cff'];

// Cheap heuristic genre guess from a title/channel (only used for the mock /
// as a default; the user confirms genre in step 3 either way).
function guessGenre(text) {
  const t = (text || '').toLowerCase();
  if (/(ミク|miku|ボカロ|vocaloid|初音|rin|len|luka|テト|可不)/i.test(text)) return 'vocaloid';
  if (/(アニメ|anime|op|ed|tvサイズ)/i.test(text)) return 'anime';
  if (/(game|ゲーム|chiptune|8bit|rpg)/i.test(t)) return 'game';
  return 'artist';
}

function mockCandidates(query) {
  const q = (query || '').trim() || '楽曲';
  // Vary channel/artist per result so results look more like real YouTube variety
  const base = [
    { title: q,                   channel: q + ' - Topic',       views: '284万', published: '2023.11.04', dur: '3:42', artist: q },
    { title: '【MV】' + q,         channel: q + ' Official',      views: '31万',  published: '2023.11.04', dur: '3:50', artist: q },
    { title: q + '（歌ってみた）',  channel: 'うたってみたch',       views: '12万',  published: '2024.01.20', dur: '3:45', artist: q },
    { title: q + ' / 公式MV',     channel: q + ' Official',      views: '45万',  published: '2024.05.30', dur: '4:10', artist: q },
    { title: q + '【instrumental】', channel: q + ' - Topic',    views: '8.1万', published: '2023.11.05', dur: '3:42', artist: q },
  ];
  return base.map((c, i) => ({
    ...c,
    videoId: null,
    url: '',
    date: c.published,
    genre: guessGenre(c.title + ' ' + c.channel),
    thumb: null,
    thumbColor: THUMB_COLORS[i % THUMB_COLORS.length],
  }));
}

// ── real YouTube Data API v3 ────────────────────────────────────────────────
function fmtViews(n) {
  const v = Number(n) || 0;
  return v >= 10000 ? Math.round(v / 10000) + '万' : String(v);
}
function fmtDuration(iso) {
  // PT#M#S -> M:SS
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso || '') || [];
  const h = +(m[1] || 0), min = +(m[2] || 0), s = +(m[3] || 0);
  const total = h * 60 + min;
  return `${total}:${String(s).padStart(2, '0')}`;
}

async function realCandidates(query, apiKey) {
  const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
  searchUrl.search = new URLSearchParams({
    key: apiKey, q: query, part: 'snippet', type: 'video', maxResults: '5', videoCategoryId: '10',
  }).toString();
  const sres = await fetch(searchUrl);
  if (!sres.ok) throw new Error(`YouTube search failed: ${sres.status}`);
  const sjson = await sres.json();
  const ids = (sjson.items || []).map((it) => it.id.videoId).filter(Boolean);
  if (!ids.length) return [];

  const vidUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
  vidUrl.search = new URLSearchParams({
    key: apiKey, id: ids.join(','), part: 'snippet,contentDetails,statistics',
  }).toString();
  const vres = await fetch(vidUrl);
  if (!vres.ok) throw new Error(`YouTube videos failed: ${vres.status}`);
  const vjson = await vres.json();

  return (vjson.items || []).map((it, i) => {
    const sn = it.snippet || {};
    const date = (sn.publishedAt || '').slice(0, 10).replace(/-/g, '.');
    return {
      title: sn.title || '',
      channel: sn.channelTitle || '',
      views: fmtViews(it.statistics?.viewCount),
      published: date,
      date,
      dur: fmtDuration(it.contentDetails?.duration),
      artist: sn.channelTitle || '',
      genre: guessGenre(`${sn.title} ${sn.channelTitle} ${(sn.tags || []).join(' ')}`),
      videoId: it.id,
      url: `https://www.youtube.com/watch?v=${it.id}`,
      thumb: sn.thumbnails?.medium?.url || sn.thumbnails?.default?.url || null,
      thumbColor: THUMB_COLORS[i % THUMB_COLORS.length],
    };
  });
}

// ── scrape the public results page (no API key) ─────────────────────────────
// YouTube embeds the full search response as a JSON blob (`ytInitialData`) in
// the results HTML. We fetch the page, extract that JSON, and pull the
// videoRenderer objects out of it — i.e. the actual search results, not mocks.

// Extract the `ytInitialData` object via balanced-brace scanning (robust to the
// JSON containing braces/`</script>` inside string values).
function extractInitialData(html) {
  for (const marker of ['var ytInitialData = ', 'window["ytInitialData"] = ', 'ytInitialData = ']) {
    const at = html.indexOf(marker);
    if (at === -1) continue;
    let i = html.indexOf('{', at);
    if (i === -1) continue;
    let depth = 0, inStr = false, esc = false;
    for (let j = i; j < html.length; j++) {
      const ch = html[j];
      if (inStr) {
        if (esc) esc = false;
        else if (ch === '\\') esc = true;
        else if (ch === '"') inStr = false;
      } else if (ch === '"') inStr = true;
      else if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          try { return JSON.parse(html.slice(i, j + 1)); } catch { return null; }
        }
      }
    }
  }
  return null;
}

// Walk the parsed data and collect every videoRenderer (handles section /
// shelf / richItem wrappers without hardcoding the path).
function collectVideoRenderers(node, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (node.videoRenderer && node.videoRenderer.videoId) out.push(node.videoRenderer);
  for (const k in node) {
    const v = node[k];
    if (v && typeof v === 'object') collectVideoRenderers(v, out);
  }
  return out;
}

// "284万 回視聴" / "284万回視聴" -> "284万"  ·  "1,234 回視聴" -> "1,234"
function cleanViews(text) {
  return String(text || '').replace(/\s*回視聴.*/,'').replace(/\s*views?.*/i, '').trim();
}

// Japanese relative time ("3 年前", "5 か月前", "2 週間前", ...) -> approx YYYY.MM.DD
function relativeToDate(text) {
  const t = String(text || '');
  const now = new Date();
  const m = t.match(/(\d+)\s*(年|か月|ヶ月|週間|日|時間|分|秒)/);
  if (m) {
    const n = +m[1];
    if (m[2] === '年') now.setFullYear(now.getFullYear() - n);
    else if (m[2] === 'か月' || m[2] === 'ヶ月') now.setMonth(now.getMonth() - n);
    else if (m[2] === '週間') now.setDate(now.getDate() - n * 7);
    else if (m[2] === '日') now.setDate(now.getDate() - n);
    // 時間/分/秒前 ≒ today
  }
  return `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
}

async function scrapeCandidates(query) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&hl=ja&gl=JP`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  let html;
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        // A desktop browser UA + ja locale + consent cookie make YouTube serve
        // the normal results HTML (not a consent interstitial).
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept-Language': 'ja,en;q=0.8',
        'Cookie': 'CONSENT=YES+cb; SOCS=CAI',
      },
    });
    if (!res.ok) throw new Error(`results page ${res.status}`);
    html = await res.text();
  } finally {
    clearTimeout(timer);
  }

  const data = extractInitialData(html);
  if (!data) throw new Error('ytInitialData not found');

  const seen = new Set();
  const cands = [];
  for (const vr of collectVideoRenderers(data)) {
    if (seen.has(vr.videoId)) continue;
    seen.add(vr.videoId);
    const title = vr.title?.runs?.[0]?.text || vr.title?.simpleText || '';
    if (!title) continue;
    const channel = vr.ownerText?.runs?.[0]?.text || vr.longBylineText?.runs?.[0]?.text || '';
    const views = cleanViews(vr.shortViewCountText?.simpleText
      || vr.viewCountText?.simpleText
      || vr.shortViewCountText?.runs?.map((r) => r.text).join('') || '');
    const dur = vr.lengthText?.simpleText || '';
    const rel = vr.publishedTimeText?.simpleText || '';
    const thumbs = vr.thumbnail?.thumbnails || [];
    const thumb = thumbs.length ? thumbs[thumbs.length - 1].url : null;
    cands.push({
      title,
      channel,
      views,
      published: rel || relativeToDate(rel),
      date: relativeToDate(rel),
      dur,
      artist: channel.replace(/\s*-\s*Topic$/, '').trim() || channel,
      genre: guessGenre(`${title} ${channel}`),
      videoId: vr.videoId,
      url: `https://www.youtube.com/watch?v=${vr.videoId}`,
      thumb,
      thumbColor: THUMB_COLORS[cands.length % THUMB_COLORS.length],
    });
    if (cands.length >= 8) break;
  }
  return cands;
}

export async function searchYouTube(query) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (apiKey) {
    try {
      const real = await realCandidates(query, apiKey);
      if (real.length) return { source: 'youtube', candidates: real };
    } catch (e) {
      console.warn('[youtube] real API failed, trying scrape:', e.message);
    }
  }
  // No key (or key failed): scrape the public results page for real candidates.
  try {
    const scraped = await scrapeCandidates(query);
    if (scraped.length) return { source: 'youtube', candidates: scraped };
    console.warn('[youtube] scrape returned no candidates, falling back to mock');
  } catch (e) {
    console.warn('[youtube] scrape failed, falling back to mock:', e.message);
  }
  return { source: 'mock', candidates: mockCandidates(query) };
}
