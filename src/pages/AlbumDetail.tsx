import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Play, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { getAlbumWithTracks } from '@/lib/apiCache';
import { TrackDuration } from '@/components/ui/TrackDuration';
import { saveForOffline } from '@/lib/utils';
import { KyvraButton } from '@/components/ui/KyvraButton';

export function AlbumDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setCurrentTrack, setIsPlaying, setQueue, addToQueue, playNext_track } = useStore();
  const [album, setAlbum] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [queueFeedback, setQueueFeedback] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setQueueFeedback(msg);
    setTimeout(() => setQueueFeedback(null), 2000);
  };

  useEffect(() => {
    const closeMenu = () => setOpenMenuId(null);
    window.addEventListener('scroll', closeMenu);
    return () => window.removeEventListener('scroll', closeMenu);
  }, []);

  useEffect(() => {
    async function fetchAlbum() {
      if (!id) return;
      
      const { data, error } = await getAlbumWithTracks(id);

      if (!error && data) {
        // Sort tracks by track_number
        const sortedTracks = data.tracks.sort((a: any, b: any) => a.track_number - b.track_number);
        
        setAlbum({
          id: data.id,
          title: data.title,
          artist: 'Kyvra',
          year: data.release_year,
          coverUrl: data.cover_url,
          description: data.description,
          tracks: sortedTracks.map((t: any) => ({
            id: t.id,
            title: t.title,
            duration: t.duration || '0:00',
            audioUrl: t.audio_url,
            coverUrl: data.cover_url,
            albumTitle: data.title,
            vibe: t.vibe || 'Introspectivo',
            lyrics: t.lyrics,
            artist: t.artist || 'Kyvra'
          }))
        });
      }
      setLoading(false);
    }
    fetchAlbum();
  }, [id]);

  const handlePlayAlbum = () => {
    if (!album) return;
    const tracksToPlay = album.tracks.map((t: any) => ({
      ...t,
      artist: t.artist || album.artist,
      coverUrl: album.coverUrl,
      vibe: t.vibe || 'Album Track'
    }));
    setQueue(tracksToPlay);
    setCurrentTrack(tracksToPlay[0]);
    setIsPlaying(true);
  };

  const handlePlayTrack = (track: any) => {
    if (!album) return;
    const trackToPlay = {
      ...track,
      artist: track.artist || album.artist,
      coverUrl: album.coverUrl,
      vibe: track.vibe || 'Album Track'
    };
    
    const allTracks = album.tracks.map((t: any) => ({
      ...t,
      artist: t.artist || album.artist,
      coverUrl: album.coverUrl,
      vibe: t.vibe || 'Album Track'
    }));
    
    setQueue(allTracks);
    setCurrentTrack(trackToPlay);
    setIsPlaying(true);
  };

  const handleShareTrack = async (track: any) => {
    const shareUrl = `https://descubrakyvra.vercel.app/#/arquivo?track=${track.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Kyvra — ${track.title}`,
          text: `Ouvindo ${track.title} de ${track.artist || album?.artist} no Kyvra. Fragmentos de um universo sombrio.`,
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
    a.download = `${track.title} - ${track.artist || album?.artist}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen pb-32">
        {/* Hero skeleton */}
        <div className="relative w-full h-[60vh] min-h-[500px] flex items-end justify-center overflow-hidden bg-deep">
          <div className="relative z-20 flex flex-col md:flex-row items-end gap-8 max-w-5xl mx-auto px-6 w-full mb-12">
            <div className="skeleton skeleton-md w-64 h-64 md:w-80 md:h-80 shrink-0" />
            <div className="flex flex-col gap-4 flex-1 pb-4">
              <div className="skeleton h-4 w-24" />
              <div className="skeleton h-16 w-3/4" />
              <div className="skeleton h-4 w-48" />
            </div>
          </div>
        </div>
        {/* Tracklist skeleton */}
        <div className="max-w-5xl mx-auto px-6 mt-12">
          <div className="skeleton h-14 w-56 mb-12" style={{ borderRadius: 'var(--radius-sm)' }} />
          <div className="flex flex-col gap-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-3 px-4">
                <div className="skeleton w-6 h-4" />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="skeleton h-4" style={{ width: `${50 + (i % 5) * 10}%` }} />
                  <div className="skeleton h-3 w-20" />
                </div>
                <div className="skeleton h-3 w-10" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!album) {
    return <div className="w-full min-h-screen flex items-center justify-center text-text-low">Álbum não encontrado.</div>;
  }

  return (
    <div className="w-full min-h-screen pb-32">
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

      {/* Aurora Hero */}
      <div className="relative w-full h-[60vh] min-h-[500px] flex items-center justify-center overflow-hidden">
        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)}
          className="absolute top-24 left-6 md:left-12 z-30 flex items-center gap-2 text-text-mid hover:text-text-high transition-colors font-sans text-sm bg-surface/30 backdrop-blur-md px-4 py-2 r-full border border-border/50 hover:bg-surface/50"
        >
          <ArrowLeft size={16} />
          Voltar
        </button>

        {/* Blurred Background */}
        <div 
          className="absolute inset-0 z-0 opacity-50"
          style={{
            backgroundImage: `url(${album.coverUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(120px) saturate(1.5)',
            transform: 'scale(1.2)'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-void z-10" />
        
        <div className="relative z-20 flex flex-col items-center md:items-end md:flex-row gap-6 md:gap-8 max-w-5xl mx-auto px-6 w-full mt-24 mb-6 md:mb-0">
          <motion.img 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            src={album.coverUrl} 
            alt={album.title} 
            fetchPriority="high"
            decoding="async"
            className="w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 object-cover r-md shadow-[0_30px_60px_rgba(0,0,0,0.8)]"
            referrerPolicy="no-referrer"
          />
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center md:text-left flex-1 w-full"
          >
            <span className="font-sc text-[10px] sm:text-xs tracking-[0.3em] text-primary mb-2 block uppercase">ÁLBUM</span>
            <h1 className="text-3xl sm:text-5xl md:text-7xl mb-4 font-display leading-[1.1]">{album.title}</h1>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-2 text-text-low font-sans text-sm">
              <span className="text-text-high">{album.artist}</span>
              <span className="hidden sm:inline w-1 h-1 rounded-full bg-border" />
              <span>{album.year}</span>
              <span className="hidden sm:inline w-1 h-1 rounded-full bg-border" />
              <span>{album.tracks.length} faixas</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 mt-12">
        <div className="flex flex-col gap-8 mb-12">
          <div>
            <KyvraButton 
              onClick={handlePlayAlbum}
              variant="album"
              ledColor="red"
              showLed
              className="flex items-center justify-center sm:justify-start gap-3 px-8 py-4 w-full sm:w-auto bg-primary text-void rounded-xl shadow-[0_0_30px_var(--glow-purple)]"
            >
              <Play size={20} className="fill-current" />
              Tocar Álbum Completo
            </KyvraButton>
          </div>
        </div>

        {/* Tracklist */}
        <div className="flex flex-col gap-2">
          {album.tracks.map((track, index) => (
            <div
              key={track.id}
              onClick={() => handlePlayTrack(track)}
              className="track-row-hover flex items-center gap-4 py-3 px-4 cursor-pointer rounded-none border-b border-border/50 last:border-0 group"
            >
              <span className="w-6 text-right font-mono text-text-low text-sm group-hover:text-primary">
                {index + 1}
              </span>
              <div className="flex-1 flex flex-col min-w-0">
                <h3 className="font-medium text-text-high group-hover:text-primary transition-colors truncate">{track.title}</h3>
              </div>
              <span className="font-mono text-sm text-text-low">
                <TrackDuration audioUrl={track.audioUrl} defaultDuration={track.duration} />
              </span>

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
                          setOpenMenuId(null);
                          const success = await saveForOffline(track.audioUrl);
                          if (track.coverUrl) await saveForOffline(track.coverUrl);
                          showFeedback(success ? 'Salvo para ouvir offline' : 'Erro ao salvar');
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-text-mid hover:text-text-high hover:bg-overlay transition-colors"
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
          ))}
        </div>
      </div>
    </div>
  );
}
