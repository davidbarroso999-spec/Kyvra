import React, { useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { useHorizontalSlider } from '@/hooks/useHorizontalSlider';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

interface FeaturedTrack {
  id: string | number;
  title: string;
  artist: string;
  albumTitle?: string;
  coverUrl: string;
  audioUrl?: string;
  vibe?: string;
  synopsis?: string;
  duration?: string;
  lyrics?: string;
}

interface FeaturedSliderProps {
  tracks: FeaturedTrack[];
}

const CARD_W = 320;
const CARD_GAP = 48;

export function FeaturedSlider({ tracks }: FeaturedSliderProps) {
  const setCurrentTrack = useStore((state) => state.setCurrentTrack);
  const setIsPlaying = useStore((state) => state.setIsPlaying);
  const setQueue = useStore((state) => state.setQueue);

  const wrapperRef  = useRef<HTMLDivElement>(null);
  const slideRefs   = useRef<HTMLDivElement[]>([]);

  const { scrollBy } = useHorizontalSlider(wrapperRef, slideRefs, {
    ease: 0.075,
    scaleMax: 1.4,
    scaleMin: 0.7,
    offsetMultiplier: 160,
  });

  const setSlideRef = useCallback((el: HTMLDivElement | null, idx: number) => {
    if (el) slideRefs.current[idx] = el;
  }, []);

  const handlePlay = (track: FeaturedTrack, e: React.MouseEvent) => {
    e.stopPropagation();
    const t = {
      id: String(track.id),
      title: track.title,
      artist: track.artist,
      albumTitle: track.albumTitle || '',
      coverUrl: track.coverUrl,
      audioUrl: track.audioUrl || '',
      vibe: track.vibe || '',
      duration: track.duration || '0:00',
      lyrics: track.lyrics || '',
    };
    setQueue([t]);
    setCurrentTrack(t);
    setIsPlaying(true);
  };

  if (!tracks.length) return null;

  const sidePad = `calc(50vw - ${CARD_W / 2}px)`;

  return (
    <section className="relative w-full overflow-hidden" style={{ height: 750 }}>
      {/* label da seção */}
      <div className="absolute top-12 left-12 z-20">
        <span className="font-sc text-[11px] tracking-[0.3em] text-primary/80 block uppercase">
          Fragmentos em Destaque
        </span>
      </div>

      {/* botões de navegação (desktop) */}
      <button
        onClick={() => scrollBy(-(CARD_W + CARD_GAP))}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center glass rounded-full text-text-mid hover:text-primary transition-colors hidden md:flex"
        aria-label="Anterior"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        onClick={() => scrollBy(CARD_W + CARD_GAP)}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center glass rounded-full text-text-mid hover:text-primary transition-colors hidden md:flex"
        aria-label="Próxima"
      >
        <ChevronRight size={20} />
      </button>

      {/* wrapper do slider */}
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
        {tracks.map((track, idx) => (
          <div
            key={track.id}
            ref={(el) => setSlideRef(el, idx)}
            style={{
              width: CARD_W,
              flexShrink: 0,
              transformOrigin: 'center center',
              willChange: 'transform',
            }}
          >
            {/* card do destaque */}
            <div
              className="group relative cursor-pointer select-none"
              style={{ width: CARD_W }}
            >
              {/* capa — aspect 3:4 */}
              <div
                className="relative overflow-hidden"
                style={{ borderRadius: 'var(--radius-md)', aspectRatio: '3/4' }}
              >
                <img
                  src={track.coverUrl}
                  alt={track.title}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                  draggable={false}
                />

                {/* overlay escuro no hover */}
                <div className="absolute inset-0 bg-void/0 group-hover:bg-void/40 transition-colors duration-400" />

                {/* play reveal — sobe de baixo no hover */}
                <button
                  onClick={(e) => handlePlay(track, e)}
                  className="play-reveal"
                  aria-label={`Tocar ${track.title}`}
                >
                  <span className="font-sc text-[10px] tracking-[0.2em] text-text-mid">REPRODUZIR</span>
                  <span className="play-reveal-icon">
                    <Play size={14} className="ml-0.5" />
                  </span>
                </button>

                {/* badge de vibe no canto superior esquerdo */}
                {track.vibe && (
                  <span
                    className="absolute top-3 left-3 px-2.5 py-1 rounded-full font-mono text-[9px] uppercase tracking-wider text-primary border border-primary/30"
                    style={{ background: 'rgba(5,5,8,0.75)', backdropFilter: 'blur(8px)' }}
                  >
                    {track.vibe.split(' | ')[0]}
                  </span>
                )}
              </div>

              {/* info abaixo da capa */}
              <div className="mt-3 px-1">
                <h3 className="font-display text-text-high text-xl leading-tight truncate">
                  {track.title}
                </h3>
                <p className="font-mono text-text-low text-xs mt-1 truncate">
                  {track.artist}
                  {track.albumTitle && (
                    <span className="text-text-low/60"> · {track.albumTitle}</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
