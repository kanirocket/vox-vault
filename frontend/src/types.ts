// ── domain types (mirror the backend serializers) ───────────────────────────
export type Genre = 'vocaloid' | 'anime' | 'artist' | 'game' | 'bgm';
export type Screen = 'library' | 'register' | 'lists' | 'favorites' | 'stats';
export type Theme = 'holo' | 'neon' | 'acid';
export type ViewMode = 'list' | 'grid';
export type SortKey = 'added' | 'title' | 'date' | 'views' | 'plays';
export type SortDir = 'asc' | 'desc';
export type ToastType = 'success' | 'info' | 'error';

export interface Sing {
  id: number;
  date: string;
}

export interface Song {
  id: number;
  title: string;
  artist: string;
  genre: Genre;
  vocals: string[];
  work: string;
  tags: string[];
  date: string;
  dur: string;
  views: number;
  plays: number;
  url: string;
  artists: string[];
  rating: number | null;
  lastPlayed: number | null;
  sings: Sing[];
  favorite: boolean;
}

export interface Playlist {
  id: number;
  name: string;
  en: string;
  colors: string[];
  songIds: number[];
}

export interface Candidate {
  title: string;
  channel: string;
  views: string;
  published: string;
  date: string;
  dur: string;
  artist: string;
  genre: Genre;
  videoId: string | null;
  url: string;
  thumb: string | null;
  thumbColor: string;
}

export interface StatePayload {
  songs: Song[];
  lists: Playlist[];
  favs: Record<number, boolean>;
  settings: { theme: Theme };
}

export interface SearchResult {
  candidates: Candidate[];
  source: 'youtube' | 'mock' | 'scrape';
}

export interface Toast {
  msg: string;
  type: ToastType;
  ts: number;
}

export interface User {
  id: number;
  email: string;
  name: string;
  picture: string;
  theme: Theme;
  isAdmin: boolean;
}

export interface AuthResult {
  token: string;
  user: User;
}
