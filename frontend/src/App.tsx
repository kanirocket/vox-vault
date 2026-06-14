import { useEffect, type CSSProperties } from 'react';
import { useStore } from './store';
import { THEMES } from './constants';
import { Background } from './components/Background';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Library } from './components/Library';
import { Register } from './components/Register';
import { Playlists } from './components/Playlists';
import { Favorites } from './components/Favorites';
import { Stats } from './components/Stats';
import { Modals } from './components/Modals';
import { Toast } from './components/Toast';

function Screen() {
  const screen = useStore((s) => s.screen);
  switch (screen) {
    case 'library': return <Library />;
    case 'register': return <Register />;
    case 'lists': return <Playlists />;
    case 'favorites': return <Favorites />;
    case 'stats': return <Stats />;
    default: return null;
  }
}

export function App() {
  const { theme, booted, boot, clearPending } = useStore();

  useEffect(() => { boot(); }, [boot]);

  const rootStyle: CSSProperties = {
    position: 'relative', width: '100%', height: '100vh', display: 'flex', overflow: 'hidden',
    fontFamily: "'Noto Sans JP',sans-serif", color: '#fff', background: 'var(--bg)',
    ...(THEMES[theme] as CSSProperties),
  };

  return (
    <div style={rootStyle}>
      <Sidebar />
      <Background />
      <main style={{ position: 'relative', zIndex: 4, flex: 1, height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header />
        <div onClick={clearPending} style={{ flex: 1, overflowY: 'auto', padding: '24px 34px 40px' }}>
          {booted && <Screen />}
        </div>
      </main>
      <Modals />
      <Toast />
    </div>
  );
}
