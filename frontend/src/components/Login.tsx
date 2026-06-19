import { useEffect, useRef } from 'react';
import { useStore } from '../store';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

// Minimal typing for the Google Identity Services global.
interface GoogleId {
  accounts: {
    id: {
      initialize: (cfg: { client_id: string; callback: (r: { credential: string }) => void }) => void;
      renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
    };
  };
}
declare global {
  interface Window { google?: GoogleId }
}

function loadGis(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const existing = document.getElementById('gis-script');
    if (existing) { existing.addEventListener('load', () => resolve()); return; }
    const s = document.createElement('script');
    s.id = 'gis-script';
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('failed to load Google Identity Services'));
    document.head.appendChild(s);
  });
}

export function Login() {
  const loginWithGoogle = useStore((s) => s.loginWithGoogle);
  const btnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;
    loadGis().then(() => {
      if (cancelled || !window.google || !btnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: (r) => loginWithGoogle(r.credential),
      });
      window.google.accounts.id.renderButton(btnRef.current, {
        theme: 'filled_black', size: 'large', shape: 'pill', text: 'continue_with', width: 280,
      });
    }).catch(() => { /* network/script error — handled by the missing button */ });
    return () => { cancelled = true; };
  }, [loginWithGoogle]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', display: 'grid', placeItems: 'center', fontFamily: "'Noto Sans JP',sans-serif", color: '#fff', background: 'radial-gradient(140% 120% at 50% -10%,#0b1126,#04050c 60%)', overflow: 'hidden' }}>
      <div style={{ position: 'relative', zIndex: 2, width: 'min(92vw,420px)', textAlign: 'center', padding: '44px 34px 40px', borderRadius: 22, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.09)', backdropFilter: 'blur(18px)', boxShadow: '0 0 60px rgba(56,232,255,.12)' }}>
        <div style={{ width: 62, height: 62, borderRadius: 16, margin: '0 auto 20px', display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg,#38e8ff,#7b5bff)', boxShadow: '0 0 30px rgba(56,232,255,.5)' }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#06070f" strokeWidth="2.4" strokeLinecap="round"><path d="M12 3v12" /><circle cx="9" cy="17" r="3" /><path d="M12 3l7 2v4" /></svg>
        </div>
        <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 900, fontSize: 24, letterSpacing: 1 }}>VOX<span style={{ color: '#38e8ff' }}>//</span>VAULT</div>
        <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, letterSpacing: 3, color: 'rgba(255,255,255,.4)', marginTop: 6 }}>KARAOKE ARCHIVE</div>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,.55)', lineHeight: 1.8, margin: '26px 0 24px' }}>
          サインインして、あなただけのお気に入り・<br />マイリスト・歌唱記録を管理しましょう。
        </p>
        {CLIENT_ID ? (
          <div ref={btnRef} style={{ display: 'flex', justifyContent: 'center', minHeight: 44 }} />
        ) : (
          <div style={{ padding: '14px 16px', borderRadius: 10, background: 'rgba(255,200,0,.07)', border: '1px solid rgba(255,200,0,.3)', fontSize: 12, color: '#ffd24a', lineHeight: 1.7, textAlign: 'left' }}>
            Google サインインが未設定です。<br />
            <code style={{ fontFamily: "'Share Tech Mono',monospace" }}>VITE_GOOGLE_CLIENT_ID</code> をビルド時に設定してください。
          </div>
        )}
      </div>
    </div>
  );
}
