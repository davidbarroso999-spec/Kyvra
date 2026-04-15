import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Volume2, Volume1, VolumeX, Sparkles, Loader2, AlignLeft, ListMusic, X, GripVertical, Share, Heart, SlidersHorizontal, Moon } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { TrackDuration } from '@/components/ui/TrackDuration';
import { getAI, MODELS, generateText } from '@/lib/ai';

export function MiniPlayer() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const {
    currentTrack, isPlaying, setIsPlaying, playNext, playPrevious,
    volume, isShuffle, repeatMode, toggleShuffle, toggleRepeat,
    queue, removeFromQueue, clearQueue, setCurrentTrack, playHistory
  } = useStore();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState('0:00');
  
  const [lyricsExplanation, setLyricsExplanation] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);

  // Volume states
  const [isHoveringVolume, setIsHoveringVolume] = useState(false);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(1);
  const volumeBarRef = useRef<HTMLDivElement>(null);

  // Swipe gesture states
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const [isDraggingDown, setIsDraggingDown] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  // Seek hover states
  const [seekHoverTime, setSeekHoverTime] = useState<string | null>(null);
  const [seekHoverX, setSeekHoverX] = useState(0);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const deltaY = e.touches[0].clientY - touchStartY.current;
    // Só ativa drag para baixo (fechamento)
    if (deltaY > 0) {
      setIsDraggingDown(true);
      setDragOffset(Math.min(deltaY, 200)); // Limita o arraste
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;

    // Swipe para baixo > 80px: fecha o player
    if (deltaY > 80 && Math.abs(deltaX) < 50) {
      setIsExpanded(false);
    }
    // Swipe para esquerda > 60px: próxima música
    else if (deltaX < -60 && Math.abs(deltaY) < 40) {
      handleNext();
    }
    // Swipe para direita > 60px: música anterior
    else if (deltaX > 60 && Math.abs(deltaY) < 40) {
      handlePrev();
    }

    setIsDraggingDown(false);
    setDragOffset(0);
  };

  useEffect(() => {
    // Reset explanation and lyrics view when track changes
    setLyricsExplanation(null);
    setShowLyrics(false);
    
    // Reset time when track changes
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setProgress(0);
      setCurrentTime('0:00');
    }
  }, [currentTrack?.id]);

  useEffect(() => {
    if (audioRef.current) {
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
  }, [isPlaying, currentTrack]);

  // Media Session API for mobile lock screen controls
  useEffect(() => {
    if ('mediaSession' in navigator && currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist || 'Kyvra',
        album: currentTrack.albumTitle || 'Kyvra',
        artwork: [
          { src: currentTrack.coverUrl || '', sizes: '512x512', type: 'image/jpeg' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => setIsPlaying(true));
      navigator.mediaSession.setActionHandler('pause', () => setIsPlaying(false));
      navigator.mediaSession.setActionHandler('previoustrack', () => handlePrev());
      navigator.mediaSession.setActionHandler('nexttrack', () => handleNext());
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
    }
  }, [currentTrack, isPlaying]);

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
        setProgress((current / duration) * 100);
      }
      
      const minutes = Math.floor(current / 60);
      const seconds = Math.floor(current % 60);
      setCurrentTime(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (audioRef.current) {
      const bounds = e.currentTarget.getBoundingClientRect();
      const percent = (e.clientX - bounds.left) / bounds.width;
      audioRef.current.currentTime = percent * audioRef.current.duration;
    }
  };

  const handleExplainLyrics = async () => {
    const textToAnalyze = currentTrack?.lyrics;
    if (!textToAnalyze) return;
    
    setIsExplaining(true);
    
    const prompt = `Você é o Arquivista de Kyvra. Sua missão é decifrar a letra da música "${currentTrack.title}" do artista "${currentTrack.artist}" sob a ótica do Arco Psicológico de Kyvra.

      FILOSOFIA KYVRA (O Arco Psicológico):
      1. ✨ Fascínio: O amor é visto como salvação sobrenatural, mas as almas não se tocam, apenas especulam.
      2. 🔥 Entrega: Perda de identidade e mergulho espiritual completo.
      3. 🌑 Obsessão: O amor vira vício, ciúme e dependência dolorosa.
      4. 🩸 Ruína: A percepção de que o amor destrói, mas a escolha consciente pelo abismo em vez do vazio.
      5. 🕯️ Consciência: O entendimento da dor sem arrependimento, abraçando a destruição com um toque de narcisismo.

      ESTÉTICA: Gótica, íntima e dramática (estilo Evanescence/Black Veil Brides).

      Analise esta letra: "${textToAnalyze}"
      
      Sua missão:
      1. Identifique em qual estágio do arco esta música se encontra.
      2. Explique o significado de forma visceral e direta.
      3. Conecte com o diferencial de Kyvra: o abraço à destruição e o ego do eu lírico.
      4. Compare com uma obra histórica/cultural que transmita essa mesma "beleza trágica".
      
      REGRAS CRÍTICAS: 
      - NÃO use asteriscos (*) ou (**).
      - Use no máximo 2 parágrafos curtos.`;

    try {
      const explanation = await generateText(prompt);
      setLyricsExplanation(explanation);
    } catch (err) {
      console.error("Erro ao gerar explicação da letra:", err);
      const errorMsg = "As vozes do passado estão inaudíveis no momento. Verifique a configuração da IA.";
      setLyricsExplanation(errorMsg);
    } finally {
      setIsExplaining(false);
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
      {currentTrack.audioUrl && (
        <audio 
          ref={audioRef} 
          src={currentTrack.audioUrl} 
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
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
          <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
      </motion.div>

      {/* Expanded Player Overlay */}
      {isExpanded && (
        <motion.div
          initial={{ y: '100vh' }}
          animate={{ y: 0 }}
          exit={{ y: '100vh' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed inset-0 z-[2000] bg-void/95 flex flex-col"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            transform: isDraggingDown ? `translateY(${dragOffset}px)` : undefined,
            transition: isDraggingDown ? 'none' : undefined,
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)'
          }}
        >
          {/* Indicador de swipe — visível apenas no mobile */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 bg-border rounded-full md:hidden z-50" />

          {/* Blurred Background */}
          <div 
            className="absolute inset-0 bg-[#1a1a1a] pointer-events-none"
          />

          <div className="relative z-10 flex-1 flex flex-col p-6 max-w-md mx-auto w-full h-full">
            {/* Top Bar */}
            <div className="flex items-center justify-between w-full mb-6 mt-2">
              <div className="w-8" /> {/* Spacer */}
              <div className="text-xs font-sc tracking-widest text-text-mid">TOCANDO AGORA</div>
              <button 
                onClick={() => setIsExpanded(false)}
                className="w-8 h-8 flex items-center justify-center text-text-mid hover:text-text-high"
              >
                <span className="text-xl">↓</span>
              </button>
            </div>

            <AnimatePresence mode="wait">
              {showQueue ? (
                /* VIEW DA FILA */
                <motion.div
                  key="queue"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex flex-col w-full flex-1 min-h-0 mt-16 mb-8"
                >
                  <div className="w-full text-center mb-4 shrink-0">
                    <h2 className="text-xl font-display text-text-high">Fila de Reprodução</h2>
                    <p className="text-xs text-text-low font-mono mt-1">{queue.length} faixas</p>
                  </div>

                  {/* Lista de faixas na fila */}
                  <div className="flex-1 overflow-y-auto w-full scrollbar-hide">
                    {queue.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-32 gap-2">
                        <p className="font-sc text-xs tracking-widest text-text-low">FILA VAZIA</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1 px-2">
                        {queue.map((track, index) => {
                          const isCurrent = track.id === currentTrack?.id;
                          return (
                            <motion.div
                              key={track.id}
                              layout
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-lg transition-colors group",
                                isCurrent
                                  ? "bg-primary/10 border border-primary/20"
                                  : "hover:bg-overlay"
                              )}
                            >
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
                                className="w-10 h-10 rounded object-cover shrink-0"
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
                            </motion.div>
                          );
                        })}
                      </div>
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
                  className="flex flex-col w-full flex-1"
                >
                  {/* Album Art */}
                  <div className="w-full aspect-square rounded-md overflow-hidden mb-8 shadow-2xl shrink-0">
                    <img 
                      src={currentTrack.coverUrl} 
                      alt="Cover" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* Title & Actions */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex flex-col overflow-hidden pr-4">
                      <h2 className="text-2xl font-bold text-text-high mb-1 truncate">{currentTrack.title}</h2>
                      <p className="text-text-mid text-sm truncate">{currentTrack.artist}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <button className="w-10 h-10 rounded-full bg-text-high flex items-center justify-center text-void hover:scale-105 transition-transform">
                        <Share size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="flex flex-col mb-8">
                    <div className="w-full cursor-pointer py-2 -my-2" ref={progressBarRef} onClick={handleSeek}>
                      <div className="h-2 bg-surface rounded-full relative">
                        <div className="absolute top-0 left-0 h-full bg-text-high rounded-full" style={{ width: `${progress}%` }} />
                        <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-text-high rounded-full shadow-md" style={{ left: `calc(${progress}% - 6px)` }} />
                      </div>
                    </div>
                    <div className="flex justify-between mt-2 font-mono text-xs text-text-mid">
                      <span>{currentTime}</span>
                      <TrackDuration audioUrl={currentTrack.audioUrl} defaultDuration={currentTrack.duration} />
                    </div>
                  </div>

                  {/* Main Controls */}
                  <div className="flex items-center justify-center gap-6 mb-8">
                    <button onClick={handlePrev} className="w-14 h-14 rounded-full bg-surface flex items-center justify-center text-text-high hover:bg-border transition-colors">
                      <SkipBack size={24} />
                    </button>
                    <button 
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="h-14 px-8 rounded-full bg-text-high flex items-center justify-center gap-2 text-void font-bold text-lg min-w-[140px] hover:scale-105 transition-transform"
                    >
                      {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
                      {isPlaying ? 'Pause' : 'Play'}
                    </button>
                    <button onClick={handleNext} className="w-14 h-14 rounded-full bg-surface flex items-center justify-center text-text-high hover:bg-border transition-colors">
                      <SkipForward size={24} />
                    </button>
                  </div>

                  {/* Bottom Controls */}
                  <div className="flex items-center justify-between mt-auto">
                    <button onClick={() => { setShowQueue(!showQueue); setShowLyrics(false); }} className="w-12 h-12 rounded-md border border-border flex items-center justify-center text-text-high hover:bg-surface transition-colors">
                      <ListMusic size={20} />
                    </button>
                    <button onClick={() => { setShowLyrics(!showLyrics); setShowQueue(false); }} className="w-12 h-12 rounded-md border border-border flex items-center justify-center text-text-high hover:bg-surface transition-colors">
                      <Moon size={20} />
                    </button>
                    <button onClick={toggleShuffle} className={cn("w-12 h-12 rounded-md border flex items-center justify-center transition-colors", isShuffle ? "border-primary text-primary bg-primary/10" : "border-border text-text-high hover:bg-surface")}>
                      <Shuffle size={20} />
                    </button>
                    <button className="w-12 h-12 rounded-md border border-border flex items-center justify-center text-text-high hover:bg-surface transition-colors">
                      <SlidersHorizontal size={20} />
                    </button>
                    <button onClick={toggleRepeat} className={cn("w-12 h-12 rounded-md border flex items-center justify-center transition-colors", repeatMode !== 'off' ? "border-primary text-primary bg-primary/10" : "border-border text-text-high hover:bg-surface")}>
                      <Repeat size={20} />
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="lyrics"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex flex-col items-center w-full flex-1 min-h-0 mt-16 mb-8"
                >
                  <div className="w-full text-center mb-6 shrink-0">
                    <h2 className="text-2xl font-display text-text-high">{currentTrack.title}</h2>
                  </div>
                  
                  <div className="w-full flex-1 overflow-y-auto scrollbar-hide text-center px-2 pb-8">
                    <div className="space-y-12 mb-12">
                      {currentTrack.lyrics.split('\n\n').map((stanza, sIdx) => (
                        <div key={sIdx} className="group relative">
                          <p className="text-text-high text-lg leading-relaxed whitespace-pre-line font-medium">
                            {stanza}
                          </p>
                        </div>
                      ))}
                    </div>
                    
                    {!lyricsExplanation && (
                      <button
                        onClick={() => handleExplainLyrics()}
                        disabled={isExplaining}
                        className="mx-auto flex items-center gap-2 px-6 py-3 bg-surface border border-primary/30 text-primary rounded-full hover:bg-primary/10 transition-colors text-sm font-medium mb-8"
                      >
                        {isExplaining ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                        Decifrar Obra Completa
                      </button>
                    )}

                    <AnimatePresence>
                      {lyricsExplanation && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="w-full bg-primary/5 border border-primary/20 r-md p-6 text-left mb-8"
                        >
                          <div className="flex items-center gap-2 text-primary mb-4">
                            <Sparkles size={18} />
                            <h4 className="font-display text-lg">Visão do Arquivista</h4>
                          </div>
                          <p className="text-text-mid text-sm leading-relaxed italic whitespace-pre-line">
                            {lyricsExplanation}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
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
