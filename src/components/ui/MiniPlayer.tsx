import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { Play, Pause, SkipBack, SkipForward, Repeat, Repeat1, Shuffle, Volume2, Volume1, VolumeX, AlignLeft, ListMusic, X, GripVertical, Share, Heart, SlidersHorizontal, Moon, ChevronDown, ChevronLeft, MoreVertical, Download, WifiOff } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn, isSavedOffline, getOfflineUrl } from '@/lib/utils';
import { TrackDuration } from '@/components/ui/TrackDuration';
import { KyvraButton } from './KyvraButton';

export function MiniPlayer() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [actualAudioUrl, setActualAudioUrl] = useState<string>('');

  const {
    currentTrack, isPlaying, setIsPlaying, playNext, playPrevious,
    volume, isShuffle, repeatMode, toggleShuffle, toggleRepeat,
    queue, shuffledQueue, setQueue, updateQueueOrder, removeFromQueue, clearQueue, setCurrentTrack, playHistory
  } = useStore();

  useEffect(() => {
    if (!currentTrack) return;
    
    // Web Media Session API
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist || 'Kyvra',
        album: currentTrack.albumTitle || 'Kyvra',
        artwork: [
          { src: currentTrack.coverUrl || '', sizes: '512x512', type: 'image/jpeg' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => { setIsPlaying(true); });
      navigator.mediaSession.setActionHandler('pause', () => { setIsPlaying(false); });
      navigator.mediaSession.setActionHandler('previoustrack', () => handlePrev());
      navigator.mediaSession.setActionHandler('nexttrack', () => handleNext());
      
      try {
        navigator.mediaSession.setActionHandler('seekbackward', (details) => {
          if (audioRef.current) {
            audioRef.current.currentTime = Math.max(audioRef.current.currentTime - (details.seekOffset || 10), 0);
          }
        });
        navigator.mediaSession.setActionHandler('seekforward', (details) => {
          if (audioRef.current) {
            audioRef.current.currentTime = Math.min(audioRef.current.currentTime + (details.seekOffset || 10), audioRef.current.duration);
          }
        });
      } catch (e) {
        // Ignored
      }
    }
  }, [currentTrack]);

  useEffect(() => {
    if (audioRef.current && actualAudioUrl) {
      if (isPlaying) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => {
            if (e.name !== 'AbortError') {
              console.error("Error playing audio:", e);
            }
          });
        }
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, actualAudioUrl]);

  useEffect(() => {
    const checkOffline = async () => {
      if (currentTrack?.audioUrl) {
        const saved = await isSavedOffline(currentTrack.audioUrl);
        setIsOffline(saved);
        setActualAudioUrl(await getOfflineUrl(currentTrack.audioUrl));
      } else {
        setIsOffline(false);
        setActualAudioUrl('');
      }
    };
    checkOffline();
  }, [currentTrack?.id]);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Use refs instead of state for performance (prevents 4x/sec re-renders of the entire player & queue)
  const [currentTime, setCurrentTime] = useState('0:00'); // only used for initial render
  const progressFillRef = useRef<HTMLDivElement>(null);
  const compactProgressFillRef = useRef<HTMLDivElement>(null);
  const timeDisplayRef = useRef<HTMLSpanElement>(null);
  const progressCircleRef = useRef<HTMLDivElement>(null);

  // Volume states
  const [isHoveringVolume, setIsHoveringVolume] = useState(false);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(1);
  const volumeBarRef = useRef<HTMLDivElement>(null);

  // Swipe gesture states
  const [dragOffset, setDragOffset] = useState(0);

  // Options menu state
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);

  // Seek hover states
  const [seekHoverTime, setSeekHoverTime] = useState<string | null>(null);
  const [seekHoverX, setSeekHoverX] = useState(0);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const scrollableRef = useRef<HTMLDivElement>(null);
  const lyricsScrollRef = useRef<HTMLDivElement>(null);

  const cleanLyrics = currentTrack?.lyrics?.replace(/\[\d{2}:\d{2}(?:\.\d{2,3})?\]/g, '').trim() || '';
  const lyricsLines = cleanLyrics.split('\n').filter(l => l.trim().length > 0);

  const handleDownload = () => {
    if (!currentTrack || !currentTrack.audioUrl) return;
    const a = document.createElement('a');
    a.href = currentTrack.audioUrl;
    a.download = `${currentTrack.title} - ${currentTrack.artist}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setShowOptionsMenu(false);
  };

  useEffect(() => {
    // Reset lyrics view when track changes
    setShowLyrics(false);
    
    // Reset time when track changes
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      if (progressFillRef.current) progressFillRef.current.style.width = '0%';
      if (compactProgressFillRef.current) compactProgressFillRef.current.style.width = '0%';
      if (progressCircleRef.current) progressCircleRef.current.style.left = 'calc(0% - 6px)';
      if (timeDisplayRef.current) timeDisplayRef.current.innerText = '0:00';
    }
  }, [currentTrack?.id]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const handleDragEnd = (_: any, info: any) => {
    // Se arrastou pra baixo mais de 100px ou em alta velocidade
    if (info.offset.y > 100 || info.velocity.y > 400) {
      setIsExpanded(false);
    }
    setDragOffset(0);
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const handleVolumeChange = (e: MouseEvent | React.MouseEvent) => {
    if (volumeBarRef.current) {
      const bounds = volumeBarRef.current.getBoundingClientRect();
      const percent = (e.clientX - bounds.left) / bounds.width;
      const newVolume = Math.max(0, Math.min(1, percent));
      useStore.getState().setVolume(newVolume);
      if (newVolume > 0) {
        setPreviousVolume(newVolume);
      }
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingVolume) {
        handleVolumeChange(e);
      }
    };
    const handleMouseUp = () => {
      setIsDraggingVolume(false);
    };

    if (isDraggingVolume) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingVolume]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignora se o usuário estiver digitando em um input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      switch (e.key) {
        case ' ':
          // Espaço: play/pause
          e.preventDefault();
          setIsPlaying(!isPlaying);
          break;

        case 'ArrowRight':
          // Seta direita: avança 10 segundos
          e.preventDefault();
          if (audioRef.current) {
            audioRef.current.currentTime = Math.min(
              audioRef.current.currentTime + 10,
              audioRef.current.duration || 0
            );
          }
          break;

        case 'ArrowLeft':
          // Seta esquerda: volta 10 segundos
          e.preventDefault();
          if (audioRef.current) {
            audioRef.current.currentTime = Math.max(
              audioRef.current.currentTime - 10,
              0
            );
          }
          break;

        case 'ArrowUp':
          // Seta cima: aumenta volume em 10%
          e.preventDefault();
          useStore.getState().setVolume(Math.min(volume + 0.1, 1));
          break;

        case 'ArrowDown':
          // Seta baixo: diminui volume em 10%
          e.preventDefault();
          useStore.getState().setVolume(Math.max(volume - 0.1, 0));
          break;

        case 'm':
        case 'M':
          // M: mute/unmute
          toggleMute();
          break;

        case 'n':
        case 'N':
          // N: próxima música
          handleNext();
          break;

        case 'p':
        case 'P':
          // P: música anterior
          handlePrev();
          break;
      }
    };

    // Só ativa os atalhos se houver uma música carregada
    if (currentTrack) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTrack, isPlaying, volume]);

  const toggleMute = () => {
    if (volume > 0) {
      setPreviousVolume(volume);
      useStore.getState().setVolume(0);
    } else {
      useStore.getState().setVolume(previousVolume > 0 ? previousVolume : 1);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const duration = audioRef.current.duration;
      if (duration > 0) {
        const p = (current / duration) * 100;
        if (progressFillRef.current) progressFillRef.current.style.width = `${p}%`;
        if (compactProgressFillRef.current) compactProgressFillRef.current.style.width = `${p}%`;
        if (progressCircleRef.current) progressCircleRef.current.style.left = `calc(${p}% - 6px)`;
      }
      
      const minutes = Math.floor(current / 60);
      const seconds = Math.floor(current % 60);
      const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      if (timeDisplayRef.current && timeDisplayRef.current.innerText !== timeStr) {
        timeDisplayRef.current.innerText = timeStr;
      }
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (audioRef.current) {
      const bounds = e.currentTarget.getBoundingClientRect();
      const percent = (e.clientX - bounds.left) / bounds.width;
      audioRef.current.currentTime = percent * audioRef.current.duration;
    }
  };

  const handleEnded = () => {
    if (repeatMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else {
      handleNext();
    }
  };

  const handleNext = () => {
    const prevId = currentTrack?.id;
    playNext();
    
    // Pequeno delay para garantir que o estado da store atualizou
    setTimeout(() => {
      const nextTrack = useStore.getState().currentTrack;
      if (nextTrack?.id === prevId) {
        // Se o ID não mudou (ex: fila de 1 música), reinicia
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play();
        }
      }
    }, 50);
  };

  const handlePrev = () => {
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
    } else {
      const prevId = currentTrack?.id;
      playPrevious();
      
      setTimeout(() => {
        const nextTrack = useStore.getState().currentTrack;
        if (nextTrack?.id === prevId) {
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play();
          }
        }
      }, 50);
    }
  };

  if (!currentTrack) return null;

  return (
    <>
      {actualAudioUrl && (
        <audio 
          ref={audioRef} 
          src={actualAudioUrl} 
          autoPlay={isPlaying}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onCanPlay={() => {
            if (isPlaying && audioRef.current) {
              audioRef.current.play().catch(() => {});
            }
          }}
        />
      )}
      
      {/* Compact Player */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: isExpanded ? 100 : 0, opacity: isExpanded ? 0 : 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed bottom-4 right-4 left-4 sm:left-auto sm:bottom-6 sm:right-6 z-[1000] glass r-md p-3 flex items-center gap-4 w-auto sm:w-[320px] shadow-2xl cursor-pointer"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
        onClick={() => setIsExpanded(true)}
      >
        <img src={currentTrack.coverUrl} alt="Cover" className="w-12 h-12 rounded object-cover" referrerPolicy="no-referrer" />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-text-high truncate">{currentTrack.title}</h4>
          <p className="text-[10px] text-text-low truncate uppercase tracking-wider">
            {currentTrack.artist} {currentTrack.albumTitle && `• ${currentTrack.albumTitle}`}
          </p>
        </div>
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <button onClick={handlePrev} className="text-text-mid hover:text-text-high transition-colors">
            <SkipBack size={16} />
          </button>
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-8 h-8 flex items-center justify-center bg-primary text-void rounded-full hover:scale-105 transition-transform"
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
          </button>
          <button onClick={handleNext} className="text-text-mid hover:text-text-high transition-colors">
            <SkipForward size={16} />
          </button>
        </div>
        {/* Progress Bar (Visual only for compact) */}
        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-border overflow-hidden" style={{ borderBottomLeftRadius: 'var(--radius-md)', borderBottomRightRadius: 'var(--radius-md)' }}>
          <div ref={compactProgressFillRef} className="h-full bg-primary" style={{ width: '0%' }} />
        </div>
      </motion.div>

      {/* Expanded Player Overlay */}
      {isExpanded && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          drag="y"
          dragDirectionLock
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.5 }}
          onDragEnd={handleDragEnd}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed inset-0 z-[2000] bg-void/98 flex flex-col"
          style={{
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)'
          }}
        >
          {/* Header/Handle Arrastável - Área de Toque Principal para Fechar */}
          <div className="absolute top-0 left-0 right-0 h-20 z-[2001] cursor-grab active:cursor-grabbing" />
          
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 bg-border rounded-full z-[2002] pointer-events-none" />

          {/* Background Overlay */}
          <div className="absolute inset-0 bg-void opacity-50 z-0 pointer-events-none" />
          <div 
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{ 
              backgroundImage: `url(${currentTrack.coverUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(100px) saturate(2)'
            }}
          />

          <div 
            className="relative z-10 flex-1 flex flex-col p-6 max-w-lg mx-auto w-full h-full overflow-hidden"
            onPointerDown={(e) => {
              if (showOptionsMenu) {
                setShowOptionsMenu(false);
              }
            }}
          >
            {/* Top Bar - Área de Toque Superior Aumentada */}
            <div className="flex items-center justify-between w-full mb-4 md:mb-8 mt-4 md:mt-0 select-none relative z-[2003]">
              <div className="flex-1 flex justify-start">
                <button 
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { 
                    e.stopPropagation();
                    if (showQueue || showLyrics) {
                      setShowQueue(false); 
                      setShowLyrics(false); 
                    } else {
                      setIsExpanded(false);
                    }
                  }}
                  className="w-16 h-16 -ml-4 flex items-center justify-center text-text-mid hover:text-text-high bg-transparent rounded-full transition-colors active:scale-95 touch-none group"
                  aria-label={showQueue || showLyrics ? "Voltar para o Player" : "Minimizar Player"}
                >
                  <div className="w-10 h-10 flex items-center justify-center bg-surface/30 rounded-full group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                    {showQueue || showLyrics ? <ChevronLeft size={24} /> : <ChevronDown size={24} />}
                  </div>
                </button>
              </div>

              <div className="text-[10px] font-sc tracking-[0.3em] text-text-low text-center flex-[2] pointer-events-none">
                {showQueue ? 'FILA DE REPRODUÇÃO' : showLyrics ? 'ARQUIVO DE LETRAS' : 'FREQUÊNCIA ATUAL'}
              </div>

              <div className="flex-1 flex justify-end">
                {/* Placeholder para balanceamento de layout flex da Top Bar */}
                <div className="w-16" />
              </div>
            </div>

            <AnimatePresence mode="wait">
              {showQueue ? (
                /* VIEW DA FILA */
                <motion.div
                  key="queue"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col w-full flex-1 min-h-0 relative z-[2004]"
                  onPointerDown={e => e.stopPropagation()} 
                >
                  <div className="w-full text-center mb-4 shrink-0">
                    <p className="text-xs text-text-low font-mono mt-1">{queue.length} faixas</p>
                  </div>

                  {/* Lista de faixas na fila */}
                  <div className="flex-1 overflow-y-auto w-full scrollbar-hide">
                    {queue.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-32 gap-2">
                        <p className="font-sc text-xs tracking-widest text-text-low">FILA VAZIA</p>
                      </div>
                    ) : (
                      <Reorder.Group 
                        axis="y" 
                        values={isShuffle ? shuffledQueue : queue} 
                        onReorder={updateQueueOrder} 
                        className="flex flex-col gap-1 px-2"
                      >
                        {(isShuffle ? shuffledQueue : queue).map((track, index) => {
                          const isCurrent = track.id === currentTrack?.id;
                          return (
                            <Reorder.Item
                              key={track.id}
                              value={track}
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-lg transition-colors group cursor-grab active:cursor-grabbing",
                                isCurrent
                                  ? "bg-primary/10 border border-primary/20"
                                  : "hover:bg-overlay"
                              )}
                            >
                              {/* Drag Handle */}
                              <div className="w-5 text-center shrink-0 text-text-low opacity-0 group-hover:opacity-100 transition-opacity">
                                <GripVertical size={16} />
                              </div>

                              {/* Número ou indicador de tocando */}
                              <div className="w-5 text-center shrink-0">
                                {isCurrent ? (
                                  /* Ícone animado de "tocando" — 3 barras pulsando */
                                  <div className="flex items-end justify-center gap-[2px] h-4">
                                    {[0, 0.2, 0.1].map((delay, i) => (
                                      <div
                                        key={i}
                                        className="w-[3px] bg-primary rounded-sm"
                                        style={{
                                          height: isPlaying ? '100%' : '40%',
                                          animation: isPlaying
                                            ? `queueBar 0.8s ease-in-out ${delay}s infinite alternate`
                                            : 'none',
                                          transition: 'height 0.3s ease'
                                        }}
                                      />
                                    ))}
                                  </div>
                                ) : (
                                  <span className="font-mono text-xs text-text-low">{index + 1}</span>
                                )}
                              </div>

                              {/* Capa miniatura */}
                              <img
                                src={track.coverUrl}
                                alt={track.title}
                                className="w-10 h-10 rounded object-cover shrink-0 pointer-events-none"
                                referrerPolicy="no-referrer"
                              />

                              {/* Info da faixa — clicável para tocar */}
                              <button
                                className="flex-1 text-left min-w-0"
                                onClick={() => setCurrentTrack(track)}
                              >
                                <p className={cn(
                                  "text-sm font-medium truncate",
                                  isCurrent ? "text-primary" : "text-text-high"
                                )}>
                                  {track.title}
                                </p>
                                <p className="text-xs text-text-low truncate">{track.artist}</p>
                              </button>

                              {/* Botão de remover — aparece no hover */}
                              {!isCurrent && (
                                <button
                                  onClick={() => removeFromQueue(track.id)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-text-low hover:text-primary"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </Reorder.Item>
                          );
                        })}
                      </Reorder.Group>
                    )}
                  </div>

                  {/* Botão limpar fila */}
                  {queue.length > 1 && (
                    <button
                      onClick={clearQueue}
                      className="mt-4 mx-auto text-xs text-text-low hover:text-primary transition-colors font-sc tracking-widest"
                    >
                      LIMPAR FILA
                    </button>
                  )}
                </motion.div>
              ) : !showLyrics ? (
                <motion.div 
                  key="cover"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col w-full flex-1 justify-between min-h-0 py-2 sm:py-4"
                >
                  <div className="flex-1 flex items-center justify-center min-h-0 mb-4 sm:mb-8">
                    {/* Album Art */}
                    <div className="w-full max-w-[min(100%,360px)] aspect-square rounded-xl sm:rounded-2xl overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.6)] shrink-0">
                      <img 
                        src={currentTrack.coverUrl} 
                        alt="Cover" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col shrink-0">
                    {/* Title & Actions */}
                    <div className="flex items-center justify-between mb-4 sm:mb-6">
                      <div className="flex flex-col overflow-hidden pr-4 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h2 className="text-2xl md:text-3xl font-display text-text-high truncate">{currentTrack.title}</h2>
                          {isOffline && (
                            <WifiOff size={14} className="text-primary opacity-50" title="Disponível Offline" />
                          )}
                        </div>
                        <p className="text-primary text-xs md:text-sm tracking-[0.1em] font-sc truncate opacity-80 uppercase">{currentTrack.artist}</p>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="flex flex-col mb-6 sm:mb-8">
                      <div className="w-full cursor-pointer py-4 -my-4 group" ref={progressBarRef} onClick={handleSeek}>
                        <div className="h-1.5 bg-surface/50 rounded-full relative overflow-hidden group-hover:h-2 transition-all">
                          <div ref={progressFillRef} className="absolute top-0 left-0 h-full bg-primary rounded-full transition-[width] duration-75" style={{ width: '0%' }} />
                        </div>
                        <div ref={progressCircleRef} className="absolute w-3 h-3 bg-primary rounded-full shadow-[0_0_10px_var(--glow-purple)] opacity-0 group-hover:opacity-100 transition-opacity" style={{ left: 'calc(0% - 6px)', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                      </div>
                      <div className="flex justify-between mt-3 font-mono text-[10px] text-text-low tracking-widest">
                        <span ref={timeDisplayRef}>0:00</span>
                        <TrackDuration audioUrl={currentTrack.audioUrl} defaultDuration={currentTrack.duration} />
                      </div>
                    </div>

                    {/* Main Controls */}
                    <div className="flex items-center justify-center gap-6 sm:gap-8 mb-6 sm:mb-10">
                      <KyvraButton 
                        onClick={handlePrev} 
                        variant="player"
                        className="w-14 h-14 rounded-full text-text-high"
                      >
                        <SkipBack size={20} className="fill-current" />
                      </KyvraButton>
                      <KyvraButton 
                        onClick={() => setIsPlaying(!isPlaying)}
                        variant="player"
                        showLed
                        isActive={isPlaying}
                        ledColor="red"
                        className={cn(
                          "w-20 h-20 rounded-full",
                          isPlaying ? "text-primary bg-primary/10 border-primary/50" : "text-void bg-primary"
                        )}
                      >
                        {isPlaying ? <Pause size={32} className="fill-current" /> : <Play size={32} className="ml-1 fill-current" />}
                      </KyvraButton>
                      <KyvraButton 
                        onClick={handleNext} 
                        variant="player"
                        className="w-14 h-14 rounded-full text-text-high"
                      >
                        <SkipForward size={20} className="fill-current" />
                      </KyvraButton>
                    </div>

                    {/* Bottom Strip Actions */}
                    <div className="grid grid-cols-4 gap-2 pb-2">
                      <button onClick={() => { setShowQueue(!showQueue); setShowLyrics(false); }} className={cn("flex flex-col items-center gap-1 py-2 rounded-lg transition-all", showQueue ? "text-primary" : "text-text-low hover:text-text-high")}>
                        <ListMusic size={20} />
                        <span className="text-[8px] font-sc tracking-widest">FILA</span>
                      </button>
                      <button onClick={() => { setShowLyrics(!showLyrics); setShowQueue(false); }} className={cn("flex flex-col items-center gap-1 py-2 rounded-lg transition-all", showLyrics ? "text-primary" : "text-text-low hover:text-text-high")}>
                        <AlignLeft size={20} />
                        <span className="text-[8px] font-sc tracking-widest">LETRA</span>
                      </button>
                      <button onClick={toggleShuffle} className={cn("flex flex-col items-center gap-1 py-2 rounded-lg transition-all", isShuffle ? "text-primary" : "text-text-low hover:text-text-high")}>
                        <Shuffle size={20} />
                        <span className="text-[8px] font-sc tracking-widest">SHUFFLE</span>
                      </button>
                      <button onClick={toggleRepeat} className={cn("flex flex-col items-center gap-1 py-2 rounded-lg transition-all", repeatMode !== 'off' ? "text-primary" : "text-text-low hover:text-text-high")}>
                        {repeatMode === 'one' ? <Repeat1 size={20} className="stroke-[3px]" /> : <Repeat size={20} />}
                        <span className="text-[8px] font-sc tracking-widest">{repeatMode === 'one' ? 'UM' : 'REPETIR'}</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="lyrics"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col w-full flex-1 min-h-0"
                  onPointerDown={e => e.stopPropagation()}
                >
                  <div className="w-full text-center mb-6 shrink-0 mt-4">
                    <h2 className="text-xl md:text-2xl font-display text-text-high leading-tight">{currentTrack.title}</h2>
                    <p className="text-primary/60 text-[10px] tracking-[0.2em] uppercase mt-1">{currentTrack.artist}</p>
                  </div>
                  
                  <div 
                    ref={lyricsScrollRef}
                    className="w-full flex-1 overflow-y-auto scrollbar-hide text-center px-4 pb-32 mask-fade-vertical pt-8"
                  >
                    {lyricsLines.length > 0 ? (
                      <div className="space-y-6">
                        {lyricsLines.map((line, idx) => (
                          <div key={idx} className="w-full flex items-center justify-center min-h-[2rem]">
                            <p className="text-lg sm:text-xl md:text-2xl font-display font-medium text-text-high opacity-80 hover:opacity-100 transition-opacity text-balance lg:whitespace-nowrap leading-tight mx-auto">
                              {line}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-text-low font-sc tracking-widest text-sm mt-10 opacity-50">Não há letras disponíveis.</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </>
  );
}
