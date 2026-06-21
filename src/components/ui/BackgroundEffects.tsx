export function BackgroundEffects() {
  return (
    <div className="fixed top-0 left-0 w-full h-full -z-20 pointer-events-none overflow-hidden bg-void" style={{ contain: 'strict' }}>
      {/* 
        Extreme performance mode: Use native CSS radial gradients instead of blur() filters.
        Used high-performance GPU-composited CSS keyframe animations instead of Framer Motion.
      */}
      <div 
        className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] opacity-20 ambient-blur-one" 
        style={{ 
          background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)',
          transform: 'translateZ(0)' 
        }} 
      />
      <div 
        className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] opacity-20 ambient-blur-two" 
        style={{ 
          background: 'radial-gradient(circle, var(--secondary) 0%, transparent 70%)',
          transform: 'translateZ(0)' 
        }} 
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,var(--glow-purple)_0%,transparent_60%)] opacity-20" />
    </div>
  );
}
