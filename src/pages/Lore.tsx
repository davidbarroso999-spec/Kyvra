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

export function Lore() {
  const theme = useStore((state) => state.theme);
  const [chapters, setChapters] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [readingModalOpen, setReadingModalOpen] = useState(false);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const [activeVideoTheme, setActiveVideoTheme] = useState(theme);
  const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [readChapters, setReadChapters] = useState<string[]>([]);

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
      setCurrentIndex((prev) => (prev + 1) % chapters.length);
    }
  };

  const handlePrev = () => {
    if (chapters.length > 0) {
      setCurrentIndex((prev) => (prev - 1 + chapters.length) % chapters.length);
    }
  };

  const handleCanPlayThrough = (tName: string) => {
    if (tName === theme && activeVideoTheme !== theme) {
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
        fallbackTimeoutRef.current = null;
      }
      setActiveVideoTheme(tName);
    }
  };

  useEffect(() => {
    const activeVideo = videoRefs.current[theme];

    const playVideo = (videoEl: HTMLVideoElement | null) => {
      if (!videoEl) return;
      videoEl.muted = true;
      if (videoEl.paused) {
        videoEl.play().catch((err) => {
          console.log("Auto-play prevented, waiting for user interaction", err);
          const startOnInteraction = () => {
            const actV = videoRefs.current[theme];
            if (actV && actV.paused) actV.play().catch(() => {});
            document.removeEventListener('click', startOnInteraction);
            document.removeEventListener('touchstart', startOnInteraction);
          };
          document.addEventListener('click', startOnInteraction, { passive: true });
          document.addEventListener('touchstart', startOnInteraction, { passive: true });
        });
      }
    };

    if (theme !== activeVideoTheme) {
      const activeSrc = LORE_THEME_VIDEOS[theme] || LORE_THEME_VIDEOS['abissal'];
      
      if (activeVideo) {
        activeVideo.preload = "auto";
        if (!activeVideo.src || !activeVideo.src.includes(activeSrc)) {
          activeVideo.load();
        }
        playVideo(activeVideo);
      }

      const isAlreadyReady = activeVideo && activeVideo.readyState >= 3;

      if (isAlreadyReady) {
        setActiveVideoTheme(theme);
      } else {
        if (fallbackTimeoutRef.current) {
          clearTimeout(fallbackTimeoutRef.current);
        }
        fallbackTimeoutRef.current = setTimeout(() => {
          setActiveVideoTheme(theme);
        }, 1200);
      }
    } else {
      playVideo(activeVideo);
    }

    const pauseTimer = setTimeout(() => {
      Object.entries(LORE_THEME_VIDEOS).forEach(([tName]) => {
        if (tName !== theme) {
          const vid = videoRefs.current[tName];
          if (vid && !vid.paused) vid.pause();
        }
      });
    }, 1200);

    return () => {
      clearTimeout(pauseTimer);
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
      }
    };
  }, [theme, activeVideoTheme]);

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
        {Object.entries(LORE_THEME_VIDEOS)
          .filter(([tName]) => tName === theme || tName === activeVideoTheme)
          .map(([tName]) => (
            <video
              key={`lore-video-${tName}`}
              ref={el => { videoRefs.current[tName] = el; }}
              src={LORE_THEME_VIDEOS[tName]}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              onCanPlayThrough={() => handleCanPlayThrough(tName)}
              className={cn(
                "absolute inset-0 w-[115%] sm:w-full h-full object-cover transition-opacity duration-1000 ease-in-out bg-black -translate-x-[7%] sm:translate-x-0 origin-center",
                activeVideoTheme === tName ? "opacity-90 z-10" : "opacity-0 z-0 pointer-events-none"
              )}
              style={{
                willChange: "opacity",
                transform: "translateZ(0)",
                backfaceVisibility: "hidden"
              }}
            />
          ))}
      </div>

      {/* Bottom Blur Overlay (z-index 1) */}
      <div className="fixed inset-0 z-[1] backdrop-blur-xl mask-linear-top pointer-events-none" />

      {/* NAVBAR (z-index 40) */}
      <nav className="relative z-40 flex items-center justify-center px-4 sm:px-6 md:px-12 py-4 md:py-6 pointer-events-none">
        {/* Logo */}
        <Link 
          to="/" 
          className="text-2xl font-display font-semibold tracking-wider text-white animate-blur-fade-up pointer-events-auto" 
          style={{ animationDelay: '0ms' }}
        >
          COSMOGONIA
        </Link>
      </nav>

      {/* HERO CONTENT (z-index 10) */}
      <div className="flex-1 flex flex-col justify-end px-4 sm:px-6 md:px-12 pb-8 md:pb-16 z-10 relative">
        <AnimatePresence mode="wait">
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
              initial={{ opacity: 0, filter: 'blur(10px)', y: 20 }}
              animate={{ opacity: 1, filter: 'blur(0)', y: 0 }}
              exit={{ opacity: 0, filter: 'blur(10px)', y: -20 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="flex flex-col w-full"
            >
              {/* Left Side */}
              <div className="flex-1 flex flex-col max-w-6xl">
                {/* Metadata row */}
                <div 
                  className="flex flex-wrap items-center gap-4 sm:gap-6 mb-6 md:mb-8 text-xs sm:text-sm font-medium animate-blur-fade-up text-white/80"
                  style={{ animationDelay: '300ms' }}
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
                </div>

                {/* Title */}
                <h1 
                  className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-normal mb-4 md:mb-6 animate-blur-fade-up leading-tight"
                  style={{ letterSpacing: '-0.04em', animationDelay: '400ms' }}
                >
                  {currentChapter.title}
                </h1>

                {/* Description */}
                <p 
                  className="text-base sm:text-lg md:text-xl text-gray-300 font-light mb-6 md:mb-12 max-w-2xl animate-blur-fade-up line-clamp-3 leading-relaxed"
                  style={{ animationDelay: '500ms' }}
                >
                  {currentChapter.content}
                </p>
              </div>

              {/* Bottom Row Wrapper: explorador | explicação em uma linha | setas */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 w-full pt-6 border-t border-white/10 pointer-events-auto">
                {/* CTA Buttons */}
                <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                  <button 
                    onClick={() => setReadingModalOpen(true)}
                    className="bg-white text-black rounded-full font-medium px-6 sm:px-8 py-2.5 sm:py-3 flex items-center gap-2 hover:bg-gray-200 transition-colors animate-blur-fade-up shadow-lg pointer-events-auto"
                    style={{ animationDelay: '600ms' }}
                  >
                    <FileText size={18} fill="currentColor" />
                    Explorar Capítulo
                  </button>
                </div>

                {/* Brief explanation occupying space between button and arrows in a single line */}
                <div 
                  className="flex-1 text-center text-xs sm:text-sm text-white/50 font-light px-4 animate-blur-fade-up truncate whitespace-nowrap overflow-hidden self-center py-2 md:py-0"
                  style={{ animationDelay: '700ms' }}
                >
                  A história de como o universo de KYVRA nasceu.
                </div>

                {/* Right Side (Arrows) */}
                <div className="flex items-center gap-3 justify-between md:justify-end shrink-0 pointer-events-auto">
                  <button 
                    onClick={handlePrev}
                    className="w-12 h-12 sm:w-auto sm:px-6 sm:py-3 flex items-center justify-center rounded-full liquid-glass hover:bg-white/10 transition-colors animate-blur-fade-up"
                    style={{ animationDelay: '800ms' }}
                    aria-label="Capítulo Anterior"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button 
                    onClick={handleNext}
                    className="w-12 h-12 sm:w-auto sm:px-6 sm:py-3 flex items-center justify-center rounded-full liquid-glass hover:bg-white/10 transition-colors animate-blur-fade-up"
                    style={{ animationDelay: '900ms' }}
                    aria-label="Próximo Capítulo"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Reading Modal (z-index 100) */}
      <AnimatePresence>
        {readingModalOpen && currentChapter && (
          <motion.div 
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] bg-black/98 backdrop-blur-3xl overflow-y-auto"
          >
            {/* Fixed Close Button */}
            <div className="fixed top-6 right-6 z-[110] pointer-events-auto">
              <button 
                onClick={() => setReadingModalOpen(false)}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-all duration-300 text-white shadow-lg backdrop-blur-md cursor-pointer"
              >
                <X size={24} />
              </button>
            </div>
            
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
                
                {currentChapter.image_url && (
                  <img 
                    src={currentChapter.image_url} 
                    alt={currentChapter.title} 
                    className="w-full h-auto max-h-[50vh] object-cover rounded-xl mb-16 opacity-80"
                  />
                )}

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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

