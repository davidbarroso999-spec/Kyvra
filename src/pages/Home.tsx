import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import { Play } from 'lucide-react';
import { FeaturedSlider } from '@/components/ui/FeaturedSlider';
import { ThreeAbstractBackground } from '@/components/ui/ThreeAbstractBackground';

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
      // 1. Get featured track IDs (try JSON first, then fallback)
      const { data: settingsList } = await supabase
        .from('lore_chapters')
        .select('content')
        .eq('title', '__FEATURED_TRACKS_JSON__')
        .order('id', { ascending: false })
        .limit(1);
      
      const settings = settingsList?.[0];
      
      let trackIds: string[] = [];
      if (settings && settings.content) {
        try {
          trackIds = JSON.parse(settings.content);
        } catch (e) {
          console.error("Error parsing featured tracks JSON:", e);
        }
      }

      if (trackIds.length === 0) {
        const { data: oldSettingsList } = await supabase
          .from('lore_chapters')
          .select('content')
          .eq('title', '__FEATURED_TRACK__')
          .order('id', { ascending: false })
          .limit(1);
        const oldSettings = oldSettingsList?.[0];
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
        {/* 3D Template Background - Gratuito e Customizável */}
        <ThreeAbstractBackground />

        <div className="relative z-10 flex flex-col items-center text-center max-w-5xl mx-auto mt-16 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="label-micro block mb-6 animate-pulse text-primary pointer-events-auto">SETOR DE ARQUIVO KYVRA // 2026</span>
            <h1 className="display-large text-gradient mb-8 pointer-events-auto">
              KYVRA
            </h1>
          </motion.div>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5, delay: 0.6 }}
            className="label-secondary mb-10 px-4 pointer-events-auto"
          >
            FRAGMENTOS DE UM UNIVERSO SOMBRIO
          </motion.p>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="font-sans font-light text-text-mid text-base md:text-xl max-w-xl leading-relaxed mb-12 px-4 italic pointer-events-auto"
          >
            "Onde a luz falha e o som se torna o único guia através do abismo consciente."
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1 }}
            className="flex flex-row items-center justify-center gap-4 w-full px-2 max-w-sm mx-auto pb-20 pointer-events-auto"
          >
            <Link to="/arquivo" className="btn-uiverse text-[10px] sm:text-xs text-center flex-1 px-2 py-3 sm:px-6 sm:py-4">
              Explorar
            </Link>

            <Link to="/cosmogonia" className="btn-uiverse text-[10px] sm:text-xs text-center flex-1 px-2 py-3 sm:px-6 sm:py-4" style={{ background: 'transparent', border: '1px solid var(--border)', boxShadow: 'none' }}>
              A Cosmogonia 
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.2 }}
            className="flex flex-wrap items-center justify-center gap-8 mt-4 pointer-events-auto border-t border-white/5 pt-8 w-full max-w-xs"
          >
            <button 
              onClick={() => scrollToSection('musicas')} 
              className="text-[10px] tracking-[0.3em] text-text-low hover:text-primary transition-all uppercase cursor-pointer"
            >
              Músicas
            </button>
            <button 
              onClick={() => scrollToSection('albuns')} 
              className="text-[10px] tracking-[0.3em] text-text-low hover:text-primary transition-all uppercase cursor-pointer"
            >
              Álbuns
            </button>
            <button 
              onClick={() => scrollToSection('lore')} 
              className="text-[10px] tracking-[0.3em] text-text-low hover:text-primary transition-all uppercase cursor-pointer"
            >
              Lore
            </button>
          </motion.div>
        </div>
        
        {/* Scroll Indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 pointer-events-none"
        >
          <div className="w-[1px] h-10 bg-gradient-to-b from-primary/50 to-transparent" />
        </motion.div>
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

      {/* Álbuns Section Placeholder */}
      <section id="albuns" className="py-24 px-6 bg-void relative overflow-hidden scroll-mt-20">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <span className="label-micro text-primary mb-4 block">PORTAL DISCOGRÁFICO</span>
              <h2 className="text-4xl md:text-5xl font-display text-text-high tracking-tight">ÁLBUNS</h2>
            </div>
            <Link to="/arquivo" className="label-micro text-text-low hover:text-primary transition-colors flex items-center gap-2">
              Ver discografia completa <span className="text-xs">→</span>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="group relative aspect-square bg-white/5 border border-white/10 overflow-hidden r-md">
                <div className="absolute inset-0 bg-gradient-to-t from-void via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                <div className="absolute bottom-0 left-0 p-8">
                  <span className="label-micro text-primary mb-2 block opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 text-[10px]">COLEÇÃO {i}</span>
                  <h3 className="text-2xl font-display text-text-high">Fragmento {i}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lore Section Placeholder */}
      <section id="lore" className="py-24 px-6 bg-deep relative border-t border-white/5 scroll-mt-20">
        <div className="max-w-4xl mx-auto text-center">
          <span className="label-micro text-accent mb-6 block tracking-[0.4em]">ARQUIVO HISTÓRICO</span>
          <h2 className="text-4xl md:text-6xl font-display text-text-high mb-8 tracking-tighter">A LORE DE KYVRA</h2>
          <p className="font-sans font-light text-text-mid text-lg md:text-xl leading-relaxed mb-12 italic opacity-80">
            "A realidade é apenas um eco de freqüências que esquecemos como sintonizar. 
            Nestas páginas, reside a verdade por trás do véu."
          </p>
          <Link to="/cosmogonia" className="btn-uiverse inline-block px-12 py-4">
            Acessar Registros
          </Link>
        </div>
      </section>

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
            I
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
