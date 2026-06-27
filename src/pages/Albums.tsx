import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { 
  Menu, 
  X, 
  ArrowLeft
} from 'lucide-react';
import { getAlbums } from '@/lib/apiCache';
import { AlbumSlider } from '@/components/ui/AlbumSlider';
import { AlbumsVideoBg } from '@/components/ui/AlbumsVideoBg';
import { useStore } from '@/store/useStore';

const ALBUM_ORDER = [
  "sob a última luz",
  "ecos de cinzas",
  "fragmentos do abismo",
  "além dos véus do vazio",
  "tronos de ruína",
  "o eclipse dos amantes"
].map(a => a.toLowerCase());

export function Albums() {
  const [albums, setAlbums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estado de controle de visualização dos álbuns
  const [viewingAlbums, setViewingAlbums] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
          coverUrl: a.cover_url,
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
    <div className="relative h-screen w-full overflow-hidden font-helvetica select-none bg-void text-white">
      {/* 1. Background: Crossfading Theme Videos */}
      <AlbumsVideoBg />

      {/* 2. Hero Content (centered, z-10) */}
      <main className="absolute inset-0 z-10 flex flex-col justify-center px-6 sm:px-12 md:px-20 pt-20">
        <AnimatePresence mode="wait">
          {!viewingAlbums ? (
            // DESIGN PADRÃO DE CAPA DO HERO TOTALMENTE AMBIENTADO EM KYVRA
            <motion.div 
              key="hero-text"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-4xl"
            >
              {/* Headline */}
              <h1 className="animate-fade-up delay-2 text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-medium tracking-tight text-white leading-[1.05] font-display uppercase">
                elegias gravadas na<br />
                eternidade do vazio.
              </h1>

              {/* Subtext */}
              <p className="animate-fade-up delay-3 mt-5 sm:mt-6 max-w-md text-sm sm:text-base md:text-lg leading-relaxed text-white/70 font-light">
                Metal sinfônico melancólico e profundo. Coros ancestrais, lamentos e arranjos imortalizados em relíquias físicas para guiar a sua alma pelo abismo.
              </p>

              {/* Single button */}
              <div className="animate-fade-up delay-4 mt-8 flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => setViewingAlbums(true)}
                  className="rounded-xl bg-white px-8 py-3 text-sm font-semibold text-gray-900 hover:scale-105 active:scale-95 transition-transform duration-200 cursor-pointer text-center"
                >
                  Explorar Relíquias
                </button>
              </div>
            </motion.div>
          ) : (
            // VISUALIZAÇÃO DO CARROSSEL DE ÁLBUNS DO KYVRA INTEGRADO
            <motion.div 
              key="carousel"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="w-full flex flex-col items-center justify-center max-w-7xl mx-auto"
            >
              {/* Cabeçalho do carrossel */}
              <div className="w-full max-w-5xl flex items-center justify-between mb-2 md:mb-6 px-4">
                <button 
                  onClick={() => setViewingAlbums(false)}
                  className="flex items-center gap-2 text-xs uppercase tracking-widest font-mono text-white/60 hover:text-white hover:translate-x-[-4px] transition-all cursor-pointer"
                >
                  <ArrowLeft size={14} /> Retornar à Capa
                </button>
                <span className="text-[10px] font-mono tracking-widest text-primary uppercase">
                  Relíquias do Vazio ({albums.length})
                </span>
              </div>

              {/* Box com vidro líquido para emoldurar o carrossel existente */}
              <div className="w-full rounded-3xl liquid-glass border border-white/10 p-4 md:p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-radial-gradient from-white/5 to-transparent pointer-events-none" />
                
                {loading ? (
                  <div className="h-[320px] md:h-[400px] flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="font-mono text-xs text-white/40 tracking-widest uppercase">Decifrando Relíquias...</span>
                    </div>
                  </div>
                ) : (
                  <div className="-mx-4 md:-mx-8">
                    <AlbumSlider albums={albums} />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
