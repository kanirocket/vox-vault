import { useStore } from '../store';
import type { Screen } from '../types';

export function Header() {
  const { screen, songs, favs, lists, activeList } = useStore();
  const total = songs.length;
  const favCount = Object.values(favs).filter(Boolean).length;
  const activeListObj = lists.find((l) => l.id === activeList) || null;

  const hs: Record<Screen, { en: string; title: string; desc: string }> = {
    library: { en: '// LIBRARY', title: 'ライブラリ', desc: total + ' TRACKS ARCHIVED' },
    register: { en: '// REGISTER', title: '楽曲を登録', desc: 'YOUTUBE → VAULT' },
    lists: { en: '// PLAYLISTS', title: activeListObj ? activeListObj.name : 'マイリスト', desc: activeListObj ? activeListObj.songIds.length + ' TRACKS' : lists.length + ' LISTS' },
    favorites: { en: '// FAVORITES', title: 'お気に入り', desc: favCount + ' FAVORITED' },
    stats: { en: '// ANALYTICS', title: '統計ダッシュボード', desc: 'VAULT INSIGHTS' },
  };
  const h = hs[screen];

  return (
    <header style={{ flexShrink: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '26px 34px 20px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
      <div>
        <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, letterSpacing: 3, color: 'var(--accent)', marginBottom: 6 }}>{h.en}</div>
        <h1 style={{ margin: 0, fontSize: 27, fontWeight: 900, letterSpacing: 0.5 }}>{h.title}</h1>
      </div>
      <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: 'rgba(255,255,255,.4)', textAlign: 'right', lineHeight: 1.7 }}>
        <div><span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)', marginRight: 6, animation: 'vvBlink 1.6s ease-in-out infinite' }} />SYNCED · LOCAL VAULT</div>
        <div style={{ opacity: 0.6 }}>{h.desc}</div>
      </div>
    </header>
  );
}
