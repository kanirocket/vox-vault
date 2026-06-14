import type { Genre, Theme } from './types';

export const GENRES: Record<Genre, { label: string; en: string; color: string }> = {
  vocaloid: { label: 'ボカロ', en: 'VOCALOID', color: '#38e8ff' },
  anime: { label: 'アニソン', en: 'ANIME', color: '#ff5db1' },
  artist: { label: 'アーティスト', en: 'ARTIST', color: '#b18cff' },
  game: { label: 'ゲーム', en: 'GAME', color: '#ffd24a' },
  bgm: { label: 'BGM', en: 'BGM', color: '#1abc9c' },
};

export const GENRE_KEYS = Object.keys(GENRES) as Genre[];

export const PRESET_VOCALS = [
  '初音ミク', '鏡音リン', '鏡音レン', '巡音ルカ', 'KAITO', 'MEIKO', 'IA', '可不',
  'flower', '重音テト', 'GUMI', '結月ゆかり', '東北きりたん', 'Synthesizer V',
];

export const THEMES: Record<Theme, Record<string, string>> = {
  holo: { '--accent': '#22d3ee', '--accent3': '#a78bfa', '--glow': 'rgba(34,211,238,.28)', '--glow2': 'rgba(232,121,249,.22)', '--bg': '#05060f' },
  neon: { '--accent': '#ff2d95', '--accent3': '#7b5bff', '--glow': 'rgba(255,45,149,.30)', '--glow2': 'rgba(0,229,255,.20)', '--bg': '#0a0410' },
  acid: { '--accent': '#9dff3c', '--accent3': '#00ffc8', '--glow': 'rgba(157,255,60,.26)', '--glow2': 'rgba(0,255,200,.18)', '--bg': '#04100a' },
};

export const THEME_DEFS: Record<Theme, { c: string; l: string }> = {
  holo: { c: '#22d3ee', l: 'HOLO' },
  neon: { c: '#ff2d95', l: 'NEON' },
  acid: { c: '#9dff3c', l: 'ACID' },
};
