import type { CSSProperties } from 'react';
import { GENRES } from './constants';
import type { Genre, Song } from './types';

export const fmtV = (v: number): string => (v >= 10000 ? Math.round(v / 10000) + '万' : String(v));

// Parse a YouTube video id out of a watch URL to build a thumbnail URL.
export function ytThumb(url: string): string | null {
  const m = (url || '').match(/[?&]v=([a-zA-Z0-9_-]{8,13})/);
  return m ? `https://i.ytimg.com/vi/${m[1]}/mqdefault.jpg` : null;
}

// Parse a "284万" style view-count string into an integer.
export function parseViews(str: string | number): number {
  const m = String(str ?? '0').match(/(\d+\.?\d*)(万)?/);
  return m ? Math.round(parseFloat(m[1]) * (m[2] ? 10000 : 1)) : 0;
}

export const singCount = (s: Song): number => (Array.isArray(s.sings) ? s.sings.length : s.plays);

export interface Decorated {
  song: Song;
  id: number;
  title: string;
  artist: string;
  artists: string[];
  dur: string;
  genre: Genre;
  genreLabel: string;
  color: string;
  dateF: string;
  viewsF: string;
  playsF: string;
  fav: boolean;
  rating: number | null;
  detailLabel: string;
  detailText: string;
  hasDetail: boolean;
  tags: string[];
  thumbImg: string | null;
  url: string;
}

export function decorate(s: Song, favs: Record<number, boolean>): Decorated {
  const g = GENRES[s.genre] || GENRES.artist;
  const fav = !!favs[s.id];
  const vocals = s.vocals || [];
  const tags = s.tags || [];
  const detailLabel = s.genre === 'vocaloid' ? 'VOCAL' : (s.genre === 'anime' || s.genre === 'game' ? '作品' : '');
  const detailText = s.genre === 'vocaloid' ? vocals.join('・') : (s.genre === 'anime' || s.genre === 'game' ? s.work || '' : '');
  const artists = Array.isArray(s.artists) && s.artists.length ? s.artists : s.artist ? [s.artist] : [];
  return {
    song: s,
    id: s.id,
    title: s.title,
    artist: s.artist,
    artists,
    dur: s.dur,
    genre: s.genre,
    genreLabel: g.label,
    color: g.color,
    dateF: (s.date || '').replace(/-/g, '.'),
    viewsF: fmtV(s.views),
    playsF: String(singCount(s)),
    fav,
    rating: s.rating ?? null,
    detailLabel,
    detailText,
    hasDetail: !!detailText,
    tags,
    thumbImg: ytThumb(s.url),
    url: s.url || `https://www.youtube.com/results?search_query=${encodeURIComponent(s.title + ' ' + s.artist)}`,
  };
}

// ── shared style builders (genre-coloured chrome) ────────────────────────────
export const thumbBg = (color: string): CSSProperties => ({
  position: 'absolute',
  inset: 0,
  background: `radial-gradient(130% 150% at 16% -10%,${color}77,transparent 56%),linear-gradient(135deg,#0b1126,#06070f)`,
});

export const badgeStyle = (color: string): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '4px 9px',
  borderRadius: 7,
  fontSize: 11,
  fontWeight: 700,
  color,
  border: '1px solid ' + color + '55',
  background: color + '14',
  whiteSpace: 'nowrap',
});

export const dotStyle = (color: string): CSSProperties => ({
  width: 6,
  height: 6,
  borderRadius: '50%',
  background: color,
  boxShadow: '0 0 7px ' + color,
  flexShrink: 0,
});

export const tagChipStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '2px 8px',
  borderRadius: 6,
  fontSize: 10.5,
  fontFamily: "'Share Tech Mono',monospace",
  color: 'rgba(255,255,255,.6)',
  background: 'rgba(255,255,255,.05)',
  border: '1px solid rgba(255,255,255,.12)',
  whiteSpace: 'nowrap',
};
