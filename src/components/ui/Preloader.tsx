import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '@/store/useStore';
import { getLoreChapters, getAlbums, getAllTracks, getFeaturedTracksSettings } from '@/lib/apiCache';
import { startPreloadingAlbumsFrames } from '@/lib/albumsFrameCache';
import { resumeSmoothScroll } from '@/lib/smoothScroll';

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
  'floresta-negra': "https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/HEROVIDEO/YouCut_florestanegra.webm",
  'monolito': "https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/HEROVIDEO/YouCut_monolito.webm"
};

export function Preloader() {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [loadedSteps, setLoadedSteps] = useState<{fonts: boolean, video: boolean, audio: boolean, frames: boolean, database: boolean}>({
    fonts: false,
    video: false,
    audio: false,
    frames: false,
    database: false
  });
  const theme = useStore((state) => state.theme);

  const videoUrl = THEME_VIDEOS[theme] || THEME_VIDEOS.abissal;

  const loadedStepsRef = useRef({ fonts: false, video: false, audio: false, frames: false, database: false });

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

    // 0. Proactively query and warm up memory cache with database assets
    Promise.all([
      getLoreChapters(),
      getAlbums(),
      getAllTracks(),
      getFeaturedTracksSettings()
    ]).then(() => {
      if (active) {
        setLoadedSteps(prev => ({ ...prev, database: true }));
        loadedStepsRef.current.database = true;
      }
    }).catch((err) => {
      console.error("[Preloader] DB warm-up error:", err);
      // We still mark it true so we don't block the app forever on network fail
      if (active) {
        setLoadedSteps(prev => ({ ...prev, database: true }));
        loadedStepsRef.current.database = true;
      }
    });

    // 1. Pré-carregar os frames iniciais da sequência de imagens da página de Álbuns (continua em background)
    startPreloadingAlbumsFrames((loaded) => {
      // Assim que os primeiros 15 frames essenciais para o início suave estiverem na memória
      if (active && loaded >= 15 && !loadedStepsRef.current.frames) {
        setLoadedSteps(prev => ({ ...prev, frames: true }));
        loadedStepsRef.current.frames = true;
      }
    }).then(() => {
      if (active && !loadedStepsRef.current.frames) {
        setLoadedSteps(prev => ({ ...prev, frames: true }));
        loadedStepsRef.current.frames = true;
      }
    }).catch((err) => {
      console.error("[Preloader] Frames preload error:", err);
      if (active && !loadedStepsRef.current.frames) {
        setLoadedSteps(prev => ({ ...prev, frames: true }));
        loadedStepsRef.current.frames = true;
      }
    });

    // 2. Preload and warm up active theme's video element natively
    const videoElement = document.createElement('video');
    videoElement.preload = "auto";
    videoElement.muted = true;
    videoElement.playsInline = true;
    
    const handleCanPlay = () => {
      if (active && !loadedStepsRef.current.video) {
        setLoadedSteps(prev => ({ ...prev, video: true }));
        loadedStepsRef.current.video = true;
      }
    };
    videoElement.addEventListener('canplaythrough', handleCanPlay, { once: true });
    videoElement.addEventListener('canplay', handleCanPlay, { once: true });
    videoElement.addEventListener('loadeddata', handleCanPlay, { once: true });
    videoElement.src = videoUrl;
    videoElement.load();

    // Fallback de vídeo para conexões restritas ou dispositivos com data-saver
    const videoTimeout = setTimeout(() => {
      if (active && !loadedStepsRef.current.video) {
        setLoadedSteps(prev => ({ ...prev, video: true }));
        loadedStepsRef.current.video = true;
      }
    }, 2000);

    // 3. Check and wait for active typography readiness
    if (document.fonts) {
      document.fonts.ready.then(() => {
        if (active) {
          setLoadedSteps(prev => ({ ...prev, fonts: true }));
          loadedStepsRef.current.fonts = true;
        }
      });
    } else {
      setLoadedSteps(prev => ({ ...prev, fonts: true }));
      loadedStepsRef.current.fonts = true;
    }

    // 4. Check/Initialize synthetic audio compatibility
    setTimeout(() => {
      if (active) {
        setLoadedSteps(prev => ({ ...prev, audio: true }));
        loadedStepsRef.current.audio = true;
      }
    }, 300);

    // Progressive counter 120 FPS via requestAnimationFrame (Zero re-render spam)
    let currentProgress = 0;
    let animFrameId: number;
    let lastTime = performance.now();

    const updateProgressLoop = (now: number) => {
      if (!active) return;
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const currentSteps = loadedStepsRef.current;
      const allLoaded = currentSteps.fonts && currentSteps.video && currentSteps.audio && currentSteps.frames && currentSteps.database;
      const targetMax = 
        (currentSteps.fonts ? 15 : 5) + 
        (currentSteps.video ? 20 : 5) + 
        (currentSteps.audio ? 15 : 5) +
        (currentSteps.database ? 25 : 10) +
        (currentSteps.frames ? 25 : 5);

      if (allLoaded) {
        // Interpola rapidamente para 100%
        currentProgress += (100 - currentProgress) * Math.min(1, delta * 12) + 0.8;
      } else if (currentProgress < targetMax) {
        currentProgress += (targetMax - currentProgress) * Math.min(1, delta * 8) + 0.2;
      } else if (currentProgress < 95) {
        currentProgress += delta * 2;
      }

      const finalProgress = Math.min(100, currentProgress);
      setProgress(Math.floor(finalProgress));

      if (finalProgress >= 99.5) {
        setProgress(100);
        setTimeout(() => {
          if (active) {
            setIsVisible(false);
            resumeSmoothScroll();
            const state = useStore.getState();
            if (state.setIsLoadingFinished) {
              state.setIsLoadingFinished(true);
            }
          }
        }, 200);
        return;
      }

      animFrameId = requestAnimationFrame(updateProgressLoop);
    };

    animFrameId = requestAnimationFrame(updateProgressLoop);

    const startPreload = () => {
      const keys = Object.keys(THEME_VIDEOS);
      const localThemeVideoUrls: Record<string, string> = {};
      
      // Inject native optimal media preloads into the head
      keys.forEach(k => {
        const url = THEME_VIDEOS[k];
        localThemeVideoUrls[k] = url;
        
        // Native Link tag preloading only for the ACTIVE theme to preserve massive bandwidth
        if (k === theme) {
          const existingLink = document.querySelector(`link[href="${url}"]`);
          if (!existingLink) {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'video';
            link.href = url;
            document.head.appendChild(link);
          }
        }
      });

      if (active) {
        try {
          const state = useStore.getState();
          state.setThemeVideoUrls(localThemeVideoUrls);
        } catch (stateErr) {
          console.error("[Kyvra Preloader] Error updating store with video URLs:", stateErr);
        }
      }
    };

    startPreload();

    // Fallback de Segurança: Garante início em no máximo 5 segundos mesmo em redes 3G instáveis
    const forceReadyTimer = setTimeout(() => {
      if (active) {
        console.warn("[Preloader] Safety timeout reached. Forcing app start.");
        setProgress(100);
        setIsVisible(false);
        resumeSmoothScroll();
        const state = useStore.getState();
        if (state.setIsLoadingFinished) {
          state.setIsLoadingFinished(true);
        }
      }
    }, 5000);

    return () => {
      active = false;
      cancelAnimationFrame(animFrameId);
      clearTimeout(videoTimeout);
      clearTimeout(forceReadyTimer);
      videoElement.removeEventListener('canplaythrough', handleCanPlay);
      videoElement.removeEventListener('canplay', handleCanPlay);
      videoElement.removeEventListener('loadeddata', handleCanPlay);
      videoElement.src = '';
      videoElement.load();
    };
  }, []); // Run only once on mount instead of reacting to theme changes

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

          {/* Ambient glowing radial light in the center optimized without CSS blur */}
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] pointer-events-none opacity-55 animate-pulse" 
            style={{
              background: 'radial-gradient(circle at center, rgba(168,85,247,0.2) 0%, transparent 70%)',
              transform: 'translate(-50%, -50%) translateZ(0)'
            }}
          />

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
                <span className={`w-1.5 h-1.5 rounded-full ${loadedSteps.database ? 'bg-primary shadow-[0_0_8px_var(--primary)] animate-pulse' : 'bg-white/10'}`} />
                <span className={loadedSteps.database ? 'text-white/70' : 'text-white/20'}>CONEXÃO COM O ARQUIVO CENTRAL ESTABELECIDA</span>
              </div>
              <div className="flex items-center gap-2 transition-opacity duration-300">
                <span className={`w-1.5 h-1.5 rounded-full ${loadedSteps.fonts ? 'bg-primary shadow-[0_0_8px_var(--primary)] animate-pulse' : 'bg-white/10'}`} />
                <span className={loadedSteps.fonts ? 'text-white/70' : 'text-white/20'}>FONTES TIPOGRÁFICAS REGISTRADAS</span>
              </div>
              <div className="flex items-center gap-2 transition-opacity duration-300">
                <span className={`w-1.5 h-1.5 rounded-full ${loadedSteps.video ? 'bg-primary shadow-[0_0_8px_var(--primary)] animate-pulse' : 'bg-white/10'}`} />
                <span className={loadedSteps.video ? 'text-white/70' : 'text-white/20'}>HARMONIA DE VÍDEO CONECTADA ({theme.toUpperCase()})</span>
              </div>
              <div className="flex items-center gap-2 transition-opacity duration-300">
                <span className={`w-1.5 h-1.5 rounded-full ${loadedSteps.frames ? 'bg-primary shadow-[0_0_8px_var(--primary)] animate-pulse' : 'bg-white/10'}`} />
                <span className={loadedSteps.frames ? 'text-white/70' : 'text-white/20'}>CRÔNICA VISUAL DAS RELÍQUIAS SINCRONIZADA</span>
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
