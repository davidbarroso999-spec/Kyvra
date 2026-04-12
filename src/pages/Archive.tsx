import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Search, Play, Pause } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { TrackDuration } from '@/components/ui/TrackDuration';

export function Archive() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('Todos');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { currentTrack, isPlaying, setCurrentTrack, setIsPlaying, setQueue, addToQueue, playNext_track } = useStore();
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableGenres, setAvailableGenres] = useState<string[]>(['Todos']);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    const closeMenu = () => setOpenMenuId(null);
    window.addEventListener('scroll', closeMenu);
    return () => window.removeEventListener('scroll', closeMenu);
  }, []);

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

      if (error) {
        console.error("Error fetching tracks:", error);
      }

      if (data) {
        const mappedTracks = data.map(t => ({
          id: t.id,
          title: t.title,
          artist: t.artist || 'Kyvra',
          vibe: t.vibe || '',
          duration: t.duration || '0:00',
          coverUrl: t.albums?.cover_url || '',
          audioUrl: t.audio_url,
          albumTitle: t.albums?.title || '',
          lyrics: t.lyrics
        }));
        setTracks(mappedTracks);

        // Extract unique vibes from tracks
        const genresSet = new Set<string>();
        mappedTracks.forEach(t => {
          if (t.vibe) {
            t.vibe.split(' | ').forEach((v: string) => genresSet.add(v.trim()));
          }
        });
        setAvailableGenres(['Todos', ...Array.from(genresSet).sort()]);
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
    const matchesGenre = selectedGenre === 'Todos' || track.vibe.toLowerCase().includes(selectedGenre.toLowerCase());
    return matchesSearch && matchesGenre;
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
        className="mb-16 flex items-end justify-between border-b border-border pb-8"
      >
        <div>
          <span className="font-sc text-[11px] tracking-[0.3em] text-primary block mb-3">ARQUIVO SONORO</span>
          <h1 className="text-5xl md:text-7xl leading-none">Biblioteca</h1>
        </div>
        <span className="font-mono text-xs text-text-low pb-2 hidden md:block">
          {filteredTracks.length} fragmentos
        </span>
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
          placeholder="Buscar no arquivo..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-surface border border-border r-md py-4 pl-12 pr-4 text-text-high placeholder:text-text-low focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_var(--glow-purple)] transition-all font-sans"
        />
        <div className="hidden md:flex absolute inset-y-0 right-4 items-center pointer-events-none">
          <span className="text-[10px] font-mono text-text-low bg-void/50 px-1.5 py-0.5 rounded border border-border">⌘K</span>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex flex-wrap justify-center gap-3 mb-16"
      >
        {availableGenres.map(genre => (
          <button
            key={genre}
            onClick={() => setSelectedGenre(genre)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all duration-300",
              selectedGenre === genre 
                ? "bg-primary/20 text-primary border border-primary/50" 
                : "bg-surface border border-border text-text-mid hover:text-text-high hover:border-text-mid"
            )}
          >
            {genre}
          </button>
        ))}
      </motion.div>

      {/* Track List */}
      <div className="flex flex-col">
        {loading ? (
          <div className="flex flex-col gap-1">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-3 px-4">
                <div className="skeleton w-4 h-3 shrink-0" />
                <div className="skeleton skeleton-md w-12 h-12 shrink-0" />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="skeleton h-4" style={{ width: `${55 + (i % 4) * 10}%` }} />
                  <div className="skeleton h-3 w-24" />
                </div>
                <div className="skeleton h-5 w-20 rounded-full hidden md:block" />
                <div className="skeleton h-3 w-8 hidden sm:block" />
              </div>
            ))}
          </div>
        ) : filteredTracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-[1px] h-12 bg-gradient-to-b from-transparent via-border to-transparent" />
            <p className="font-sc text-xs tracking-[0.3em] text-text-low">FRAGMENTO NÃO ENCONTRADO</p>
            <p className="font-display text-text-low text-lg">
              "{searchQuery}" não existe neste universo
            </p>
          </div>
        ) : (
          filteredTracks.map((track, index) => {
            const isCurrentTrack = currentTrack?.id === track.id;
            
            return (
              <div
                key={track.id}
                onClick={() => handlePlay(track)}
                className="track-row-hover flex items-center gap-4 py-3 px-4 cursor-pointer rounded-none border-b border-border/50 last:border-0 group"
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
                
                <div className="hidden md:flex flex-wrap gap-2">
                  {track.vibe.split(' | ').map((tag: string, idx: number) => (
                    <span key={idx} className="px-2 py-0.5 rounded-full bg-surface border border-border text-[9px] uppercase tracking-widest text-text-mid font-mono">
                      {tag}
                    </span>
                  ))}
                </div>
                
                <div className="font-mono text-sm text-text-low w-12 text-right">
                  <TrackDuration audioUrl={track.audioUrl} defaultDuration={track.duration} />
                </div>

                {/* Botão de menu — aparece no hover */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(openMenuId === track.id ? null : track.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-text-low hover:text-primary rounded"
                  >
                    {/* Ícone de três pontinhos vertical */}
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <circle cx="8" cy="3" r="1.5"/>
                      <circle cx="8" cy="8" r="1.5"/>
                      <circle cx="8" cy="13" r="1.5"/>
                    </svg>
                  </button>

                  {/* Dropdown do menu */}
                  {openMenuId === track.id && (
                    <>
                      {/* Overlay invisível para fechar o menu ao clicar fora */}
                      <div
                        className="fixed inset-0 z-40"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(null);
                        }}
                      />
                      <div className="absolute right-0 bottom-full mb-1 z-50 w-48 glass rounded-lg py-1 shadow-2xl border border-border">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            playNext_track(track);
                            setOpenMenuId(null);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-text-mid hover:text-text-high hover:bg-overlay transition-colors"
                        >
                          Tocar em seguida
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            addToQueue(track);
                            setOpenMenuId(null);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-text-mid hover:text-text-high hover:bg-overlay transition-colors"
                        >
                          Adicionar à fila
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
