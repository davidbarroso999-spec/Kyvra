import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '@/store/useStore';

const CRYPTIC_PHRASES = [
  "INICIANDO RITUAL DE CONEXÃO...",
  "ILUMINANDO A ÉGIDE DA LUA...",
  "SINTONIZANDO ECO DAS ESTRELAS...",
  "DESPERTANDO FRAGMENTOS ABISSAIS...",
  "RECONSTRUINDO PORTAL DE KYVRA..."
];

const THEME_VIDEOS: Record<string, string> = {
  abissal: "https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/HEROVIDEO/YouCut_20260620_140915393.mp4",
  'sangue-de-drago': "https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/HEROVIDEO/YouCut_sanguededrago.mp4",
  'floresta-negra': "https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/HEROVIDEO/YouCut_floresta.mp4",
  'monolito': "https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/HEROVIDEO/YouCut_monolito.mp4"
};

export function Preloader() {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const { theme } = useStore();

  const videoUrl = THEME_VIDEOS[theme] || THEME_VIDEOS.abissal;

  // Cycle cryptic text
  useEffect(() => {
    const textInterval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % CRYPTIC_PHRASES.length);
    }, 1200);
    return () => clearInterval(textInterval);
  }, []);

  // Real programmatic fetch of the video file & buffering to browser cache
  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    // Setup an off-screen HTML5 video to trigger hardware decoder buffering
    const videoElement = document.createElement('video');
    videoElement.preload = "auto";
    videoElement.muted = true;
    videoElement.playsInline = true;
    videoElement.src = videoUrl;

    let timeProgress = 0;
    let fileProgress = 0;

    // Premium ritual duration (3.2 seconds for quick but highly aesthetic feedback)
    const minDuration = 3200; 
    const stepTime = 20;
    const totalSteps = minDuration / stepTime;
    const timeIncrement = 100 / totalSteps;

    // Background timer
    const intervalTimer = setInterval(() => {
      if (!active) return;
      timeProgress += timeIncrement;
      if (timeProgress > 100) timeProgress = 100;
      
      updateOverallProgress();
    }, stepTime);

    const updateOverallProgress = () => {
      if (!active) return;

      // Smooth progress calculation
      let displayed = timeProgress;
      if (fileProgress < 100) {
        // Limit progress to 95% until fetch has successfully warmed the cache
        displayed = Math.min(95, timeProgress * 0.9 + fileProgress * 0.1);
      } else {
        displayed = Math.max(timeProgress, fileProgress);
      }

      const endVal = Math.min(100, Math.floor(displayed));
      setProgress(endVal);

      if (endVal >= 100) {
        clearInterval(intervalTimer);
        setTimeout(() => {
          if (active) setIsVisible(false);
        }, 150);
      }
    };

    const startPreload = async () => {
      try {
        // Trigger browser's background thread network download to disk cache.
        // We do NOT read chunk-by-chunk on the JavaScript main thread.
        // This keeps the main thread 100% free for GPU-accelerated CSS/motion animations.
        await fetch(videoUrl, {
          signal: controller.signal,
          cache: 'force-cache'
        });
        
        fileProgress = 100;
        updateOverallProgress();
      } catch (err) {
        // Fallback: immediately treat file as 100% and rely purely on timeProgress
        fileProgress = 100;
        updateOverallProgress();
      }
    };

    startPreload();

    return () => {
      active = false;
      controller.abort();
      clearInterval(intervalTimer);
      videoElement.src = '';
      videoElement.load();
    };
  }, [videoUrl]);

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
