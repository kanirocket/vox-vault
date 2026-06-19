import type { CSSProperties, ReactNode } from 'react';
import { useStore } from '../store';
import { useIsMobile } from '../hooks';
import { THEME_DEFS } from '../constants';
import type { Screen, Theme } from '../types';

const navBtnStyle = (on: boolean): CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 13, width: '100%',
  padding: '11px 14px 11px 16px', borderRadius: '0 11px 11px 0', cursor: 'pointer',
  fontFamily: 'inherit', textAlign: 'left', marginBottom: 2, transition: 'all .15s',
  background: on ? 'rgba(255,255,255,.06)' : 'transparent', border: 'none',
  borderLeft: on ? '2px solid var(--accent)' : '2px solid transparent',
  color: on ? '#fff' : 'rgba(255,255,255,.5)',
  boxShadow: on ? 'inset 0 0 36px var(--glow)' : 'none',
});

const NAV: { key: Screen; jp: string; en: string; icon: ReactNode }[] = [
  { key: 'library', jp: 'ライブラリ', en: 'LIBRARY', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg> },
  { key: 'register', jp: '楽曲を登録', en: 'REGISTER', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.5" y2="16.5" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg> },
  { key: 'lists', jp: 'マイリスト', en: 'PLAYLISTS', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 6h13M3 12h13M3 18h9" /><path d="M19 9v9l4-2.2" /></svg> },
  { key: 'favorites', jp: 'お気に入り', en: 'FAVORITES', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polygon points="12 2.5 15.1 9 22 9.7 16.8 14.4 18.3 21 12 17.4 5.7 21 7.2 14.4 2 9.7 8.9 9" /></svg> },
  { key: 'stats', jp: '統計', en: 'ANALYTICS', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 3v18h18" /><rect x="7" y="11" width="3" height="6" /><rect x="13" y="7" width="3" height="10" /></svg> },
];

export function Sidebar() {
  const { songs, favs, theme, screen, favOnly, sidebarOpen, setScreen, setTheme, closeSidebar, showFavorites } = useStore();
  const isMobile = useIsMobile();

  const total = songs.length;
  const favCount = Object.values(favs).filter(Boolean).length;
  const totalPlays = songs.reduce((a, s) => a + s.plays, 0);

  const handleNav = (key: Screen) => {
    if (key === 'favorites') { showFavorites(); }
    else { setScreen(key); }
    if (isMobile) closeSidebar();
  };

  // favorites is now a library filter, not a separate screen
  const isActive = (key: Screen) =>
    key === 'favorites' ? screen === 'library' && favOnly : screen === key && !(key === 'library' && favOnly);

  const baseStyle: CSSProperties = {
    height: '100vh', display: 'flex', flexDirection: 'column',
    padding: '26px 16px 18px',
    background: 'rgba(10,12,24,.92)',
    backdropFilter: 'blur(22px)',
    borderRight: '1px solid rgba(255,255,255,.07)',
  };

  const sidebarStyle: CSSProperties = isMobile
    ? {
        ...baseStyle,
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 200,
        width: 272,
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.28s cubic-bezier(.4,0,.2,1)',
        boxShadow: sidebarOpen ? '4px 0 32px rgba(0,0,0,.6)' : 'none',
      }
    : {
        ...baseStyle,
        position: 'relative', zIndex: 5, width: 248, flexShrink: 0,
      };

  return (
    <aside style={sidebarStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '0 6px 26px' }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg,var(--accent),var(--accent3))', boxShadow: '0 0 22px var(--glow)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#06070f" strokeWidth="2.4" strokeLinecap="round"><path d="M12 3v12" /><circle cx="9" cy="17" r="3" /><path d="M12 3l7 2v4" /></svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 900, fontSize: 16, letterSpacing: 1, lineHeight: 1 }}>VOX<span style={{ color: 'var(--accent)' }}>//</span>VAULT</div>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, letterSpacing: 2.5, color: 'rgba(255,255,255,.4)', marginTop: 4 }}>KARAOKE ARCHIVE</div>
        </div>
        {isMobile && (
          <button onClick={closeSidebar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.5)', padding: 6, borderRadius: 7, lineHeight: 1 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        )}
      </div>
      <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,.3)', padding: '0 12px 8px' }}>// NAVIGATION</div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map((n) => (
          <button key={n.key} style={navBtnStyle(isActive(n.key))} onClick={() => handleNav(n.key)}>
            {n.icon}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{n.jp}</div>
              <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, letterSpacing: 1.5, opacity: 0.55 }}>{n.en}</div>
            </div>
          </button>
        ))}
      </nav>
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ padding: 14, borderRadius: 12, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, letterSpacing: 1.5, color: 'rgba(255,255,255,.4)' }}>ARCHIVE</span>
            <span style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 700, fontSize: 18, color: 'var(--accent)' }}>{total}</span>
          </div>
          <div style={{ height: 5, borderRadius: 4, background: 'rgba(255,255,255,.07)', marginTop: 8, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: Math.min(total / 30, 1) * 100 + '%', borderRadius: 4, background: 'linear-gradient(90deg,var(--accent3),var(--accent))', boxShadow: '0 0 10px var(--glow)' }} />
          </div>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, color: 'rgba(255,255,255,.35)', marginTop: 7 }}>{favCount} FAV · {totalPlays} SINGS</div>
        </div>
        <div>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,.3)', padding: '0 4px 7px' }}>// THEME</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(Object.keys(THEME_DEFS) as Theme[]).map((k) => {
              const on = theme === k;
              const d = THEME_DEFS[k];
              return (
                <button key={k} onClick={() => setTheme(k)} style={{ flex: 1, padding: '9px 0', borderRadius: 9, cursor: 'pointer', fontFamily: "'Share Tech Mono',monospace", fontSize: 11, letterSpacing: 1, textAlign: 'center', border: on ? '1px solid ' + d.c : '1px solid rgba(255,255,255,.1)', background: on ? d.c + '1f' : 'transparent', color: on ? '#fff' : 'rgba(255,255,255,.45)', boxShadow: on ? '0 0 16px ' + d.c + '55' : 'none' }}>{d.l}</button>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
