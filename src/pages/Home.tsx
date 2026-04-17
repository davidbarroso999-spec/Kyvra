import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import { Play } from 'lucide-react';
import { FeaturedSlider } from '@/components/ui/FeaturedSlider';

export function Home() {
  const [featuredTracks, setFeaturedTracks] = useState<any[]>([]);
  const { setCurrentTrack, setIsPlaying, setQueue } = useStore();

  useEffect(() => {
    async function fetchFeatured() {
      // 1. Get featured track IDs (try JSON first, then fallback)
      const { data: settings } = await supabase
        .from('lore_chapters')
        .select('content')
        .eq('title', '__FEATURED_TRACKS_JSON__')
        .single();
      
      let trackIds: string[] = [];
      if (settings && settings.content) {
        try {
          trackIds = JSON.parse(settings.content);
        } catch (e) {
          console.error("Error parsing featured tracks JSON:", e);
        }
      }

      if (trackIds.length === 0) {
        const { data: oldSettings } = await supabase
          .from('lore_chapters')
          .select('content')
          .eq('title', '__FEATURED_TRACK__')
          .single();
        if (oldSettings && oldSettings.content) {
          trackIds = [oldSettings.content];
        }
      }
      
      if (trackIds.length > 0) {
        // 2. Fetch all featured tracks details
        const { data: tracks, error: tracksError } = await supabase
          .from('tracks')
          .select(`
            *,
            albums (
              title,
              cover_url
            )
          `)
          .in('id', trackIds);
          
        if (tracksError) {
          console.error("Error fetching featured tracks details:", tracksError);
          return;
        }
          
        if (tracks && tracks.length > 0) {
          // Sort tracks to match the order in trackIds
          const sortedTracks = trackIds.map(id => tracks.find(t => t.id.toString() === id.toString())).filter(Boolean);

          // 3. Fetch synopses for these tracks
          const synopsisTitles = trackIds.map(id => `__SYNOPSIS_${id}__`);
          // Also check for the old synopsis title for the first track
          synopsisTitles.push('__FEATURED_TRACK_SYNOPSIS__');

          const { data: synopses } = await supabase
            .from('lore_chapters')
            .select('title, content')
            .in('title', synopsisTitles);

          const tracksWithSynopses = sortedTracks.map(track => {
            const specificSynopsis = synopses?.find(s => s.title === `__SYNOPSIS_${track.id}__`);
            const fallbackSynopsis = synopses?.find(s => s.title === '__FEATURED_TRACK_SYNOPSIS__');
            
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
        <div className="relative z-10 flex flex-col items-center text-center max-w-4xl mx-auto mt-16">
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="text-6xl sm:text-7xl md:text-[120px] leading-[0.95] tracking-[-0.02em] text-gradient mb-6"
          >
            KYVRA
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="font-sc text-sm sm:text-base md:text-xl tracking-[0.2em] text-text-high mb-8 px-4"
          >
            FRAGMENTOS DE UM UNIVERSO SOMBRIO
          </motion.p>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="font-sans font-light text-text-mid text-sm sm:text-base md:text-lg max-w-[280px] sm:max-w-[320px] leading-[1.75] mb-12 px-4"
          >
            Uma jornada sonora através de camadas esquecidas do tempo e do espaço.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 w-full px-6"
          >
            <Link to="/arquivo" className="w-full sm:w-auto px-8 py-4 bg-primary text-void font-sans font-medium r-sm shadow-[0_0_40px_var(--glow-purple)] btn-primary-hover text-center">
              Explorar o Arquivo
            </Link>

            <Link to="/cosmogonia" className="flex items-center gap-2 text-text-mid hover:text-primary transition-colors font-sans font-medium group mt-4 sm:mt-0">
              A Cosmogonia 
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </motion.div>
        </div>
        
        {/* Scroll Indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3"
        >
          <div className="w-[1px] h-10 bg-gradient-to-b from-primary/50 to-transparent" />
        </motion.div>
      </section>

      {/* Seção de Destaques com Slider */}
      {featuredTracks.length > 0 && (
        <section className="py-20 relative">
          {/* fundo sutil */}
          <div className="absolute inset-0 bg-deep" />
          <div className="relative z-10">
            <FeaturedSlider tracks={featuredTracks} />
          </div>
        </section>
      )}

      {/* Citação Poética — Editorial */}
      <section className="py-24 md:py-32 px-6 relative overflow-hidden">
        {/* Número decorativo de fundo */}
        <div 
          className="absolute left-4 md:left-12 top-1/2 -translate-y-1/2 font-display font-light leading-none select-none pointer-events-none"
          style={{ 
            fontSize: 'clamp(120px, 25vw, 280px)', 
            color: 'var(--primary)', 
            opacity: 0.04,
            letterSpacing: '-0.05em'
          }}
          aria-hidden="true"
        >
          I
        </div>
        
        {/* Gradiente radial de fundo sutil */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,var(--glow-purple)_0%,transparent_60%)] opacity-20 pointer-events-none" />
        
        <div className="max-w-4xl mx-auto relative z-10">
          {/* Label acima */}
          <span className="font-sc text-[10px] tracking-[0.3em] text-primary/60 block mb-8">
            FRAGMENTO I
          </span>
          
          {/* Citação alinhada à esquerda */}
          <blockquote>
            <p className="font-display font-light italic text-3xl sm:text-4xl md:text-5xl text-text-high leading-[1.2] max-w-3xl">
              — Em cada fragmento, uma história. Em cada nota, um suspiro da alma perdida nas névoas do tempo.
            </p>
          </blockquote>
        </div>
      </section>
    </div>
  );
}
