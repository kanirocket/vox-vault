import { useStore } from '../store';
import { useIsMobile } from '../hooks';
import type { Screen } from '../types';

export function Header() {
  const { screen, songs, favs, lists, activeList, toggleSidebar } = useStore();
  const isMobile = useIsMobile();

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
    <header style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '16px 16px 14px' : '26px 34px 20px', borderBottom: '1px solid rgba(255,255,255,.06)', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        {isMobile && (
          <button
            onClick={toggleSidebar}
            style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.7)', padding: 6, borderRadius: 8, lineHeight: 1 }}
            aria-label="メニューを開く"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, letterSpacing: 3, color: 'var(--accent)', marginBottom: isMobile ? 3 : 6 }}>{h.en}</div>
          <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 27, fontWeight: 900, letterSpacing: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.title}</h1>
        </div>
      </div>
      {!isMobile && (
        <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: 'rgba(255,255,255,.4)', textAlign: 'right', lineHeight: 1.7, flexShrink: 0 }}>
          <div><span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)', marginRight: 6, animation: 'vvBlink 1.6s ease-in-out infinite' }} />SYNCED · LOCAL VAULT</div>
          <div style={{ opacity: 0.6 }}>{h.desc}</div>
        </div>
      )}
    </header>
  );
}
