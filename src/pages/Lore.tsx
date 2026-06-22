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
  FileText
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
              className="flex flex-col md:flex-row items-end gap-8"
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
                </div>

                {/* Title */}
                <h1 
                  className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-normal mb-4 md:mb-6 animate-blur-fade-up leading-tight"
                  style={{ letterSpacing: '-0.04em', animationDelay: '400ms' }}
                >
                  {currentChapter.title}
                </h1>

                {/* Lore Illustration Banner */}
                {currentChapter.image_url && (
                  <div 
                    className="w-full h-8 sm:h-12 md:h-16 shrink-0 rounded-xl overflow-hidden liquid-glass animate-blur-fade-up shadow-[0_20px_40px_rgba(0,0,0,0.5)] mb-6 md:mb-8"
                    style={{ animationDelay: '450ms' }}
                  >
                    <img 
                      src={currentChapter.image_url} 
                      alt={currentChapter.title} 
                      className="w-full h-full object-cover opacity-90 object-[50%_40%]"
                      loading="lazy"
                    />
                  </div>
                )}

                {/* Description */}
                <p 
                  className="text-base sm:text-lg md:text-xl text-gray-300 font-light mb-6 md:mb-12 max-w-2xl animate-blur-fade-up line-clamp-3 leading-relaxed"
                  style={{ animationDelay: '500ms' }}
                >
                  {currentChapter.content}
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                  <button 
                    onClick={() => setReadingModalOpen(true)}
                    className="bg-white text-black rounded-full font-medium px-6 sm:px-8 py-2.5 sm:py-3 flex items-center gap-2 hover:bg-gray-200 transition-colors animate-blur-fade-up shadow-lg"
                    style={{ animationDelay: '600ms' }}
                  >
                    <FileText size={18} fill="currentColor" />
                    Explorar Capítulo
                  </button>
                </div>
              </div>

              {/* Right Side (Arrows) */}
              <div className="flex items-center gap-3 justify-start md:justify-end w-full md:w-auto">
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
            <div className="absolute top-6 right-6 z-10">
              <button 
                onClick={() => setReadingModalOpen(false)}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
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
                <span className="text-primary font-sc text-sm tracking-[0.3em] uppercase block mb-4">
                  Capítulo {currentChapter.chapter_number || currentIndex + 1}
                </span>
                <h2 className="text-4xl md:text-6xl font-display font-medium text-white mb-16 leading-tight">
                  {currentChapter.title}
                </h2>
                
                {currentChapter.image_url && (
                  <img 
                    src={currentChapter.image_url} 
                    alt={currentChapter.title} 
                    className="w-full h-auto max-h-[50vh] object-cover rounded-xl mb-16 opacity-80"
                  />
                )}

                <div className="space-y-8 text-lg md:text-xl text-gray-300 font-light leading-relaxed">
                  {currentChapter.content?.split('\n\n').map((para: string, idx: number) => (
                    <p key={idx}>{para}</p>
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

