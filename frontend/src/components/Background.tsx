// Decorative animated background layers (grid, glow blobs, scanline, vignette).
export function Background() {
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px)', backgroundSize: '64px 64px', animation: 'vvGrid 8s linear infinite', WebkitMaskImage: 'radial-gradient(120% 90% at 50% 0%,#000 30%,transparent 100%)', maskImage: 'radial-gradient(120% 90% at 50% 0%,#000 30%,transparent 100%)' }} />
      <div style={{ position: 'absolute', top: -200, left: -160, width: 620, height: 620, zIndex: 0, pointerEvents: 'none', borderRadius: '50%', background: 'radial-gradient(circle,var(--glow),transparent 70%)', filter: 'blur(40px)', animation: 'vvFloat 18s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', bottom: -260, right: -120, width: 560, height: 560, zIndex: 0, pointerEvents: 'none', borderRadius: '50%', background: 'radial-gradient(circle,var(--glow2),transparent 70%)', filter: 'blur(50px)', animation: 'vvFloat2 22s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', background: 'linear-gradient(180deg,transparent,rgba(255,255,255,.04),transparent)', height: '40%', animation: 'vvScan 9s linear infinite', opacity: 0.5 }} />
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', background: 'radial-gradient(120% 80% at 50% 50%,transparent 50%,rgba(2,3,8,.7) 100%)' }} />
    </>
  );
}
