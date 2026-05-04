export function BackgroundEffects() {
  return (
    <div className="fixed top-0 left-0 w-full h-full -z-20 pointer-events-none overflow-hidden bg-void">
      {/* Optimized CSS gradients instead of JavaScript Canvas rendering to hit 120 FPS */}
      <div 
        className="absolute top-1/4 left-1/4 w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-primary/10 rounded-full blur-[100px] animate-[pulse_10s_ease-in-out_infinite] opacity-30" 
        style={{ transform: 'translateZ(0)', willChange: 'transform' }} 
      />
      <div 
        className="absolute bottom-1/4 right-1/4 w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] bg-secondary/10 rounded-full blur-[100px] animate-[pulse_12s_ease-in-out_infinite_reverse] opacity-30" 
        style={{ transform: 'translateZ(0)', willChange: 'transform' }} 
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,var(--glow-purple)_0%,transparent_60%)] opacity-20" />
    </div>
  );
}
