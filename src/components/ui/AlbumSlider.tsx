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

  const sidePad = `calc(50vw - ${CARD_W / 2}px)`;

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
              {/* capa — aspecto 1:1.3 (retrato) */}
              <div
                className="relative overflow-hidden"
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

                {/* overlay hover */}
                <div className="absolute inset-0 bg-void/0 group-hover:bg-void/30 transition-colors duration-400" />

                {/* play reveal */}
                <div className="play-reveal">
                  <div>
                    {album.year && (
                      <span className="font-sc text-[9px] tracking-[0.2em] text-text-mid block">
                        {album.year}
                      </span>
                    )}
                    {album.tracks !== undefined && (
                      <span className="font-sans text-[10px] text-text-high">
                        {album.tracks} {album.tracks === 1 ? 'faixa' : 'faixas'}
                      </span>
                    )}
                  </div>
                  <span className="play-reveal-icon">
                    <Play size={12} className="ml-0.5" />
                  </span>
                </div>

                {/* badge de faixas */}
                {album.tracks !== undefined && (
                  <div
                    className="absolute top-2 right-2 glass px-2 py-0.5 rounded-full"
                  >
                    <span className="font-mono text-[10px] text-text-high">
                      {album.tracks} faixas
                    </span>
                  </div>
                )}
              </div>

              {/* info */}
              <div className="mt-2.5 px-0.5">
                <h3 className="font-display text-text-high text-base leading-tight truncate group-hover:text-primary transition-colors">
                  {album.title}
                </h3>
                {album.year && (
                  <p className="font-mono text-text-low text-[10px] mt-0.5">{album.year}</p>
                )}
              </div>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
