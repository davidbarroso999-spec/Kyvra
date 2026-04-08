import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Search, Play, Pause } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

const VIBES = ['Todos', 'Melancólico', 'Dark', 'Etéreo', 'Ambient', 'Introspectivo'];

export function Archive() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVibe, setSelectedVibe] = useState('Todos');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { currentTrack, isPlaying, setCurrentTrack, setIsPlaying, setQueue } = useStore();
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTracks() {
      const { data, error } = await supabase
        .from('tracks')
        .select(`
          *,
          albums (
            title,
            cover_url
          )
        `)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setTracks(data.map(t => ({
          id: t.id,
          title: t.title,
          artist: t.artist || 'Kyvra',
          vibe: t.vibe || 'Introspectivo',
          duration: t.duration || '0:00',
          coverUrl: t.albums?.cover_url || '',
          audioUrl: t.audio_url,
          albumTitle: t.albums?.title || '',
          lyrics: t.lyrics
        })));
      }
      setLoading(false);
    }
    fetchTracks();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredTracks = tracks.filter(track => {
    const matchesSearch = track.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesVibe = selectedVibe === 'Todos' || track.vibe === selectedVibe;
    return matchesSearch && matchesVibe;
  });

  const handlePlay = (track: any) => {
    if (currentTrack?.id === track.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentTrack(track);
      setQueue(tracks);
    }
  };

  return (
    <div className="w-full pt-32 px-6 pb-32 max-w-5xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-16 text-center"
      >
        <span className="font-sc text-[11px] tracking-[0.3em] text-primary block mb-4">ARQUIVO SONORO</span>
        <h1 className="text-5xl md:text-7xl">Biblioteca</h1>
      </motion.div>

      {/* Search Bar */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="max-w-[640px] mx-auto mb-12 relative group"
      >
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search size={18} className="text-text-low group-focus-within:text-primary transition-colors" />
        </div>
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Buscar no arquivo... ⌘K"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-surface border border-border rounded-lg py-4 pl-12 pr-4 text-text-high placeholder:text-text-low focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_var(--glow-purple)] transition-all font-sans"
        />
      </motion.div>

      {/* Filters */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex flex-wrap justify-center gap-3 mb-16"
      >
        {VIBES.map(vibe => (
          <button
            key={vibe}
            onClick={() => setSelectedVibe(vibe)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all duration-300",
              selectedVibe === vibe 
                ? "bg-primary/20 text-primary border border-primary/50" 
                : "bg-surface border border-border text-text-mid hover:text-text-high hover:border-text-mid"
            )}
          >
            {vibe}
          </button>
        ))}
      </motion.div>

      {/* Track List */}
      <div className="flex flex-col">
        {filteredTracks.map((track, index) => {
          const isCurrentTrack = currentTrack?.id === track.id;
          
          return (
            <motion.div
              key={track.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.05 }}
              onClick={() => handlePlay(track)}
              className="group flex items-center gap-4 py-4 px-2 hover:bg-primary/5 rounded-lg transition-colors border-b border-border/50 last:border-0 cursor-pointer"
            >
              <div className="w-8 flex justify-center text-text-low font-mono text-sm">
                {isCurrentTrack && isPlaying ? (
                  <div className="flex items-end gap-[2px] h-4">
                    <div className="w-1 bg-primary animate-[bounce_1s_infinite_0ms]" style={{ height: '100%' }} />
                    <div className="w-1 bg-primary animate-[bounce_1s_infinite_200ms]" style={{ height: '60%' }} />
                    <div className="w-1 bg-primary animate-[bounce_1s_infinite_400ms]" style={{ height: '80%' }} />
                  </div>
                ) : (
                  <span className="group-hover:hidden">{String(index + 1).padStart(2, '0')}</span>
                )}
                <button 
                  className={cn(
                    "hidden group-hover:flex items-center justify-center text-primary",
                    isCurrentTrack && isPlaying ? "flex" : ""
                  )}
                >
                  {isCurrentTrack && isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-1" />}
                </button>
              </div>
              
              <img src={track.coverUrl} alt={track.title} loading="lazy" className="w-12 h-12 rounded object-cover" referrerPolicy="no-referrer" />
              
              <div className="flex-1 min-w-0">
                <h3 className={cn("font-medium truncate", isCurrentTrack ? "text-primary" : "text-text-high")}>
                  {track.title}
                </h3>
                <p className="text-sm text-text-low truncate">{track.artist}</p>
              </div>
              
              <div className="hidden md:block">
                <span className="px-3 py-1 rounded-full bg-surface border border-border text-xs text-text-mid">
                  {track.vibe}
                </span>
              </div>
              
              <div className="font-mono text-sm text-text-low w-12 text-right">
                {track.duration}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
