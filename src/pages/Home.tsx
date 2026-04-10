import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import { Play } from 'lucide-react';

export function Home() {
  const [featuredTracks, setFeaturedTracks] = useState<any[]>([]);
  const [activeFeaturedIndex, setActiveFeaturedIndex] = useState(0);
  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);
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

  const handlePlayTrack = (track: any) => {
    setQueue([track]);
    setCurrentTrack(track);
    setIsPlaying(true);
  };

  const currentFeatured = featuredTracks[activeFeaturedIndex];

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
            <Link to="/arquivo" className="w-full sm:w-auto px-8 py-4 bg-primary text-void font-sans font-medium rounded-[4px] shadow-[0_0_40px_var(--glow-purple)] hover:scale-105 transition-transform duration-300 text-center">
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
          className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4"
        >
          <div className="w-[1px] h-12 bg-gradient-to-b from-primary to-transparent animate-pulse" />
        </motion.div>
      </section>

      {/* Featured Track Card Section */}
      {featuredTracks.length > 0 && currentFeatured && (
        <section className="py-24 px-6 relative flex items-center justify-center overflow-hidden bg-deep">
          <div className="max-w-5xl mx-auto relative z-10 w-full">
            <AnimatePresence mode="wait">
              <motion.div 
                key={currentFeatured.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="glass p-8 md:p-12 rounded-2xl flex flex-col md:flex-row gap-8 md:gap-12 items-center relative"
              >
              <div className="w-full md:w-1/3 shrink-0 relative group">
                <img 
                  src={currentFeatured.coverUrl} 
                  alt={currentFeatured.title} 
                  className="w-full aspect-square object-cover rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                  referrerPolicy="no-referrer"
                />
                <button 
                  onClick={() => handlePlayTrack(currentFeatured)}
                  className="absolute inset-0 bg-void/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center rounded-xl"
                >
                  <div className="w-16 h-16 bg-primary text-void rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-[0_0_30px_var(--glow-purple)]">
                    <Play size={24} className="ml-1" />
                  </div>
                </button>
              </div>
              
              <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left">
                <span className="font-sc text-xs tracking-[0.3em] text-primary mb-4 block">DESTAQUE DO ARQUIVO</span>
                <h2 className="text-4xl md:text-5xl font-display text-text-high mb-2">{currentFeatured.title}</h2>
                <p className="text-text-mid font-mono text-sm mb-6">{currentFeatured.artist} • {currentFeatured.albumTitle}</p>
                
                {currentFeatured.synopsis && (
                  <div className="w-full relative mt-2 mb-6">
                    <div className={`prose prose-invert max-w-none transition-all duration-300 ${isSynopsisExpanded ? '' : 'line-clamp-3'}`}>
                      <p className="text-text-mid text-sm md:text-base leading-relaxed italic border-l-2 border-primary/30 pl-4 py-2 text-left">
                        {currentFeatured.synopsis}
                      </p>
                    </div>
                    {!isSynopsisExpanded && (
                      <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-glass to-transparent pointer-events-none" />
                    )}
                    <button 
                      onClick={() => setIsSynopsisExpanded(!isSynopsisExpanded)}
                      className="mt-2 flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                    >
                      {isSynopsisExpanded ? 'Ver menos' : 'Ler sinopse completa'}
                    </button>
                  </div>
                )}
                
                <button 
                  onClick={() => handlePlayTrack(currentFeatured)}
                  className="mt-8 px-8 py-3 border border-border text-text-high font-sans font-medium rounded-[4px] hover:bg-overlay transition-colors duration-300 flex items-center gap-2 group"
                >
                  <Play size={16} className="text-primary group-hover:scale-110 transition-transform" />
                  Ouvir Agora
                </button>
              </div>

              {/* Navigation Dots */}
              {featuredTracks.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {featuredTracks.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setActiveFeaturedIndex(idx);
                        setIsSynopsisExpanded(false);
                      }}
                      className={cn(
                        "w-2 h-2 rounded-full transition-all",
                        idx === activeFeaturedIndex ? "bg-primary w-6" : "bg-border hover:bg-primary/50"
                      )}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
    )}

      {/* Citação Poética */}
      <section className="py-24 md:py-32 px-6 relative flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--glow-purple)_0%,transparent_50%)] opacity-30" />
        <div className="flex items-center gap-4 md:gap-8 max-w-5xl mx-auto relative z-10">
          <div className="hidden lg:block w-20 h-[1px] bg-primary/30" />
          <blockquote className="text-center px-4">
            <p className="font-display italic text-2xl sm:text-3xl md:text-4xl text-text-high leading-relaxed">
              "Em cada fragmento, uma história. Em cada nota, um suspiro da alma perdida nas névoas do tempo."
            </p>
          </blockquote>
          <div className="hidden lg:block w-20 h-[1px] bg-primary/30" />
        </div>
      </section>
    </div>
  );
}
