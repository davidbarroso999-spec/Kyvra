import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { getFeaturedTracksSettings, getTracksByIds, getTrackSynopses } from '@/lib/apiCache';
import { useStore } from '@/store/useStore';
import { Play } from 'lucide-react';
import { FeaturedSlider } from '@/components/ui/FeaturedSlider';

export function Home() {
  const [featuredTracks, setFeaturedTracks] = useState<any[]>([]);
  const { setCurrentTrack, setIsPlaying, setQueue } = useStore();

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    async function fetchFeatured() {
      const { data: trackIds } = await getFeaturedTracksSettings();
      
      if (trackIds && trackIds.length > 0) {
        // 2. Fetch all featured tracks details
        const { data: tracks, error: tracksError } = await getTracksByIds(trackIds);
          
        if (tracksError) {
          console.error("Error fetching featured tracks details:", tracksError);
          return;
        }
          
        if (tracks && tracks.length > 0) {
          // Sort tracks to match the order in trackIds
          const sortedTracks = trackIds.map((id: string) => tracks.find((t: any) => t.id.toString() === id.toString())).filter(Boolean);

          // 3. Fetch synopses for these tracks
          const { data: synopses } = await getTrackSynopses(trackIds);

          const tracksWithSynopses = sortedTracks.map((track: any) => {
            const specificSynopsis = synopses?.find((s: any) => s.title === `__SYNOPSIS_${track.id}__`);
            const fallbackSynopsis = synopses?.find((s: any) => s.title === '__FEATURED_TRACK_SYNOPSIS__');
            
            return {
              id: track.id,
              title: track.title,
              artist: track.artist || 'Kyvra',
              vibe: track.vibe || 'Introspectivo',
              duration: track.duration || '0:00',
              coverUrl: track.albums?.cover_url || '',
              audioUrl: track.audio_url,
              albumTitle: track.albums?.title || '',
              lyrics: track.lyrics,
              synopsis: specificSynopsis?.content || fallbackSynopsis?.content || ''
            };
          });

          setFeaturedTracks(tracksWithSynopses);
        }
      }
    }
    fetchFeatured();
  }, []);

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative h-[100dvh] flex items-center justify-center px-6 overflow-hidden">
        <div className="absolute inset-0 bg-void -z-10 overflow-hidden">
          {/* Efeitos de fumaça / glow puramente estáticos em CSS para performance máxima (zero JS, zero recálculo) */}
          <div 
            className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-[radial-gradient(circle,var(--glow-purple)_0%,transparent_60%)] opacity-20 blur-[100px] pointer-events-none"
          />
          <div 
            className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-[radial-gradient(circle,var(--glow-purple)_0%,transparent_60%)] opacity-10 blur-[120px] pointer-events-none"
          />
          
          {/* Overlay final para garantir leitura e transição pro resto da página */}
          <div className="absolute inset-0 bg-gradient-to-b from-void/10 via-void/40 to-void pointer-events-none" />
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center text-center w-full h-full pointer-events-none mt-0">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex flex-col items-center pointer-events-auto select-none rounded-[2rem] px-10 py-12 md:px-24 md:py-20 mx-4"
            style={{ 
              background: "linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
              backdropFilter: "blur(30px)",
              WebkitBackdropFilter: "blur(30px)",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.05), 0 40px 100px -20px rgba(0,0,0,0.8)",
            }}
          >
            <h1 className="font-display font-medium text-[24vw] sm:text-[22vw] md:text-[20vw] lg:text-[180px] xl:text-[220px] leading-[0.85] tracking-[-0.04em] text-gradient m-0 p-0 text-center drop-shadow-2xl">
              KYVRA
            </h1>
            <div className="w-full flex justify-between text-primary/90 font-sans text-[2vw] sm:text-[1.8vw] md:text-[1.4vw] lg:text-[14px] xl:text-[16px] tracking-[0.1em] uppercase mt-6 md:mt-8 font-medium drop-shadow-md">
              {"FRAGMENTOS DE UM UNIVERSO SOMBRIO".split('').map((char, index) => (
                <span key={index}>{char === ' ' ? '\u00A0' : char}</span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Seção de Destaques com Slider */}
      {featuredTracks.length > 0 && (
        <section id="musicas" className="py-20 relative scroll-mt-20">
          {/* fundo sutil */}
          <div className="absolute inset-0 bg-deep" />
          <div className="relative z-10">
            <FeaturedSlider tracks={featuredTracks} />
          </div>
        </section>
      )}


    </div>
  );
}
