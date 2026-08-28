import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Play, Music } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { getFeaturedFragmentData } from '@/lib/apiCache';
import { cn } from '@/lib/utils';

interface FeaturedFragment {
  id: string;
  title: string;
  artist: string;
  vibe: string;
  duration: string;
  coverUrl: string;
  audioUrl?: string;
  narrativeNote: string;
  loreConnection: string;
}

interface FeaturedFragmentSectionProps {
  className?: string;
}

export function FeaturedFragmentSection({ className }: FeaturedFragmentSectionProps) {
  const { setCurrentTrack, setIsPlaying, setQueue } = useStore();
  const [fragment, setFragment] = useState<FeaturedFragment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    async function loadFragment() {
      try {
        const data = await getFeaturedFragmentData();
        if (data) setFragment(data);
      } catch (err) {
        console.error('Error loading featured fragment:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadFragment();
  }, []);

  const handlePlay = () => {
    if (!fragment) return;
    const track = {
      id: fragment.id,
      title: fragment.title,
      artist: fragment.artist,
      vibe: fragment.vibe,
      duration: fragment.duration,
      coverUrl: fragment.coverUrl,
      audioUrl: fragment.audioUrl,
      lyrics: '',
      albumTitle: '',
    };
    setQueue([track]);
    setCurrentTrack(track);
    setIsPlaying(true);
  };

  if (isLoading) {
    return (
      <section className={cn('w-full px-6 py-20 lg:py-32', className)}>
        <div className="max-w-5xl mx-auto">
          <div
            className="rounded-2xl p-8 lg:p-12"
            style={{ background: 'var(--surface)', border: '1px solid rgba(167,139,250,0.15)' }}
          >
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-white/10 rounded w-1/4" />
              <div className="h-8 bg-white/10 rounded w-2/3" />
              <div className="h-20 bg-white/10 rounded" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!fragment) return null;

  return (
    <section className={cn('w-full px-6 py-20 lg:py-32', className)}>
      {/* Header */}
      <div className="mb-12 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          viewport={{ once: true, margin: '-100px' }}
        >
          <span className="font-sc text-[10px] tracking-[0.3em] text-primary mb-3 block">
            ESCOLHA DO VAZIO
          </span>
          <h2
            className="font-display text-3xl lg:text-5xl text-text-high mb-4"
            style={{ letterSpacing: '-0.02em' }}
          >
            Recomendação do Abismo
          </h2>
        </motion.div>
      </div>

      {/* Featured Card */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        viewport={{ once: true, margin: '-100px' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="max-w-5xl mx-auto"
      >
        <div
          className="relative rounded-2xl overflow-hidden transition-all duration-500"
          style={{
            background: 'var(--surface)',
            border: isHovered ? '1.5px solid #a78bfa' : '1px solid rgba(167,139,250,0.15)',
            boxShadow: isHovered
              ? '0 0 60px rgba(167,139,250,0.25), inset 0 1px 0 rgba(255,255,255,0.08)'
              : 'inset 0 1px 0 rgba(255,255,255,0.04)',
          }}
        >
          {/* Grid layout: image left, content right (desktop) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* Image */}
            <div className="relative aspect-square lg:aspect-auto overflow-hidden bg-black/40">
              <img
                src={fragment.coverUrl || undefined}
                alt={fragment.title}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-700"
                style={{ transform: isHovered ? 'scale(1.05)' : 'scale(1)' }}
                referrerPolicy="no-referrer"
              />
              {/* Overlay gradient */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(5,5,8,0.3) 0%, rgba(5,5,8,0.7) 100%)',
                }}
              />
            </div>

            {/* Content */}
            <div className="p-8 lg:p-12 flex flex-col justify-between">
              {/* Main content */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Music size={16} className="text-primary" />
                  <span className="font-sc text-[9px] tracking-[0.2em] text-primary uppercase">
                    {fragment.vibe}
                  </span>
                </div>

                <h3
                  className="font-display text-3xl lg:text-4xl text-text-high mb-2 leading-tight"
                  style={{ letterSpacing: '-0.02em' }}
                >
                  {fragment.title}
                </h3>

                <p className="font-sans text-lg text-text-mid mb-8">{fragment.artist}</p>

                {/* Narrative note */}
                <div
                  className="rounded-xl p-4 mb-8"
                  style={{
                    background: 'rgba(167,139,250,0.08)',
                    border: '1px solid rgba(167,139,250,0.2)',
                  }}
                >
                  <p className="font-sc text-[9px] tracking-[0.2em] text-primary uppercase mb-2">
                    Nota Editorial
                  </p>
                  <p className="font-sans text-text-mid text-sm leading-relaxed">
                    {fragment.narrativeNote}
                  </p>
                </div>

                {/* Lore connection */}
                <div>
                  <p className="font-sc text-[9px] tracking-[0.2em] text-text-low uppercase mb-2">
                    Conexão na Lore
                  </p>
                  <p className="font-sans text-text-mid text-sm leading-relaxed">
                    {fragment.loreConnection}
                  </p>
                </div>
              </div>

              {/* Play button + meta */}
              <div className="mt-8 pt-8 border-t border-white/10 flex items-center justify-between">
                <div className="flex items-baseline gap-3">
                  <span className="font-sc text-[9px] tracking-[0.2em] text-text-low">
                    DURAÇÃO
                  </span>
                  <span className="font-mono text-text-high">{fragment.duration}</span>
                </div>

                {/* Play button */}
                <motion.button
                  onClick={handlePlay}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300"
                  style={{
                    background: '#a78bfa',
                    color: '#050508',
                    boxShadow: isHovered
                      ? '0 0 30px rgba(167,139,250,0.6)'
                      : '0 0 20px rgba(167,139,250,0.3)',
                  }}
                >
                  <Play size={20} fill="currentColor" />
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
