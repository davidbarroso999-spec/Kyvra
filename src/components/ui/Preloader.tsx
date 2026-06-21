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
  abissal: "https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/HEROVIDEO/YouCut_abissal.webm",
  'sangue-de-drago': "https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/HEROVIDEO/YouCut_sanguededrago.webm",
  'floresta-negra': "https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/HEROVIDEO/YouCut_floresta.webm",
  'monolito': "https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/HEROVIDEO/YouCut_monolito.webm"
};

export function Preloader() {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [loadedSteps, setLoadedSteps] = useState<{fonts: boolean, video: boolean, audio: boolean}>({
    fonts: false,
    video: false,
    audio: false
  });
  const theme = useStore((state) => state.theme);

  const videoUrl = THEME_VIDEOS[theme] || THEME_VIDEOS.abissal;

  // Cycle cryptic text
  useEffect(() => {
    const textInterval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % CRYPTIC_PHRASES.length);
    }, 1200);
    return () => clearInterval(textInterval);
  }, []);

  // Real-time active resource checking and pre-buffer cycle
  useEffect(() => {
    let active = true;

    // 1. Preload and warm up active theme's video element natively
    const videoElement = document.createElement('video');
    videoElement.preload = "auto";
    videoElement.muted = true;
    videoElement.playsInline = true;
    
    const handleCanPlay = () => {
      if (active) {
        setLoadedSteps(prev => ({ ...prev, video: true }));
      }
    };
    videoElement.addEventListener('canplaythrough', handleCanPlay, { once: true });
    videoElement.src = videoUrl;
    videoElement.load();

    // 2. Check and wait for active typography readiness
    if (document.fonts) {
      document.fonts.ready.then(() => {
        if (active) {
          setLoadedSteps(prev => ({ ...prev, fonts: true }));
        }
      });
    } else {
      setLoadedSteps(prev => ({ ...prev, fonts: true }));
    }

    // 3. Check/Initialize synthetic audio compatibility
    setTimeout(() => {
      if (active) {
        setLoadedSteps(prev => ({ ...prev, audio: true }));
      }
    }, 450);

    // Progressive counter that behaves like a real resource installation
    let currentProgress = 0;
    const intervalTimer = setInterval(() => {
      if (!active) return;

      // Dynamic calculation: weight is given to real states
      // If fonts are ready, we allow progress to easily pass 40%
      // If video is ready, we allow progress to easily pass 75%
      // If audio is finished, we can zoom directly to 100%
      const targetMax = 
        (loadedSteps.fonts ? 40 : 25) + 
        (loadedSteps.video ? 35 : 20) + 
        (loadedSteps.audio ? 25 : 15);

      if (currentProgress < targetMax) {
        currentProgress += Math.random() * 3 + 1.5;
      } else if (currentProgress < 99) {
        currentProgress += 0.3; // Micro crawl while awaiting assets
      }

      const finalProgress = Math.min(100, currentProgress);
      setProgress(finalProgress);

      if (finalProgress >= 100) {
        clearInterval(intervalTimer);
        setTimeout(() => {
          if (active) setIsVisible(false);
        }, 300);
      }
    }, 30);

    const startPreload = () => {
      const keys = Object.keys(THEME_VIDEOS);
      const localThemeVideoUrls: Record<string, string> = {};
      
      // Assign native optimal media URLs
      keys.forEach(k => {
        localThemeVideoUrls[k] = THEME_VIDEOS[k];
      });

      if (active) {
        try {
          const state = useStore.getState();
          state.setThemeVideoUrls(localThemeVideoUrls);
          if (state.setIsLoadingFinished) {
            state.setIsLoadingFinished(true);
          }
        } catch (stateErr) {
          console.error("[Kyvra Preloader] Error updating store with video URLs:", stateErr);
        }
      }
    };

    startPreload();

    // Safety fallback: ensure loading closes after 3 seconds maximum to protect UX
    const forceReadyTimer = setTimeout(() => {
      if (active) {
        setProgress(100);
        setIsVisible(false);
      }
    }, 3500);

    return () => {
      active = false;
      clearInterval(intervalTimer);
      clearTimeout(forceReadyTimer);
      videoElement.removeEventListener('canplaythrough', handleCanPlay);
      videoElement.src = '';
      videoElement.load();
    };
  }, [videoUrl, loadedSteps.fonts, loadedSteps.video, loadedSteps.audio]);

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
              className="font-cormorant text-xs sm:text-sm text-white/50 tracking-widest uppercase mt-3 mb-8 h-4"
            >
              {CRYPTIC_PHRASES[phraseIndex]}
            </motion.p>

            {/* Premium progress timeline */}
            <div className="w-64 h-[2px] bg-white/5 rounded-full relative overflow-hidden mb-3">
              <motion.div 
                className="h-full bg-gradient-to-r from-primary/70 to-primary rounded-full shadow-[0_0_8px_var(--primary)]"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Glowing percentage readout */}
            <motion.span 
              className="font-mono text-[10px] tracking-wider text-primary/80 font-semibold mb-8"
              style={{ textShadow: "0 0 5px rgba(168,85,247,0.4)" }}
            >
              {Math.min(100, Math.floor(progress))}%
            </motion.span>

            {/* Elegant live diagnostics checklist of the resource system */}
            <div className="flex flex-col gap-2 items-start text-[9px] font-mono tracking-widest text-left transform translate-x-4">
              <div className="flex items-center gap-2 transition-opacity duration-300">
                <span className={`w-1.5 h-1.5 rounded-full ${loadedSteps.fonts ? 'bg-primary shadow-[0_0_8px_var(--primary)] animate-pulse' : 'bg-white/10'}`} />
                <span className={loadedSteps.fonts ? 'text-white/70' : 'text-white/20'}>FONTES TIPOGRÁFICAS REGISTRADAS</span>
              </div>
              <div className="flex items-center gap-2 transition-opacity duration-300">
                <span className={`w-1.5 h-1.5 rounded-full ${loadedSteps.video ? 'bg-primary shadow-[0_0_8px_var(--primary)] animate-pulse' : 'bg-white/10'}`} />
                <span className={loadedSteps.video ? 'text-white/70' : 'text-white/20'}>HARMONIA DE VÍDEO CONECTADA ({theme.toUpperCase()})</span>
              </div>
              <div className="flex items-center gap-2 transition-opacity duration-300">
                <span className={`w-1.5 h-1.5 rounded-full ${loadedSteps.audio ? 'bg-primary shadow-[0_0_8px_var(--primary)] animate-pulse' : 'bg-white/10'}`} />
                <span className={loadedSteps.audio ? 'text-white/70' : 'text-white/20'}>SINTONIZADOR DE CULTO PREPARADO</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
