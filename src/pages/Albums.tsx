import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Eye, 
  EyeOff 
} from 'lucide-react';
import { getAlbums } from '@/lib/apiCache';
import { AlbumSlider } from '@/components/ui/AlbumSlider';
import { AlbumsSceneSequence } from '@/components/ui/AlbumsSceneSequence';
import { AlbumsFirstFrameHero } from '@/components/ui/AlbumsFirstFrameHero';
import { CinematicAtmosphere } from '@/components/ui/CinematicAtmosphere';
import { ScrollProgressBar } from '@/components/ui/ScrollProgressBar';
import { useScrollProgress } from '@/hooks/useScrollProgress';
import { cn, getOptimizedImageUrl } from '@/lib/utils';

const ALBUM_ORDER = [
  "sob a última luz",
  "ecos de cinzas",
  "fragmentos do abismo",
  "além dos véus do vazio",
  "tronos de ruína",
  "o eclipse dos amantes"
].map(a => a.toLowerCase());

export function Albums() {
  const containerRef = useRef<HTMLDivElement>(null);
  const progress = useScrollProgress(containerRef);

  // Aciona a aparição do menu ao atingir o final do scroll
  const [reachedFinalFrame, setReachedFinalFrame] = useState(false);

  const handleFrameChange = useCallback((currentFrame: number, maxFrame: number) => {
    if (currentFrame >= maxFrame - 1) {
      setReachedFinalFrame(true);
    } else if (currentFrame < maxFrame - 8) {
      setReachedFinalFrame(false);
    }
  }, []);

  const [albums, setAlbums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estado de controle de visualização dos álbuns
  const [viewingAlbums, setViewingAlbums] = useState(false);

  // Carregar os álbuns reais de Kyvra
  useEffect(() => {
    async function fetchAlbums() {
      const { data, error } = await getAlbums();

      if (error) {
        console.error("Error fetching albums:", error);
      }

      if (data) {
        const formattedAlbums = data.map((a: any) => ({
          id: a.id,
          title: a.title,
          year: a.release_year,
          coverUrl: getOptimizedImageUrl(a.cover_url, 600, 75),
          description: a.description,
          tracks: a.tracks?.[0]?.count || 0
        }));

        formattedAlbums.sort((a: any, b: any) => {
          const titleA = a.title?.toLowerCase().trim() || "";
          const titleB = b.title?.toLowerCase().trim() || "";
          const idxA = ALBUM_ORDER.findIndex(t => titleA.includes(t) || t.includes(titleA));
          const idxB = ALBUM_ORDER.findIndex(t => titleB.includes(t) || t.includes(titleB));
          const valA = idxA === -1 ? 999 : idxA;
          const valB = idxB === -1 ? 999 : idxB;
          return valA - valB;
        });

        setAlbums(formattedAlbums);
      }
      setLoading(false);
    }
    fetchAlbums();
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-screen overflow-hidden bg-void text-white font-helvetica select-none touch-none">
      <div className="absolute inset-0 w-full h-full">
        {/* 1. Background: Scroll-scrubbed Image Sequence */}
        <AlbumsSceneSequence progress={progress} onFrameChange={handleFrameChange} />

        {/* 2. Efeitos Cinemáticos Vivos: Tempestade, Relâmpagos e Vento */}
        <CinematicAtmosphere progress={progress} />

        {/* 3. Primeiro Frame Minimalista & Indutor de Scroll */}
        <AlbumsFirstFrameHero progress={progress} />

        {/* 3.5. Barra de Progresso Lateral (Incentivador) */}
        <ScrollProgressBar progress={progress} />

        {/* 4. Menu & Conteúdo de Álbuns (layout e posições originais preservados) */}
        <AnimatePresence>
          {reachedFinalFrame && (
            <motion.main 
              initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: 20, filter: 'blur(6px)' }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 z-20 flex flex-col lg:flex-row items-start lg:items-center justify-center lg:justify-between px-6 md:px-12 xl:px-16 pt-24 lg:pt-16 h-full w-full pointer-events-auto"
            >
              {/* LAYOUT PARA DESKTOP (visível de lg para cima) */}
              <div className="hidden lg:flex w-full h-full items-center justify-between gap-12">
                {/* Coluna Esquerda: Texto Principal */}
                <motion.div 
                  layout
                  className={cn(
                    "flex flex-col text-left items-start transition-all duration-500",
                    viewingAlbums 
                      ? "w-[38%]" 
                      : "w-full max-w-2xl"
                  )}
                >
                  <motion.h1 
                    layout
                    className={cn(
                      "font-medium tracking-tight text-white leading-[1.08] font-display uppercase transition-all duration-500 text-left",
                      viewingAlbums ? "text-4xl xl:text-5xl" : "text-6xl xl:text-7xl"
                    )}
                  >
                    elegias gravadas na<br />
                    eternidade.
                  </motion.h1>

                  <motion.p 
                    layout
                    className={cn(
                      "mt-4 leading-relaxed text-white/70 font-light transition-all duration-500 text-left",
                      viewingAlbums ? "text-xs xl:text-sm max-w-xs" : "text-sm xl:text-base max-w-md"
                    )}
                  >
                    Metal sinfônico melancólico e profundo. Coros ancestrais, lamentos e arranjos imortalizados em relíquias físicas para guiar a sua alma pelo abismo.
                  </motion.p>

                  <motion.div layout className="mt-8">
                    <button 
                      onClick={() => setViewingAlbums(!viewingAlbums)}
                      className={cn(
                        "rounded-lg px-6 py-2.5 text-xs font-semibold hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer text-center shadow-xl flex items-center gap-2",
                        viewingAlbums 
                          ? "border border-white/20 bg-white/10 text-white hover:bg-white hover:text-gray-900" 
                          : "bg-white text-gray-900"
                      )}
                    >
                      {viewingAlbums ? (
                        <>
                          <EyeOff size={14} /> Ocultar Relíquias
                        </>
                      ) : (
                        <>
                          <Eye size={14} /> Explorar Relíquias
                        </>
                      )}
                    </button>
                  </motion.div>
                </motion.div>

                {/* Coluna Direita: Painel Lateral em Glassmorphic */}
                <div className={cn("h-full flex items-center justify-end transition-all duration-500", viewingAlbums ? "w-[58%]" : "w-0 overflow-hidden")}>
                  <AnimatePresence>
                    {viewingAlbums && (
                      <motion.div
                        initial={{ opacity: 0, x: 60 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 60 }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        className="w-full flex flex-col"
                      >
                        {/* Cabeçalho do carrossel */}
                        <div className="w-full flex items-center justify-end mb-3 px-2">
                          <span className="text-[10px] font-mono tracking-widest text-primary uppercase">
                            Relíquias do Vazio ({albums.length})
                          </span>
                        </div>

                        {/* Box com vidro líquido para emoldurar o carrossel existente */}
                        <div className="w-full rounded-2xl liquid-glass border border-white/10 p-3 md:p-5 backdrop-blur-md shadow-2xl relative overflow-hidden">
                          <div className="absolute inset-0 bg-radial-gradient from-white/5 to-transparent pointer-events-none" />
                          
                          {loading ? (
                            <div className="h-[260px] md:h-[320px] flex items-center justify-center">
                              <div className="flex flex-col items-center gap-2">
                                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                <span className="font-mono text-[10px] text-white/40 tracking-widest uppercase">Decifrando Relíquias...</span>
                              </div>
                            </div>
                          ) : (
                            <div className="-mx-3 md:-mx-5">
                              <AlbumSlider albums={albums} />
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* LAYOUT PARA MOBILE (visível de lg para baixo) */}
              <div className="lg:hidden w-full flex flex-col h-full justify-center gap-6 pb-20">
                <div className="w-full flex flex-col text-left items-start">
                  {/* Headline */}
                  <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-white leading-[1.08] font-display uppercase">
                    elegias gravadas na<br />
                    eternidade.
                  </h1>

                  {/* Subtext */}
                  <p className="mt-3 max-w-sm text-xs sm:text-sm leading-relaxed text-white/70 font-light">
                    Metal sinfônico melancólico e profundo. Coros ancestrais, lamentos e arranjos imortalizados em relíquias físicas para guiar a sua alma pelo abismo.
                  </p>

                  {/* Persistent toggle button */}
                  <div className="mt-4 flex">
                    <button 
                      onClick={() => setViewingAlbums(!viewingAlbums)}
                      className={cn(
                        "rounded-lg px-5 py-2 text-xs font-semibold hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer text-center shadow-xl flex items-center gap-2",
                        viewingAlbums 
                          ? "border border-white/20 bg-white/10 text-white hover:bg-white hover:text-gray-900" 
                          : "bg-white text-gray-900"
                      )}
                    >
                      {viewingAlbums ? (
                        <>
                          <EyeOff size={14} /> Ocultar Relíquias
                        </>
                      ) : (
                        <>
                          <Eye size={14} /> Explorar Relíquias
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {viewingAlbums && (
                    <motion.div 
                      key="carousel-mobile"
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      className="w-full overflow-hidden"
                    >
                      {/* Cabeçalho do carrossel */}
                      <div className="w-full flex items-center justify-end mb-2 px-2">
                        <span className="text-[9px] font-mono tracking-widest text-primary uppercase">
                          Relíquias ({albums.length})
                        </span>
                      </div>

                      {/* Box com vidro líquido para emoldurar o carrossel existente */}
                      <div className="w-full rounded-2xl liquid-glass border border-white/10 p-3 backdrop-blur-md shadow-2xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-radial-gradient from-white/5 to-transparent pointer-events-none" />
                        
                        {loading ? (
                          <div className="h-[220px] flex items-center justify-center">
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                              <span className="font-mono text-[9px] text-white/40 tracking-widest uppercase">Decifrando Relíquias...</span>
                            </div>
                          </div>
                        ) : (
                          <div className="-mx-3">
                            <AlbumSlider albums={albums} />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.main>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
