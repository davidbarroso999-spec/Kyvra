import { useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { useHorizontalSlider } from '@/hooks/useHorizontalSlider';
import { useStore } from '@/store/useStore';

interface Album {
  id: string | number;
  title: string;
  year?: number | string;
  coverUrl: string;
  tracks?: number;
  description?: string;
}

interface AlbumSliderProps {
  albums: Album[];
}

const CARD_W   = 200;
const CARD_GAP = 24;

export function AlbumSlider({ albums }: AlbumSliderProps) {
  const wrapperRef  = useRef<HTMLDivElement>(null);
  const slideRefs   = useRef<HTMLDivElement[]>([]);

  const { scrollBy } = useHorizontalSlider(wrapperRef, slideRefs, {
    ease: 0.075,
    scaleMax: 1.15,
    scaleMin: 0.85,
    offsetMultiplier: 60,
  });

  const setSlideRef = useCallback((el: HTMLDivElement | null, idx: number) => {
    if (el) slideRefs.current[idx] = el;
  }, []);

  const sidePad = `calc(50% - ${CARD_W / 2}px)`;

  if (!albums.length) return null;

  return (
    <section className="relative w-full overflow-hidden" style={{ height: 350 }}>
      {/* botões de navegação */}
      <button
        onClick={() => scrollBy(-(CARD_W + CARD_GAP))}
        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 flex items-center justify-center glass rounded-full text-text-mid hover:text-primary transition-colors hidden md:flex"
        aria-label="Álbum anterior"
      >
        <ChevronLeft size={16} />
      </button>
      <button
        onClick={() => scrollBy(CARD_W + CARD_GAP)}
        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 flex items-center justify-center glass rounded-full text-text-mid hover:text-primary transition-colors hidden md:flex"
        aria-label="Próximo álbum"
      >
        <ChevronRight size={16} />
      </button>

      {/* wrapper */}
      <div
        ref={wrapperRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: CARD_GAP,
          paddingLeft: sidePad,
          paddingRight: sidePad,
          willChange: 'transform',
        }}
      >
        {albums.map((album, idx) => (
          <div
            key={album.id}
            ref={(el) => setSlideRef(el, idx)}
            style={{
              width: CARD_W,
              flexShrink: 0,
              transformOrigin: 'center center',
              willChange: 'transform',
            }}
          >
            <Link
              to={`/reliquias/${album.id}`}
              className="group block select-none"
              draggable={false}
            >
              {/* capa — aspecto 1:1 */}
              <div
                className="relative overflow-hidden transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(167,139,250,0.15)]"
                style={{ borderRadius: 'var(--radius-md)', aspectRatio: '1 / 1' }}
              >
                <img
                  src={album.coverUrl || undefined}
                  alt={album.title}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                  draggable={false}
                />

                {/* overlay hover sutil */}
                <div className="absolute inset-0 bg-void/0 group-hover:bg-void/25 transition-colors duration-400" />
              </div>

              {/* info */}
              <div className="mt-3 px-1 flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-text-high text-sm sm:text-base leading-tight truncate group-hover:text-primary transition-colors">
                    {album.title}
                  </h3>
                  {/* Ícone de Play minimalista e sutil do lado de fora */}
                  <span className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-void transition-all duration-300 flex-shrink-0 shadow-lg">
                    <Play size={9} fill="currentColor" className="ml-0.5" />
                  </span>
                </div>
                
                <div className="flex items-center gap-1.5 font-mono text-[10px] text-text-mid">
                  {album.year && (
                    <span>{album.year}</span>
                  )}
                  {album.year && album.tracks !== undefined && (
                    <span className="text-text-low font-sans">•</span>
                  )}
                  {album.tracks !== undefined && (
                    <span>
                      {album.tracks} {album.tracks === 1 ? 'faixa' : 'faixas'}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
