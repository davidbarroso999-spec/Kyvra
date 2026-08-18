import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Play, 
  Music, 
  ListPlus, 
  Key, 
  Globe, 
  ExternalLink, 
  Plus, 
  Trash2, 
  Check, 
  Tv, 
  WifiOff, 
  Loader2,
  Compass,
  Link2,
  HelpCircle,
  ArrowRight
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn, saveForOffline, copyToClipboard, getOptimizedImageUrl } from '@/lib/utils';
import { getAllTracks } from '@/lib/apiCache';
import { generateTrackShareText } from '@/lib/share';
import { TrackDuration } from '@/components/ui/TrackDuration';
import {
  useVirtualization,
  useConcurrentUpdate,
  useLazyImage,
} from '@/modules/performance-optimization';

const TRACK_ORDER = [
  "Sob a Égide da Lua",
  "Eco de um Adeus",
  "Vestígios de Nós",
  "Entre os Reinos do Fim",
  "Onde as Estrelas Morrem",
  "Rastros das Cinzas",
  "Voz que Me Queima",
  "Cativeiro",
  "Chamas Sob Minha Pele",
  "Reescreve Meu Fim",
  "Sussurri nella Notte",
  "Teu Vazio",
  "Cicatrizes e Delírios",
  "Limiar da Pele",
  "Flor de Sangue",
  "Sou",
  "Lâminas",
  "Incanto di Veleno",
  "Principado",
  "Cicatrizes",
  "Aurora",
  "Espelho de Cinzas",
  "Ruína",
  "Trono de Névoa",
  "Veneno em Flor",
  "Último Eclipse"
].map(t => t.toLowerCase());

interface TrackRowProps {
  track: any;
  index: number;
  style?: React.CSSProperties;
  isCurrentTrack: boolean;
  isPlaying: boolean;
  setIsPlaying: (p: boolean) => void;
  handlePlay: (t: any) => void;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  playNext_track: (t: any) => void;
  addToQueue: (t: any) => void;
  showFeedback: (msg: string) => void;
  handleDownloadTrack: (t: any) => void;
  handleShareTrack: (t: any) => void;
}

const TrackRow = React.memo(({
  track,
  index,
  style,
  isCurrentTrack,
  isPlaying,
  setIsPlaying,
  handlePlay,
  openMenuId,
  setOpenMenuId,
  playNext_track,
  addToQueue,
  showFeedback,
  handleDownloadTrack,
  handleShareTrack,
}: TrackRowProps) => {
  const { ref: imgRef, src: imgLoadedSrc, isLoaded, handleLoad } = useLazyImage(track.coverUrl);

  return (
    <div
      style={style}
      id={`track-${track.id}`}
      onClick={() => handlePlay(track)}
      className={cn("track-row-hover flex items-center gap-4 py-3 px-4 cursor-pointer border-b border-border/50 group first:rounded-t-lg last:rounded-b-lg", openMenuId === track.id && "relative z-[5000]")}
    >
      <div className="w-8 flex justify-center items-center text-text-low font-mono text-sm shrink-0">
        {isCurrentTrack && isPlaying ? (
          <div
            className="flex items-end gap-[2px] h-4 cursor-pointer"
            onClick={(e) => { e.stopPropagation(); setIsPlaying(false); }}
            title="Pausar"
          >
            <div className="w-[3px] bg-primary rounded-sm" style={{ height: '100%', animation: 'queueBar 0.8s ease-in-out 0s infinite alternate' }} />
            <div className="w-[3px] bg-primary rounded-sm" style={{ height: '60%', animation: 'queueBar 0.8s ease-in-out 0.2s infinite alternate' }} />
            <div className="w-[3px] bg-primary rounded-sm" style={{ height: '80%', animation: 'queueBar 0.8s ease-in-out 0.1s infinite alternate' }} />
          </div>
        ) : isCurrentTrack && !isPlaying ? (
          <button
            onClick={(e) => { e.stopPropagation(); setIsPlaying(true); }}
            className="text-primary"
            title="Retomar"
          >
            <Play size={16} className="ml-0.5" />
          </button>
        ) : (
          <>
            <span className="group-hover:hidden font-mono">{String(index + 1).padStart(2, '0')}</span>
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

      <div className="w-12 h-12 rounded bg-surface/50 overflow-hidden relative shrink-0 border border-border/30">
        <img
          ref={imgRef}
          src={imgLoadedSrc}
          onLoad={handleLoad}
          alt={track.title}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-30"
          )}
          referrerPolicy="no-referrer"
        />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className={cn("font-medium truncate text-sm md:text-base", isCurrentTrack ? "text-primary" : "text-text-high")}>
          {track.title}
        </h3>
        <p className="text-xs md:text-sm text-text-low truncate">{track.artist}</p>
      </div>

      <div className="font-mono text-xs md:text-sm text-text-low w-12 text-right">
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
          <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="8" cy="3" r="1.5"/>
            <circle cx="8" cy="8" r="1.5"/>
            <circle cx="8" cy="13" r="1.5"/>
          </svg>
        </button>

        {openMenuId === track.id && (
          <>
            <div
              className="fixed inset-0 z-[9998]"
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuId(null);
              }}
            />
            <div className="absolute right-0 bottom-full mb-1 z-[9999] w-48 glass rounded-lg py-1 shadow-2xl border border-border">
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
                  
                  target.innerText = success ? 'Salvo Offline ✓' : originalText;
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
});
TrackRow.displayName = 'TrackRow';

export function Archive() {
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const { isPending, updateWithConcurrency } = useConcurrentUpdate();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const currentTrack = useStore((state) => state.currentTrack);
  const isPlaying = useStore((state) => state.isPlaying);
  const setCurrentTrack = useStore((state) => state.setCurrentTrack);
  const setIsPlaying = useStore((state) => state.setIsPlaying);
  const setQueue = useStore((state) => state.setQueue);
  const addToQueue = useStore((state) => state.addToQueue);
  const playNext_track = useStore((state) => state.playNext_track);
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    let rafId: number;
    const closeMenu = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => setOpenMenuId(null));
    };
    window.addEventListener('scroll', closeMenu, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', closeMenu);
    };
  }, []);

  const location = useLocation();
  
  useEffect(() => {
    if (loading || tracks.length === 0) return;
    
    // Check if we have a track to scroll to
    const searchParams = new URLSearchParams(location.search);
    const trackId = searchParams.get('track');
    
    if (trackId) {
      setTimeout(() => {
        const element = document.getElementById(`track-${trackId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('bg-primary/20');
          setTimeout(() => {
            element.classList.remove('bg-primary/20');
            element.classList.add('transition-colors', 'duration-1000');
          }, 2000);
        }
      }, 500);
    }
  }, [loading, tracks, location.search]);

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
          coverUrl: getOptimizedImageUrl(t.albums?.cover_url || '', 400, 75),
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

  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    updateWithConcurrency(() => {
      setSearchQuery(val);
    });
  };

  const filteredTracks = tracks.filter(track => {
    const q = searchQuery.toLowerCase();
    return !q ||
      track.title.toLowerCase().includes(q) ||
      track.artist.toLowerCase().includes(q) ||
      track.vibe.toLowerCase().includes(q);
  });

  let sortedTracks = [...filteredTracks];
  sortedTracks.sort((a, b) => {
    const titleA = a.title?.toLowerCase().trim() || "";
    const titleB = b.title?.toLowerCase().trim() || "";
    
    const idxA = TRACK_ORDER.findIndex(t => titleA.includes(t) || t.includes(titleA));
    const idxB = TRACK_ORDER.findIndex(t => titleB.includes(t) || t.includes(titleB));
    
    const valA = idxA === -1 ? 999 : idxA;
    const valB = idxB === -1 ? 999 : idxB;
    
    if (valA === valB) {
      return titleA.localeCompare(titleB);
    }
    return valA - valB;
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
      setQueue(sortedTracks);
    }
  };

  const handleShareTrack = async (track: any) => {
    const { setGeneratingShare } = useStore.getState();
    setGeneratingShare(true);
    try {
      const shareText = await generateTrackShareText(track);
      const shareUrl = `https://descubrakyvra.vercel.app/#/arquivo?track=${track.id}`;
      const fullText = `${shareText}\n\n${shareUrl}`;
      const success = await copyToClipboard(fullText);
      if (success) {
        showFeedback('Link e texto decodificado copiados!');
      } else {
        showFeedback('Erro ao copiar para a área de transferência.');
      }
    } catch (e) {
      console.error(e);
      showFeedback('Erro ao decodificar fragmento.');
    } finally {
      setGeneratingShare(false);
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

  const { containerRef, slicedItems, paddingTop, paddingBottom, startIndex } = useVirtualization(
    sortedTracks,
    72
  );

  return (
    <div className="w-full pt-32 px-6 md:px-12 xl:px-16 pb-32 max-w-5xl mx-auto">
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
        className="mb-8 flex items-end justify-between border-b border-border pb-8"
      >
        <div>
          <span className="font-sc text-[11px] tracking-[0.3em] text-primary block mb-3">ARQUIVO SONORO</span>
          <h1 className="text-5xl md:text-7xl leading-none">Biblioteca</h1>
        </div>
        <span className="font-mono text-xs text-text-low pb-2 hidden md:block">
          {sortedTracks.length} fragmentos
        </span>
      </motion.div>

      {/* Controls: Search */}
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
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full bg-surface border border-border r-md py-4 pl-12 pr-16 text-text-high placeholder:text-text-low focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_var(--glow-purple)] transition-all font-sans"
        />
        {isPending && (
          <div className="absolute inset-y-0 right-12 flex items-center pointer-events-none">
            <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
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
        ) : sortedTracks.length === 0 ? (
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
                onClick={() => {
                  setSearchInput('');
                  setSearchQuery('');
                }}
                className="text-xs text-primary font-sc tracking-widest hover:text-primary/80 transition-colors mt-2"
              >
                LIMPAR BUSCA
              </button>
            )}
          </div>
        ) : (
          <div ref={containerRef} className="w-full border border-border/30 rounded-lg bg-void/30">
            <div style={{ paddingTop, paddingBottom }}>
              {slicedItems.map((track, idx) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  index={startIndex + idx}
                  isCurrentTrack={currentTrack?.id === track.id}
                  isPlaying={isPlaying}
                  setIsPlaying={setIsPlaying}
                  handlePlay={handlePlay}
                  openMenuId={openMenuId}
                  setOpenMenuId={setOpenMenuId}
                  playNext_track={playNext_track}
                  addToQueue={addToQueue}
                  showFeedback={showFeedback}
                  handleDownloadTrack={handleDownloadTrack}
                  handleShareTrack={handleShareTrack}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

