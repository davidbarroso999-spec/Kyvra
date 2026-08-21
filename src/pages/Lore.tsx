import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '@/store/useStore';
import { getLoreChapters } from '@/lib/apiCache';
import { 
  BookOpen, 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  X,
  FileText,
  Check
 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

const LORE_THEME_VIDEOS: Record<string, string> = {
  abissal: "https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/LOREVIDEO/YouCut_LOREABISSAL.webm",
  'sangue-de-drago': "https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/LOREVIDEO/YouCut_LORESANGUEDEDRAGO.webm",
  'floresta-negra': "https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/LOREVIDEO/YouCut_LOREFLORESTANEGRA.webm",
  'monolito': "https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/LOREVIDEO/YouCut_LOREMONOLITO.webm"
};

// Framer motion animation variants for ultra-smooth staggered slide transitions
const containerVariants = {
  initial: (dir: 'next' | 'prev') => ({
    opacity: 0,
    x: dir === 'next' ? 60 : -60,
    filter: 'blur(8px)',
  }),
  animate: {
    opacity: 1,
    x: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1] as const, // custom smooth cubic bezier
      staggerChildren: 0.08,
      delayChildren: 0.05,
    }
  },
  exit: (dir: 'next' | 'prev') => ({
    opacity: 0,
    x: dir === 'next' ? -60 : 60,
    filter: 'blur(8px)',
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1] as const,
    }
  })
};

const childVariants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1] as const,
    }
  },
  exit: {
    opacity: 0,
    y: -15,
    transition: {
      duration: 0.4,
      ease: "easeIn" as const,
    }
  }
};

export function Lore() {
  const theme = useStore((state) => state.theme);
  const [chapters, setChapters] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [readingModalOpen, setReadingModalOpen] = useState(false);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const videoRetries = useRef<Record<string, number>>({});
  const [currentVideoTheme, setCurrentVideoTheme] = useState(theme);
  const [previousVideoTheme, setPreviousVideoTheme] = useState<string | null>(null);
  const [fadeActive, setFadeActive] = useState(false);
  const prevThemeRef = useRef(theme);

  const handleVideoError = (tName: string, e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const video = e.currentTarget;
    const count = videoRetries.current[tName] || 0;
    if (count < 3) {
      videoRetries.current[tName] = count + 1;
      console.warn(`[Kyvra Video Engine] Erro ao carregar vídeo do tema ${tName}. Tentando recarregar (${count + 1}/3)...`);
      setTimeout(() => {
        if (video) {
          video.load();
          video.play().catch(() => {});
        }
      }, 1500);
    } else {
      console.error(`[Kyvra Video Engine] Falha persistente ao carregar o vídeo para o tema ${tName}. Mantendo plano de fundo atmosférico.`);
    }
  };
  const [readChapters, setReadChapters] = useState<string[]>([]);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [videoLoaded, setVideoLoaded] = useState<Record<string, boolean>>({});
  const [loopFading, setLoopFading] = useState<Record<string, boolean>>({});
  const [initialDelayOver, setInitialDelayOver] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialDelayOver(true);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    try {
      const cached = localStorage.getItem('kyvra-lore-read-chapters');
      if (cached) {
        setReadChapters(JSON.parse(cached));
      }
    } catch (e) {
      console.error("Failed to load read chapters", e);
    }
  }, []);

  const toggleChapterRead = (chapterId: string) => {
    setReadChapters((prev) => {
      const updated = prev.includes(chapterId)
        ? prev.filter((id) => id !== chapterId)
        : [...prev, chapterId];
      localStorage.setItem('kyvra-lore-read-chapters', JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    async function fetchLore() {
      const { data, error } = await getLoreChapters();
      if (!error && data) {
        setChapters(data.filter((c: any) => c.title && !c.title.startsWith('__')));
      }
    }
    fetchLore();
  }, []);

  const currentChapter = chapters[currentIndex] || null;

  const handleNext = () => {
    if (chapters.length > 0) {
      setDirection('next');
      setCurrentIndex((prev) => (prev + 1) % chapters.length);
    }
  };

  const handlePrev = () => {
    if (chapters.length > 0) {
      setDirection('prev');
      setCurrentIndex((prev) => (prev - 1 + chapters.length) % chapters.length);
    }
  };

  // Handle smooth dual-video crossfade transition on theme change
  useEffect(() => {
    if (theme !== prevThemeRef.current) {
      setPreviousVideoTheme(prevThemeRef.current);
      setCurrentVideoTheme(theme);
      setFadeActive(false);
      prevThemeRef.current = theme;

      // Trigger animation on next paint
      const frame = requestAnimationFrame(() => {
        setFadeActive(true);
      });

      const timer = setTimeout(() => {
        setPreviousVideoTheme(null);
        setFadeActive(false);
      }, 2000);

      return () => {
        cancelAnimationFrame(frame);
        clearTimeout(timer);
      };
    }
  }, [theme]);

  // Handle playing of current and transitioning videos programmatically
  useEffect(() => {
    if (!initialDelayOver) return;

    const playVideo = (videoEl: HTMLVideoElement | null) => {
      if (!videoEl) return;
      videoEl.muted = true;
      if (videoEl.paused) {
        videoEl.play().catch((err) => {
          console.log("[Kyvra Video Engine] Playback promise rejected, waiting for user interaction.", err);
        });
      }
    };

    const activeVideo = videoRefs.current[currentVideoTheme];
    if (activeVideo) {
      activeVideo.preload = "auto";
      playVideo(activeVideo);
    }

    if (previousVideoTheme) {
      const prevVideo = videoRefs.current[previousVideoTheme];
      if (prevVideo) {
        playVideo(prevVideo);
      }
    }
  }, [currentVideoTheme, previousVideoTheme, initialDelayOver]);

  // Global click & touch interaction overrider to satisfy strict browser autoplay requirements
  useEffect(() => {
    if (!initialDelayOver) return;

    const forceAutoplay = () => {
      try {
        const activeVideo = videoRefs.current[currentVideoTheme];
        if (activeVideo && activeVideo.paused) {
          activeVideo.play().catch(() => {});
        }
      } catch (err) {
        console.warn("[Kyvra Video Engine] Interaction-triggered autoplay failed: ", err);
      }
    };

    const interactionEvents = ['click', 'touchstart', 'pointerdown', 'scroll', 'keydown'];
    interactionEvents.forEach(evt => {
      document.addEventListener(evt, forceAutoplay, { once: true, passive: true });
    });

    return () => {
      interactionEvents.forEach(evt => {
        document.removeEventListener(evt, forceAutoplay);
      });
    };
  }, [currentVideoTheme, initialDelayOver]);

  // Self-healing / keep-alive heartbeat for background suspension recovery & focus recovery
  useEffect(() => {
    if (!initialDelayOver) return;

    const handleAutoplayRecovery = () => {
      if (document.visibilityState === 'visible') {
        const activeVid = videoRefs.current[theme];
        if (activeVid && activeVid.paused) {
          activeVid.play().catch(() => {});
        }
      }
    };

    const heartbeatTimer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        const activeVid = videoRefs.current[theme];
        if (activeVid && activeVid.paused) {
          activeVid.muted = true;
          activeVid.play().catch(() => {});
        }
      }
    }, 1500);

    document.addEventListener('visibilitychange', handleAutoplayRecovery, { passive: true });
    window.addEventListener('focus', handleAutoplayRecovery, { passive: true });

    return () => {
      clearInterval(heartbeatTimer);
      document.removeEventListener('visibilitychange', handleAutoplayRecovery);
      window.removeEventListener('focus', handleAutoplayRecovery);
    };
  }, [theme, initialDelayOver]);

  // Prevent background scroll when menu is open
  useEffect(() => {
    if (readingModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [readingModalOpen]);

  return (
    <div className="w-full h-[100dvh] overflow-hidden bg-black text-white font-inter flex flex-col relative">
      {/* Background Video (z-index 0) */}
      <div className="fixed inset-0 z-0 flex items-center justify-center bg-black overflow-hidden">
        {/* Elegant Cinematic Fallback Background for Lore */}
        <div className="absolute inset-0 bg-black opacity-100 z-[1] pointer-events-none transition-all duration-[2000ms]">
          <div 
            className="absolute top-[30%] left-[20%] w-[80vw] h-[80vw] rounded-full transition-all duration-[2000ms] ease-in-out mix-blend-screen opacity-25 animate-pulse"
            style={{
              background: theme === 'abissal' ? 'radial-gradient(circle, rgba(168,85,247,0.3) 0%, transparent 70%)' :
                          theme === 'sangue-de-drago' ? 'radial-gradient(circle, rgba(239,68,68,0.3) 0%, transparent 70%)' :
                          theme === 'floresta-negra' ? 'radial-gradient(circle, rgba(16,185,129,0.25) 0%, transparent 70%)' :
                          'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)',
              transform: 'translateZ(0)'
            }}
          />
          <div 
            className="absolute bottom-[20%] right-[10%] w-[70vw] h-[70vw] rounded-full transition-all duration-[2000ms] ease-in-out mix-blend-screen opacity-15 animate-pulse"
            style={{
              background: theme === 'abissal' ? 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)' :
                          theme === 'sangue-de-drago' ? 'radial-gradient(circle, rgba(220,38,38,0.2) 0%, transparent 70%)' :
                          theme === 'floresta-negra' ? 'radial-gradient(circle, rgba(5,150,105,0.18) 0%, transparent 70%)' :
                          'radial-gradient(circle, rgba(148,163,184,0.1) 0%, transparent 70%)',
              transform: 'translateZ(0)'
            }}
          />
        </div>

        {/* Dual-Video Hardware-Accelerated Crossfade Engine (Max 2 simultaneous players to satisfy low-resource devices and browser limits) */}
        {initialDelayOver && [previousVideoTheme, currentVideoTheme].map((tName) => {
          if (!tName) return null;
          const isCurrent = tName === currentVideoTheme;
          const isTransitionActive = previousVideoTheme !== null;
          const isLoaded = videoLoaded[tName];
          const isLoopFading = loopFading[tName];
          
          // Determine dynamic opacity during crossfade transition
          let opacityClass = "opacity-0 z-0 pointer-events-none scale-105";
          if (isCurrent && isLoaded) {
            if (isTransitionActive) {
              opacityClass = fadeActive ? "opacity-90 z-10 scale-100" : "opacity-0 z-10 scale-[1.02]";
            } else {
              opacityClass = isLoopFading 
                ? "opacity-0 scale-[1.02] z-10" 
                : "opacity-90 scale-100 z-10";
            }
          } else if (!isCurrent) {
            // This is the previous video fading out
            opacityClass = fadeActive ? "opacity-0 z-0 pointer-events-none scale-105" : "opacity-90 z-0 scale-100";
          }

          return (
            <video
              key={`lore-video-${tName}`}
              ref={el => {
                videoRefs.current[tName] = el;
              }}
              src={LORE_THEME_VIDEOS[tName]}
              autoPlay={false}
              loop={true}
              muted={true}
              playsInline={true}
              preload="auto"
              className={cn(
                "absolute inset-0 w-full h-full object-cover bg-transparent",
                opacityClass
              )}
              style={{
                willChange: "opacity, transform",
                transform: "translate3d(0,0,0)",
                backfaceVisibility: "hidden",
                transition: isLoopFading
                  ? "opacity 1000ms cubic-bezier(0.25, 1, 0.5, 1), transform 1000ms cubic-bezier(0.25, 1, 0.5, 1)"
                  : "opacity 2000ms ease-in-out, transform 2000ms ease-in-out"
              }}
              onError={(e) => handleVideoError(tName, e)}
              onTimeUpdate={(e) => {
                const video = e.currentTarget;
                if (!video || !video.duration) return;
                const timeLeft = video.duration - video.currentTime;
                // Start fade-out when less than 1.0 second remains
                if (timeLeft < 1.0 && timeLeft > 0) {
                  if (!loopFading[tName]) {
                    setLoopFading(prev => ({ ...prev, [tName]: true }));
                  }
                } else {
                  if (loopFading[tName]) {
                    setLoopFading(prev => ({ ...prev, [tName]: false }));
                  }
                }
              }}
              onCanPlay={(e) => {
                e.currentTarget.play().catch(() => {});
              }}
              onCanPlayThrough={(e) => {
                setVideoLoaded(prev => ({ ...prev, [tName]: true }));
                e.currentTarget.play().catch(() => {});
              }}
              onPlaying={(e) => {
                setVideoLoaded(prev => ({ ...prev, [tName]: true }));
              }}
            />
          );
        })}


      </div>

      {/* Bottom Blur Overlay (z-index 1) */}
      <div className="fixed inset-0 z-[1] backdrop-blur-xl mask-linear-top pointer-events-none" />

      {/* HERO CONTENT (z-index 10) */}
      <div className="flex-1 flex flex-col justify-end px-6 md:px-12 xl:px-16 pb-8 md:pb-16 z-10 relative lore-hero-content w-full">
        <div className="min-h-[260px] sm:min-h-[300px] md:min-h-[340px] flex flex-col justify-end w-full lore-hero-inner">
          <AnimatePresence mode="wait" custom={direction}>
            {!currentChapter ? (
              <motion.div 
                key="loading" 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="text-white/50 text-xl font-light"
              >
                Sincronizando registros da cosmogonia...
              </motion.div>
            ) : (
              <motion.div 
                key={currentChapter.id}
                custom={direction}
                variants={containerVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex flex-col w-full"
              >
                {/* Left Side */}
                <div className="flex-1 flex flex-col max-w-6xl">
                  {/* Metadata row */}
                  <motion.div 
                    variants={childVariants}
                    className="flex flex-wrap items-center gap-4 sm:gap-6 mb-6 md:mb-8 text-xs sm:text-sm font-medium text-white/80 lore-meta"
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen size={16} className="text-white" fill="currentColor" />
                      <span>Capítulo {currentChapter.chapter_number || currentIndex + 1}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar size={16} />
                      <span>{currentChapter.timeline_date || 'Data Desconhecida'}</span>
                    </div>
                    {readChapters.includes(String(currentChapter.id || currentChapter.title)) && (
                      <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-xs">
                        <Check size={12} className="stroke-[3px]" />
                        <span>Lido</span>
                      </div>
                    )}
                  </motion.div>

                  {/* Title */}
                  <motion.h1 
                    variants={childVariants}
                    className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-normal mb-4 md:mb-6 leading-tight lore-title"
                    style={{ letterSpacing: '-0.04em' }}
                  >
                    {currentChapter.title}
                  </motion.h1>

                  {/* Description */}
                  <motion.p 
                    variants={childVariants}
                    className="text-base sm:text-lg md:text-xl text-gray-300 font-light mb-6 md:mb-12 max-w-2xl line-clamp-3 leading-relaxed lore-desc"
                  >
                    {currentChapter.content}
                  </motion.p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Persistent Bottom Row (remains stable and does not slide during transition) */}
        {currentChapter && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 md:gap-6 w-full pt-6 border-t border-white/10 pointer-events-auto lore-footer">
            {/* CTA Buttons */}
            <div className="flex items-center justify-center md:justify-start gap-3 sm:gap-4 shrink-0 w-full md:w-auto">
              <button 
                onClick={() => setReadingModalOpen(true)}
                className="w-full md:w-auto justify-center bg-white text-black rounded-full font-medium px-8 py-3 flex items-center gap-2 hover:bg-gray-200 transition-colors shadow-lg pointer-events-auto lore-btn"
              >
                <FileText size={18} fill="currentColor" />
                Explorar Capítulo
              </button>
            </div>

            {/* Brief explanation occupying space between button and arrows in a single line (Desktop only) */}
            <div className="hidden md:block flex-1 text-center text-xs sm:text-sm text-white/50 font-light px-4 truncate whitespace-nowrap overflow-hidden self-center lore-footer-text">
              Seu portal para a história de como o universo de KYVRA nasceu.
            </div>

            {/* Right Side (Arrows with centered mobile phrase) */}
            <div className="w-full md:w-auto flex items-center justify-between md:justify-end gap-3 md:gap-4 shrink-0 pointer-events-auto">
              <button 
                onClick={handlePrev}
                className="w-12 h-12 flex items-center justify-center rounded-full liquid-glass hover:bg-white/10 transition-colors shrink-0 lore-nav-btn"
                aria-label="Capítulo Anterior"
              >
                <ChevronLeft size={20} className="lore-chevron-icon" />
              </button>

              {/* Centered mobile phrase right between arrows */}
              <div className="md:hidden flex-1 text-center text-[10px] sm:text-xs text-white/50 font-light px-2 leading-tight lore-footer-text-mobile">
                Seu portal para a história de como o universo de KYVRA nasceu.
              </div>

              <button 
                onClick={handleNext}
                className="w-12 h-12 flex items-center justify-center rounded-full liquid-glass hover:bg-white/10 transition-colors shrink-0 lore-nav-btn"
                aria-label="Próximo Capítulo"
              >
                <ChevronRight size={20} className="lore-chevron-icon" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reading Modal (z-index 100) */}
      <AnimatePresence>
        {readingModalOpen && currentChapter && (
          <motion.div 
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] bg-black/98 backdrop-blur-3xl overflow-hidden"
          >
            {/* Fixed Close Button - Positioned absolutely inside the overflow-hidden parent wrapper */}
            <div className="absolute top-6 right-6 z-[110] pointer-events-auto">
              <button 
                onClick={() => setReadingModalOpen(false)}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-all duration-300 text-white shadow-lg backdrop-blur-md cursor-pointer"
              >
                <X size={24} />
              </button>
            </div>
            
            {/* Dedicated scroll container that allows content to scroll freely without affecting the close button */}
            <div className="w-full h-full overflow-y-auto scrollbar-thin">
              <div className="max-w-4xl mx-auto px-6 py-20 md:py-32">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  {/* Header with Title */}
                  <div className="flex flex-col gap-6 mb-16 border-b border-white/10 pb-8">
                    <div className="flex flex-col">
                      <span className="text-primary font-sc text-sm tracking-[0.3em] uppercase block mb-2">
                        Capítulo {currentChapter.chapter_number || currentIndex + 1}
                      </span>
                      <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-medium text-white leading-tight">
                        {currentChapter.title}
                      </h2>
                    </div>
                  </div>
                  
                  {currentChapter.image_url ? (
                    <img 
                      src={currentChapter.image_url || undefined} 
                      alt={currentChapter.title} 
                      loading="lazy"
                      decoding="async"
                      className="w-full h-auto max-h-[50vh] object-cover rounded-xl mb-16 opacity-80"
                      referrerPolicy="no-referrer"
                    />
                  ) : null}

                  <div className="space-y-8 text-lg md:text-xl text-gray-300 font-light leading-relaxed mb-20">
                    {currentChapter.content?.split('\n\n').map((para: string, idx: number) => (
                      <p key={idx}>{para}</p>
                    ))}
                  </div>

                  {/* Mark as Read Toggle Option at the bottom */}
                  <div className="flex flex-col items-center justify-center pt-12 border-t border-white/10 gap-4">
                    <p className="text-sm text-white/40 font-light">
                      Concluiu a leitura deste capítulo?
                    </p>
                    <button
                      onClick={() => toggleChapterRead(String(currentChapter.id || currentChapter.title))}
                      className={cn(
                        "flex items-center gap-2 px-8 py-4 rounded-full border text-base font-medium transition-all duration-300 pointer-events-auto cursor-pointer shadow-lg",
                        readChapters.includes(String(currentChapter.id || currentChapter.title))
                          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:bg-emerald-500/20"
                          : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20 hover:text-white"
                      )}
                    >
                      <Check size={18} className={cn("transition-transform duration-300 stroke-[2.5px]", readChapters.includes(String(currentChapter.id || currentChapter.title)) ? "scale-110 text-emerald-400" : "scale-90 text-white/40")} />
                      <span>{readChapters.includes(String(currentChapter.id || currentChapter.title)) ? 'Lido ✓' : 'Marcar como Lido'}</span>
                    </button>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

