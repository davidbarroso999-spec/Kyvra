import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '@/store/useStore';
import MorphSlider, { MorphSliderRef } from './MorphSlider';

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

export function FeaturedSlider({ tracks }: FeaturedSliderProps) {
  const setCurrentTrack = useStore((state) => state.setCurrentTrack);
  const setIsPlaying = useStore((state) => state.setIsPlaying);
  const setQueue = useStore((state) => state.setQueue);
  
  const sliderRef = useRef<MorphSliderRef>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handlePlay = (track: FeaturedTrack, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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

  const activeTrack = tracks[activeIndex] || tracks[0];

  const sliderItems = useMemo(() => tracks.map(t => ({ image: t.coverUrl || '' })), [tracks]);

  return (
    <section className="relative w-full py-20 lg:py-32 overflow-hidden">
      <div className="w-full max-w-7xl mx-auto px-6 flex flex-col items-center">
        {/* label da seção */}
        <div className="mb-12 w-full text-center">
          <span className="font-sc text-[11px] tracking-[0.3em] text-primary/80 block uppercase">
            Fragmentos em Destaque
          </span>
        </div>

        <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
          
          {/* Square Card Container */}
          <div className="relative aspect-square w-full rounded-2xl overflow-hidden shadow-2xl mb-8">
            <div className="absolute inset-0 z-0">
              <MorphSlider
                ref={sliderRef}
                items={sliderItems}
                onActiveIndexChange={setActiveIndex}
                showCaptions={false}
                showControls={false}
                showIndicators={false}
                transition="melt"
                duration={1.2}
                intensity={0.4}
                radius={16}
                autoplay={true}
                autoplayDelay={4.5}
              />
            </div>
          </div>

          {/* Text Content (Title & Vibe) */}
          <div className="flex flex-col items-center text-center w-full mb-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTrack.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center gap-4"
              >
                {activeTrack.vibe && (
                  <span className="inline-block px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 backdrop-blur-md font-mono text-[10px] tracking-[0.15em] text-primary uppercase">
                    {activeTrack.vibe}
                  </span>
                )}
                
                <h3 className="font-display text-4xl md:text-5xl lg:text-6xl text-white tracking-wide">
                  {activeTrack.title}
                </h3>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* External Controls */}
          <div className="w-full flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <button 
                type="button" 
                className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/5 hover:border-white/20 transition-all"
                onClick={() => sliderRef.current?.prev()}
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                type="button" 
                className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/5 hover:border-white/20 transition-all"
                onClick={() => sliderRef.current?.next()}
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <button
              onClick={(e) => handlePlay(activeTrack, e)}
              className="inline-flex items-center justify-center gap-3 px-8 h-12 rounded-full bg-primary text-void hover:bg-primary/90 hover:scale-105 transition-all duration-300 shadow-[0_0_30px_rgba(167,139,250,0.4)] hover:shadow-[0_0_40px_rgba(167,139,250,0.6)] font-sc tracking-[0.2em] text-[10px] uppercase w-full md:w-auto"
              aria-label={`Reproduzir ${activeTrack.title}`}
            >
              <Play size={16} fill="currentColor" />
              Reproduzir
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
