export function BackgroundEffects() {
  return (
    <div className="fixed top-0 left-0 w-full h-full -z-20 pointer-events-none overflow-hidden bg-void" style={{ contain: 'strict' }}>
      {/* Clean, deep void background without noisy blurs or ambient glow artifacts */}
    </div>
  );
}

