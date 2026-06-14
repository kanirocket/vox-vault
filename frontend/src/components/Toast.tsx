import { useStore } from '../store';

const TONE: Record<string, string> = {
  success: 'linear-gradient(135deg,rgba(34,211,238,.22),rgba(167,139,250,.18))',
  info: 'rgba(255,255,255,.1)',
  error: 'rgba(255,80,80,.18)',
};

export function Toast() {
  const toast = useStore((s) => s.toast);
  if (!toast) return null;
  return (
    <div key={toast.ts} style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 300, padding: '13px 20px', borderRadius: 12, backdropFilter: 'blur(16px)', background: TONE[toast.type] || TONE.success, border: '1px solid rgba(255,255,255,.15)', boxShadow: '0 8px 32px rgba(0,0,0,.4)', fontSize: 13, fontWeight: 700, color: '#fff', animation: 'vvToast 2.6s ease forwards', maxWidth: 340, pointerEvents: 'none' }}>
      {toast.msg}
    </div>
  );
}
