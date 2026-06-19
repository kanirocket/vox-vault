// Decorative animated background layers (grid, glow blobs, scanline, vignette).
export function Background() {
  return (
    <>
      <div
        className="absolute inset-0 z-0 pointer-events-none animate-[vvGrid_8s_linear_infinite]"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px)', backgroundSize: '64px 64px', WebkitMaskImage: 'radial-gradient(120% 90% at 50% 0%,#000 30%,transparent 100%)', maskImage: 'radial-gradient(120% 90% at 50% 0%,#000 30%,transparent 100%)' }}
      />
      <div
        className="absolute -top-[200px] -left-[160px] w-[620px] h-[620px] z-0 pointer-events-none rounded-full blur-[40px] animate-[vvFloat_18s_ease-in-out_infinite]"
        style={{ background: 'radial-gradient(circle,var(--glow),transparent 70%)' }}
      />
      <div
        className="absolute -bottom-[260px] -right-[120px] w-[560px] h-[560px] z-0 pointer-events-none rounded-full blur-[50px] animate-[vvFloat2_22s_ease-in-out_infinite]"
        style={{ background: 'radial-gradient(circle,var(--glow2),transparent 70%)' }}
      />
      <div
        className="absolute inset-0 z-[1] pointer-events-none h-2/5 opacity-50 animate-[vvScan_9s_linear_infinite]"
        style={{ background: 'linear-gradient(180deg,transparent,rgba(255,255,255,.04),transparent)' }}
      />
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{ background: 'radial-gradient(120% 80% at 50% 50%,transparent 50%,rgba(2,3,8,.7) 100%)' }}
      />
    </>
  );
}
