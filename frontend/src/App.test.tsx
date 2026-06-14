import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from './App';
import { useStore } from './store';
import type { Song, StatePayload } from './types';

const song = (over: Partial<Song>): Song => ({
  id: 1, title: 'グリッチ・ハート', artist: 'KairoP', genre: 'vocaloid',
  vocals: ['初音ミク'], work: '', tags: ['高速'], date: '2023-11-04', dur: '3:42',
  views: 2840000, plays: 3, url: '', artists: ['KairoP'], rating: null, lastPlayed: null,
  sings: [{ id: 1, date: '2024-01-01' }, { id: 2, date: '2024-01-02' }, { id: 3, date: '2024-01-03' }],
  favorite: false, ...over,
});

const STATE: StatePayload = {
  songs: [
    song({ id: 1, title: 'グリッチ・ハート', artist: 'KairoP', artists: ['KairoP'] }),
    song({ id: 2, title: '紅蓮の境界線', artist: 'ASTRA', genre: 'anime', artists: ['ASTRA'], work: 'TVアニメ「クロノス」', vocals: [], favorite: true }),
  ],
  lists: [{ id: 101, name: '深夜の十八番', en: 'MIDNIGHT', colors: ['#38e8ff', '#ff5db1', '#b18cff', '#ffd24a'], songIds: [1] }],
  favs: { 2: true },
  settings: { theme: 'holo' },
};

function mockApi() {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/api/state')) {
      return { ok: true, status: 200, json: async () => STATE } as Response;
    }
    return { ok: true, status: 200, json: async () => ({}) } as Response;
  }));
}

beforeEach(() => {
  // the zustand store is a module singleton — reset nav/filter state so tests
  // don't leak into each other.
  useStore.setState({
    songs: [], lists: [], favs: {}, booted: false,
    screen: 'library', filter: 'all', query: '', view: 'list', artistFilter: null,
    regStep: 1, activeList: null, addToListSong: null, creatingList: false,
    unsingPending: null, deletePending: null,
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test('boots and renders the library with hydrated songs', async () => {
  const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  mockApi();
  render(<App />);

  // sidebar nav renders immediately
  expect(screen.getAllByText('ライブラリ').length).toBeGreaterThan(0);

  // songs hydrate from the mocked /api/state
  expect(await screen.findByText('グリッチ・ハート')).toBeTruthy();
  expect(screen.getByText('紅蓮の境界線')).toBeTruthy();

  // no React runtime errors surfaced
  expect(errSpy).not.toHaveBeenCalled();
  errSpy.mockRestore();
});

test('navigates between screens', async () => {
  mockApi();
  render(<App />);
  await screen.findByText('グリッチ・ハート');

  // go to Register
  fireEvent.click(screen.getByText('楽曲を登録'));
  expect(await screen.findByText('楽曲を検索して登録')).toBeTruthy();

  // go to Stats
  fireEvent.click(screen.getByText('統計'));
  expect(await screen.findByText('ジャンル比率')).toBeTruthy();
});

test('filters the library via the search box', async () => {
  mockApi();
  render(<App />);
  await screen.findByText('グリッチ・ハート');

  // typing an artist narrows the list through the libDerived pipeline
  fireEvent.change(screen.getByPlaceholderText('タイトル・アーティスト検索'), { target: { value: 'ASTRA' } });
  await waitFor(() => expect(screen.queryByText('グリッチ・ハート')).toBeNull());
  expect(screen.getByText('紅蓮の境界線')).toBeTruthy();
});
