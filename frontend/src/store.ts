import { create } from 'zustand';
import { api, ApiError, getToken, setToken, setUnauthorizedHandler } from './api';
import type {
  AuthResult, Candidate, Genre, Playlist, Screen, SearchResult, Song, SortDir, SortKey,
  StatePayload, Theme, Toast, ToastType, User, ViewMode,
} from './types';

export interface SavePayload {
  title: string;
  artists: string[];
  genre: Genre;
  vocals: string[];
  work: string;
  tags: string[];
  rating: number | null;
  date: string;
  dur: string;
  views: number;
  url: string;
}

interface Store {
  // auth
  user: User | null;
  authReady: boolean; // initial session check finished

  // data
  songs: Song[];
  lists: Playlist[];
  favs: Record<number, boolean>;
  theme: Theme;
  booted: boolean;

  // navigation / library
  screen: Screen;
  filter: 'all' | Genre;
  favOnly: boolean;
  sortKey: SortKey;
  sortDir: SortDir;
  query: string;
  view: ViewMode;
  artistFilter: string | null;

  // transient UI
  sidebarOpen: boolean;
  deletePending: number | null;
  addToListSong: number | null;
  activeList: number | null;
  creatingList: boolean;
  unsingPending: number | null;
  toast: Toast | null;

  // register flow
  regStep: number;
  regSelected: Candidate | null;
  regCandidates: Candidate[];
  regLoading: boolean;
  regSource: SearchResult['source'] | null;
  pendingListAdd: number | null; // list to auto-add a newly registered song to

  // actions
  initAuth: () => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => void;
  boot: () => Promise<void>;
  showToast: (msg: string, type?: ToastType) => void;
  setScreen: (screen: Screen) => void;
  setTheme: (theme: Theme) => void;
  setFilter: (filter: 'all' | Genre) => void;
  toggleFavOnly: () => void;
  showFavorites: () => void;
  setView: (view: ViewMode) => void;
  setQuery: (query: string) => void;
  toggleSort: (key: SortKey) => void;
  filterArtist: (artist: string) => void;
  clearArtistFilter: () => void;

  toggleFav: (id: number) => Promise<void>;
  incPlays: (id: number) => Promise<void>;
  rateSong: (id: number, rating: number) => Promise<void>;
  showUnsing: (id: number) => void;
  closeUnsing: () => void;
  undoSing: (songId: number, singId: number) => Promise<void>;

  startDel: (id: number) => void;
  confirmDel: (id: number) => Promise<void>;
  cancelDel: () => void;
  clearPending: () => void;
  toggleSidebar: () => void;
  closeSidebar: () => void;

  openAddToList: (id: number) => void;
  closeAddToList: () => void;
  toggleSongInList: (songId: number, listId: number) => Promise<void>;
  removeFromList: (songId: number, listId: number) => Promise<void>;
  openCreateList: () => void;
  cancelCreateList: () => void;
  submitNewList: (name: string) => Promise<void>;
  deleteList: (id: number) => Promise<void>;
  openList: (id: number) => void;
  closeList: () => void;

  startSearch: (query: string) => Promise<void>;
  backStep: (step: number) => void;
  selectCand: (cand: Candidate) => void;
  saveSong: (payload: SavePayload) => Promise<boolean>;
  resetReg: () => void;
  registerForList: (listId: number, query: string) => void;
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;
let delTimer: ReturnType<typeof setTimeout> | null = null;

export const useStore = create<Store>((set, get) => ({
  user: null,
  authReady: false,

  songs: [],
  lists: [],
  favs: {},
  theme: 'holo',
  booted: false,

  screen: 'library',
  filter: 'all',
  favOnly: false,
  sortKey: 'added',
  sortDir: 'desc',
  query: '',
  view: 'list',
  artistFilter: null,

  sidebarOpen: false,
  deletePending: null,
  addToListSong: null,
  activeList: null,
  creatingList: false,
  unsingPending: null,
  toast: null,

  regStep: 1,
  regSelected: null,
  regCandidates: [],
  regLoading: false,
  regSource: null,
  pendingListAdd: null,

  // Restore a session on app load (if a token is stored) and fetch data.
  initAuth: async () => {
    setUnauthorizedHandler(() => get().logout());
    if (!getToken()) { set({ authReady: true }); return; }
    try {
      // /auth/me confirms the token is valid and returns the full profile.
      const user = await api<User>('/auth/me');
      set({ user, theme: user.theme, authReady: true });
      await get().boot();
    } catch {
      setToken(null);
      set({ user: null, authReady: true });
    }
  },

  loginWithGoogle: async (credential) => {
    try {
      const r = await api<AuthResult>('/auth/google', { method: 'POST', body: JSON.stringify({ credential }) });
      setToken(r.token);
      set({ user: r.user, theme: r.user.theme });
      await get().boot();
      get().showToast(`ようこそ、${r.user.name || 'ゲスト'} さん`);
    } catch {
      get().showToast('Google サインインに失敗しました', 'error');
    }
  },

  loginAsGuest: async () => {
    try {
      let gid = localStorage.getItem('vv_guest_id');
      if (!gid) {
        gid = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `g${Date.now()}${Math.random().toString(16).slice(2)}`;
        localStorage.setItem('vv_guest_id', gid);
      }
      const r = await api<AuthResult>('/auth/guest', { method: 'POST', body: JSON.stringify({ guestId: gid }) });
      setToken(r.token);
      set({ user: r.user, theme: r.user.theme });
      await get().boot();
      get().showToast('ゲストとして続行します', 'info');
    } catch {
      get().showToast('ゲストログインに失敗しました', 'error');
    }
  },

  logout: () => {
    setToken(null);
    set({ user: null, songs: [], lists: [], favs: {}, booted: false, screen: 'library', favOnly: false, activeList: null });
  },

  boot: async () => {
    try {
      const data = await api<StatePayload>('/state');
      set({ songs: data.songs, lists: data.lists, favs: data.favs, theme: data.settings?.theme || 'holo', booted: true });
    } catch {
      set({ booted: true });
      get().showToast('サーバーに接続できませんでした', 'error');
    }
  },

  showToast: (msg, type = 'success') => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toast: { msg, type, ts: Date.now() } });
    toastTimer = setTimeout(() => set({ toast: null }), 2600);
  },

  setScreen: (screen) => set((s) => ({ screen, activeList: null, sidebarOpen: false, favOnly: false, pendingListAdd: screen === 'register' ? s.pendingListAdd : null })),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  closeSidebar: () => set({ sidebarOpen: false }),
  setTheme: (theme) => {
    set({ theme });
    api('/settings', { method: 'PUT', body: JSON.stringify({ theme }) }).catch(() => {});
  },
  setFilter: (filter) => set({ filter }),
  toggleFavOnly: () => set((s) => ({ favOnly: !s.favOnly })),
  showFavorites: () => set({ screen: 'library', favOnly: true, artistFilter: null, sidebarOpen: false }),
  setView: (view) => set({ view }),
  setQuery: (query) => set({ query }),
  toggleSort: (key) =>
    set((s) => ({ sortKey: key, sortDir: s.sortKey === key ? (s.sortDir === 'asc' ? 'desc' : 'asc') : 'desc' })),
  filterArtist: (artist) => set({ artistFilter: artist, screen: 'library' }),
  clearArtistFilter: () => set({ artistFilter: null }),

  toggleFav: async (id) => {
    try {
      const r = await api<{ id: number; favorite: boolean }>(`/songs/${id}/favorite`, { method: 'PUT' });
      set((s) => {
        const favs = { ...s.favs };
        if (r.favorite) favs[id] = true;
        else delete favs[id];
        return { favs };
      });
    } catch {
      get().showToast('お気に入りの更新に失敗しました', 'error');
    }
  },

  incPlays: async (id) => {
    try {
      const song = await api<Song>(`/songs/${id}/play`, { method: 'POST' });
      set((s) => ({ songs: s.songs.map((x) => (x.id === id ? song : x)) }));
      get().showToast('歌唱カウント +1', 'info');
    } catch {
      get().showToast('歌唱の記録に失敗しました', 'error');
    }
  },

  rateSong: async (id, rating) => {
    const song = get().songs.find((s) => s.id === id);
    const newRating = song && song.rating === rating ? null : rating;
    try {
      const updated = await api<Song>(`/songs/${id}/rating`, { method: 'PUT', body: JSON.stringify({ rating: newRating }) });
      set((s) => ({ songs: s.songs.map((x) => (x.id === id ? { ...x, rating: updated.rating } : x)) }));
    } catch {
      get().showToast('評価の更新に失敗しました', 'error');
    }
  },

  showUnsing: (id) => set({ unsingPending: id }),
  closeUnsing: () => set({ unsingPending: null }),
  undoSing: async (songId, singId) => {
    try {
      const song = await api<Song>(`/songs/${songId}/sings/${singId}`, { method: 'DELETE' });
      set((s) => ({ songs: s.songs.map((x) => (x.id === songId ? song : x)), unsingPending: null }));
      get().showToast('歌唱を取り消しました', 'info');
    } catch {
      get().showToast('取り消しに失敗しました', 'error');
    }
  },

  startDel: (id) => {
    if (delTimer) clearTimeout(delTimer);
    set({ deletePending: id });
    delTimer = setTimeout(() => set({ deletePending: null }), 3000);
  },
  confirmDel: async (id) => {
    if (delTimer) clearTimeout(delTimer);
    const title = get().songs.find((s) => s.id === id)?.title || '楽曲';
    try {
      await api(`/songs/${id}`, { method: 'DELETE' });
      set((s) => {
        const favs = { ...s.favs };
        delete favs[id];
        return {
          songs: s.songs.filter((x) => x.id !== id),
          favs,
          deletePending: null,
          lists: s.lists.map((l) => ({ ...l, songIds: l.songIds.filter((i) => i !== id) })),
        };
      });
      get().showToast(`「${title}」を削除しました`, 'info');
    } catch {
      get().showToast('削除に失敗しました', 'error');
    }
  },
  cancelDel: () => set({ deletePending: null }),
  clearPending: () => {
    if (get().deletePending) set({ deletePending: null });
  },

  openAddToList: (id) => set({ addToListSong: id }),
  closeAddToList: () => set({ addToListSong: null }),
  toggleSongInList: async (songId, listId) => {
    const list = get().lists.find((l) => l.id === listId);
    const already = !!list && list.songIds.includes(songId);
    try {
      const updated = already
        ? await api<Playlist>(`/playlists/${listId}/songs/${songId}`, { method: 'DELETE' })
        : await api<Playlist>(`/playlists/${listId}/songs`, { method: 'POST', body: JSON.stringify({ songId }) });
      set((s) => ({ lists: s.lists.map((l) => (l.id === listId ? updated : l)) }));
      get().showToast(already ? `「${list?.name}」から削除しました` : `「${list?.name || 'リスト'}」に追加しました`, already ? 'info' : 'success');
    } catch {
      get().showToast('リストの更新に失敗しました', 'error');
    }
  },
  removeFromList: async (songId, listId) => {
    const list = get().lists.find((l) => l.id === listId);
    try {
      const updated = await api<Playlist>(`/playlists/${listId}/songs/${songId}`, { method: 'DELETE' });
      set((s) => ({ lists: s.lists.map((l) => (l.id === listId ? updated : l)) }));
      get().showToast(`「${list?.name || 'リスト'}」から削除しました`, 'info');
    } catch {
      get().showToast('リストの更新に失敗しました', 'error');
    }
  },
  openCreateList: () => set({ creatingList: true, addToListSong: null }),
  cancelCreateList: () => set({ creatingList: false }),
  submitNewList: async (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const list = await api<Playlist>('/playlists', { method: 'POST', body: JSON.stringify({ name: trimmed }) });
      set((s) => ({ lists: [...s.lists, list], creatingList: false }));
      get().showToast(`「${trimmed}」を作成しました`);
    } catch {
      get().showToast('リストの作成に失敗しました', 'error');
    }
  },
  deleteList: async (id) => {
    const list = get().lists.find((l) => l.id === id);
    try {
      await api(`/playlists/${id}`, { method: 'DELETE' });
      set((s) => ({ lists: s.lists.filter((l) => l.id !== id), activeList: s.activeList === id ? null : s.activeList }));
      get().showToast(`「${list?.name || 'リスト'}」を削除しました`, 'info');
    } catch {
      get().showToast('リストの削除に失敗しました', 'error');
    }
  },
  openList: (id) => set({ activeList: id }),
  closeList: () => set({ activeList: null }),

  startSearch: async (query) => {
    set({ regStep: 2, regLoading: true, regCandidates: [], regSource: null });
    try {
      const r = await api<SearchResult>(`/youtube/search?q=${encodeURIComponent(query)}`);
      set({ regCandidates: r.candidates || [], regLoading: false, regSource: r.source || 'mock' });
    } catch {
      set({ regLoading: false });
      get().showToast('YouTube検索に失敗しました', 'error');
    }
  },
  backStep: (step) => set({ regStep: step }),
  selectCand: (cand) => set({ regSelected: cand, regStep: 3 }),
  saveSong: async (payload) => {
    try {
      const song = await api<Song>('/songs', { method: 'POST', body: JSON.stringify(payload) });
      set((s) => ({ songs: [song, ...s.songs], regStep: 4 }));
      get().showToast(`「${song.title}」を VAULT に登録しました`);
      const listId = get().pendingListAdd;
      if (listId != null) {
        const list = get().lists.find((l) => l.id === listId);
        if (list) {
          try {
            const updated = await api<Playlist>(`/playlists/${listId}/songs`, { method: 'POST', body: JSON.stringify({ songId: song.id }) });
            set((s) => ({ lists: s.lists.map((l) => (l.id === listId ? updated : l)) }));
            get().showToast(`「${list.name}」に追加しました`);
          } catch {
            get().showToast('リストへの追加に失敗しました', 'error');
          }
        }
        set({ pendingListAdd: null });
      }
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        const existing = e.body as { title?: string };
        get().showToast(`すでに登録済みです：「${existing.title || payload.title}」`, 'error');
      } else {
        get().showToast('登録に失敗しました', 'error');
      }
      return false;
    }
  },
  resetReg: () =>
    set({ regStep: 1, regSelected: null, regCandidates: [], regSource: null, regLoading: false, pendingListAdd: null }),
  registerForList: (listId, query) => {
    set({ regStep: 1, regSelected: null, regCandidates: [], regSource: null, regLoading: false, pendingListAdd: listId, screen: 'register', activeList: null });
    if (query.trim()) get().startSearch(query.trim());
  },
}));
