import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play } from 'lucide-react';
import { useStore } from '@/store/useStore';
import MorphSlider, { MorphSliderRef } from './MorphSlider';
import NeonButton from './NeonButton';

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

          {/* Action / Play Button */}
          <div className="w-full flex justify-center items-center">
            <NeonButton
              onClick={(e) => handlePlay(activeTrack, e)}
              variant="pill"
              className="font-sc tracking-[0.2em] text-[10px] uppercase w-full sm:w-auto h-12 px-8"
              aria-label={`Reproduzir ${activeTrack.title}`}
            >
              <Play size={16} className="fill-current text-white" />
              <span className="text-white">Reproduzir</span>
            </NeonButton>
          </div>
        </div>
      </div>
    </section>
  );
}
