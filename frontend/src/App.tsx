import { useEffect, type CSSProperties } from 'react';
import { useStore } from './store';
import { useIsMobile } from './hooks';
import { THEMES } from './constants';
import { Background } from './components/Background';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Library } from './components/Library';
import { Register } from './components/Register';
import { Playlists } from './components/Playlists';
import { Stats } from './components/Stats';
import { Modals } from './components/Modals';
import { Toast } from './components/Toast';
import { Login } from './components/Login';

function Screen() {
  const screen = useStore((s) => s.screen);
  switch (screen) {
    case 'library': return <Library />;
    case 'register': return <Register />;
    case 'lists': return <Playlists />;
    case 'favorites': return <Library />;
    case 'stats': return <Stats />;
    default: return null;
  }
}

export function App() {
  const { theme, user, authReady, booted, initAuth, clearPending, sidebarOpen, closeSidebar } = useStore();
  const isMobile = useIsMobile();

  useEffect(() => { initAuth(); }, [initAuth]);

  const rootStyle: CSSProperties = {
    position: 'relative', width: '100%', height: '100vh', display: 'flex', overflow: 'hidden',
    fontFamily: "'Noto Sans JP',sans-serif", color: '#fff', background: 'var(--bg)',
    ...(THEMES[theme] as CSSProperties),
  };

  // gate on auth: wait for the initial session check, then require a user
  if (!authReady) {
    return <div style={{ ...rootStyle, display: 'grid', placeItems: 'center' }}><div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 12, color: 'rgba(255,255,255,.4)' }}>LOADING…</div></div>;
  }
  if (!user) return <Login />;

  return (
    <div style={rootStyle}>
      <Sidebar />

      {/* overlay backdrop — mobile only, shown when sidebar is open */}
      {isMobile && sidebarOpen && (
        <div
          onClick={closeSidebar}
          style={{ position: 'fixed', inset: 0, zIndex: 190, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(2px)' }}
        />
      )}

      <Background />
      <main style={{ position: 'relative', zIndex: 4, flex: 1, height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <Header />
        <div onClick={clearPending} style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px 14px 32px' : '24px 34px 40px' }}>
          {booted && <Screen />}
        </div>
      </main>
      <Modals />
      <Toast />
    </div>
  );
}
