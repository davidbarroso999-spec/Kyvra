import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Play, Pause } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn, saveForOffline } from '@/lib/utils';
import { getAllTracks } from '@/lib/apiCache';
import { TrackDuration } from '@/components/ui/TrackDuration';

export function Archive() {
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { currentTrack, isPlaying, setCurrentTrack, setIsPlaying, setQueue, addToQueue, playNext_track } = useStore();
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    const closeMenu = () => setOpenMenuId(null);
    window.addEventListener('scroll', closeMenu);
    return () => window.removeEventListener('scroll', closeMenu);
  }, []);

  useEffect(() => {
    async function fetchTracks() {
      const { data, error } = await getAllTracks();

      if (error) {
        console.error("Error fetching tracks:", error);
      }

      if (data) {
        const mappedTracks = data.map((t: any) => ({
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
    const q = searchQuery.toLowerCase();
    return !q ||
      track.title.toLowerCase().includes(q) ||
      track.artist.toLowerCase().includes(q) ||
      track.vibe.toLowerCase().includes(q);
  });

  const [queueFeedback, setQueueFeedback] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setQueueFeedback(msg);
    setTimeout(() => setQueueFeedback(null), 2000);
  };

  const handlePlay = (track: any) => {
    if (currentTrack?.id === track.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentTrack(track);
      setQueue(filteredTracks);
    }
  };

  const handleShareTrack = async (track: any) => {
    const shareUrl = `https://descubrakyvra.vercel.app${window.location.pathname}${window.location.search}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Kyvra — ${track.title}`,
          text: `Ouvindo ${track.title} de ${track.artist} no Kyvra. Fragmentos de um universo sombrio.`,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        showFeedback('Link copiado para a área de transferência');
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error sharing:', error);
      }
    }
  };

  const handleDownloadTrack = (track: any) => {
    if (!track.audioUrl) return;
    const a = document.createElement('a');
    a.href = track.audioUrl;
    a.download = `${track.title} - ${track.artist}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="w-full pt-32 px-6 pb-32 max-w-5xl mx-auto">
      {/* Toast de feedback de fila */}
      <AnimatePresence>
        {queueFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[900] glass px-4 py-2 r-sm text-sm text-text-high font-sans whitespace-nowrap"
          >
            {queueFeedback}
          </motion.div>
        )}
      </AnimatePresence>

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
        className="max-w-[640px] mx-auto mb-16 relative group"
      >
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search size={18} className="text-text-low group-focus-within:text-primary transition-colors" />
        </div>
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Buscar por título, artista ou gênero..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-surface border border-border r-md py-4 pl-12 pr-4 text-text-high placeholder:text-text-low focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_var(--glow-purple)] transition-all font-sans"
        />
        <div className="hidden md:flex absolute inset-y-0 right-4 items-center pointer-events-none">
          <span className="text-[10px] font-mono text-text-low bg-void/50 px-1.5 py-0.5 rounded border border-border">⌘K</span>
        </div>
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
            {searchQuery && (
              <p className="font-display text-text-low text-lg">
                "{searchQuery}" não existe neste universo
              </p>
            )}
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-primary font-sc tracking-widest hover:text-primary/80 transition-colors mt-2"
              >
                LIMPAR BUSCA
              </button>
            )}
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
                <div className="w-8 flex justify-center items-center text-text-low font-mono text-sm shrink-0">
                  {isCurrentTrack && isPlaying ? (
                    /* Estado: tocando — mostra barras animadas */
                    <div
                      className="flex items-end gap-[2px] h-4 cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); setIsPlaying(false); }}
                      title="Pausar"
                    >
                      <div className="w-1 bg-primary rounded-sm" style={{ height: '100%', animation: 'queueBar 0.8s ease-in-out 0s infinite alternate' }} />
                      <div className="w-1 bg-primary rounded-sm" style={{ height: '60%', animation: 'queueBar 0.8s ease-in-out 0.2s infinite alternate' }} />
                      <div className="w-1 bg-primary rounded-sm" style={{ height: '80%', animation: 'queueBar 0.8s ease-in-out 0.1s infinite alternate' }} />
                    </div>
                  ) : isCurrentTrack && !isPlaying ? (
                    /* Estado: pausado na faixa atual — mostra play para retomar */
                    <button
                      onClick={(e) => { e.stopPropagation(); setIsPlaying(true); }}
                      className="text-primary"
                      title="Retomar"
                    >
                      <Play size={16} className="ml-0.5" />
                    </button>
                  ) : (
                    /* Estado: outra faixa ou não tocando — mostra número ou play no hover */
                    <>
                      <span className="group-hover:hidden">{String(index + 1).padStart(2, '0')}</span>
                      <button
                        className="hidden group-hover:flex items-center justify-center text-primary"
                        onClick={(e) => { e.stopPropagation(); handlePlay(track); }}
                        title="Tocar"
                      >
                        <Play size={16} className="ml-0.5" />
                      </button>
                    </>
                  )}
                </div>
                
                <img src={track.coverUrl} alt={track.title} loading="lazy" className="w-12 h-12 rounded object-cover" referrerPolicy="no-referrer" />
                
                <div className="flex-1 min-w-0">
                  <h3 className={cn("font-medium truncate", isCurrentTrack ? "text-primary" : "text-text-high")}>
                    {track.title}
                  </h3>
                  <p className="text-sm text-text-low truncate">{track.artist}</p>
                </div>
                
                <div className="font-mono text-sm text-text-low w-12 text-right">
                  <TrackDuration audioUrl={track.audioUrl} defaultDuration={track.duration} />
                </div>

                {/* Botão de menu */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(openMenuId === track.id ? null : track.id);
                    }}
                    className="p-2 text-text-low hover:text-primary rounded md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                  >
                    {/* Ícone de três pontinhos vertical */}
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
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
                            showFeedback('Tocará em seguida');
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
                            showFeedback('Adicionado à fila');
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-text-mid hover:text-text-high hover:bg-overlay transition-colors"
                        >
                          Adicionar à fila
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            const target = e.currentTarget;
                            target.disabled = true;
                            const originalText = target.innerText;
                            target.innerText = 'Salvando...';
                            
                            const success = await saveForOffline(track.audioUrl);
                            if (track.coverUrl) await saveForOffline(track.coverUrl);
                            
                            target.innerText = success ? 'Salvo Offline ✓' : 'Erro ao salvar';
                            showFeedback(success ? 'Fragmento sincronizado com o drive local' : 'Falha na sincronização offline');
                            
                            setOpenMenuId(null);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-text-mid hover:text-text-high hover:bg-overlay transition-colors disabled:opacity-50"
                        >
                          Salvar Offline
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(null);
                            handleDownloadTrack(track);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-text-mid hover:text-text-high hover:bg-overlay transition-colors"
                        >
                          Baixar Áudio
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(null);
                            handleShareTrack(track);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-text-mid hover:text-text-high hover:bg-overlay transition-colors"
                        >
                          Compartilhar
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
