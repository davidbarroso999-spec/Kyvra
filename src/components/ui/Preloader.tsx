import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const CRYPTIC_PHRASES = [
  "INICIANDO RITUAL DE CONEXÃO...",
  "ILUMINANDO A ÉGIDE DA LUA...",
  "SINTONIZANDO ECO DAS ESTRELAS...",
  "DESPERTANDO FRAGMENTOS ABISSAIS...",
  "RECONSTRUINDO PORTAL DE KYVRA..."
];

export function Preloader() {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [phraseIndex, setPhraseIndex] = useState(0);

  // Cycle cryptic text
  useEffect(() => {
    const textInterval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % CRYPTIC_PHRASES.length);
    }, 1100);
    return () => clearInterval(textInterval);
  }, []);

  // Animate progress bar to 100% over 5.0 seconds
  useEffect(() => {
    const totalDuration = 5000; // 5.0s
    const stepTime = 25;
    const totalSteps = totalDuration / stepTime;
    const increment = 100 / totalSteps;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + increment;
        if (next >= 100) {
          clearInterval(timer);
          // Wait briefly, then trigger exit fade out
          setTimeout(() => {
            setIsVisible(false);
          }, 350);
          return 100;
        }
        return next;
      });
    }, stepTime);

    return () => clearInterval(timer);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0,
            transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] } 
          }}
          className="fixed inset-0 z-[999999] bg-[#030303] flex flex-col items-center justify-center select-none overflow-hidden"
        >
          {/* Noise background for rich atmosphere */}
          <div className="absolute inset-0 bg-[#030303]">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
            }} />
          </div>

          {/* Ambient glowing radial light in the center */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] bg-primary/10 rounded-full blur-[100px] pointer-events-none opacity-55 animate-pulse" />

          {/* Main loader design elements */}
          <div className="relative z-10 flex flex-col items-center text-center px-6">
            {/* Logo display */}
            <motion.h1 
              initial={{ letterSpacing: "0.2em", opacity: 0 }}
              animate={{ letterSpacing: "0.4em", opacity: 1 }}
              transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
              className="font-display text-4xl sm:text-6xl text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/40 font-bold ml-4"
              style={{ textShadow: "0 0 30px rgba(168,85,247,0.15)" }}
            >
              KYVRA
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 1 }}
              className="font-cormorant text-xs sm:text-sm text-white/50 tracking-widest uppercase mt-3 mb-10 h-4"
            >
              {CRYPTIC_PHRASES[phraseIndex]}
            </motion.p>

            {/* Premium progress timeline */}
            <div className="w-56 h-[2px] bg-white/5 rounded-full relative overflow-hidden mb-3">
              <motion.div 
                className="h-full bg-gradient-to-r from-primary/70 to-primary rounded-full shadow-[0_0_8px_var(--primary)]"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Glowing percentage readout */}
            <motion.span 
              className="font-mono text-[10px] tracking-wider text-primary/80 font-semibold"
              style={{ textShadow: "0 0 5px rgba(168,85,247,0.4)" }}
            >
              {Math.min(100, Math.floor(progress))}%
            </motion.span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
