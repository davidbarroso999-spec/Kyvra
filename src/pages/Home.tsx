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
        {/* Simple Gradient Background instead of ThreeAbstractBackground */}
        <div className="absolute inset-0 bg-void -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,var(--glow-purple)_0%,transparent_60%)] opacity-30" />
        </div>

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
