import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Volume2, Volume1, VolumeX, Sparkles, Loader2, AlignLeft } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { TrackDuration } from '@/components/ui/TrackDuration';
import { getAI, MODELS, generateText } from '@/lib/ai';

export function MiniPlayer() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const { currentTrack, isPlaying, setIsPlaying, playNext, playPrevious, volume, isShuffle, repeatMode, toggleShuffle, toggleRepeat } = useStore();
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
    setTimeout(() => {
      if (useStore.getState().currentTrack?.id === prevId) {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play();
        }
      }
    }, 10);
  };

  const handlePrev = () => {
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
    } else {
      const prevId = currentTrack?.id;
      playPrevious();
      setTimeout(() => {
        if (useStore.getState().currentTrack?.id === prevId) {
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play();
          }
        }
      }, 10);
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
        className="fixed bottom-4 right-4 left-4 sm:left-auto sm:bottom-6 sm:right-6 z-[1000] glass rounded-xl p-3 flex items-center gap-4 w-auto sm:w-[320px] shadow-2xl cursor-pointer"
        onClick={() => setIsExpanded(true)}
      >
        <img src={currentTrack.coverUrl} alt="Cover" className="w-12 h-12 rounded object-cover" referrerPolicy="no-referrer" />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-text-high truncate">{currentTrack.title}</h4>
          <p className="text-xs text-text-low truncate">{currentTrack.artist}</p>
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
        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-border rounded-b-xl overflow-hidden">
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
        >
          {/* Blurred Background */}
          <div 
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              backgroundImage: `url(${currentTrack.coverUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(80px) saturate(1.5) brightness(0.4)'
            }}
          />

          <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full h-full">
            {currentTrack.lyrics && (
              <button 
                onClick={() => setShowLyrics(!showLyrics)}
                className={cn(
                  "absolute top-6 left-6 transition-colors flex items-center gap-2 text-sm font-medium z-50 p-2",
                  showLyrics ? "text-primary" : "text-text-mid hover:text-text-high"
                )}
              >
                <AlignLeft size={20} />
                <span className="hidden xs:inline">Letra</span>
              </button>
            )}

            <button 
              onClick={() => setIsExpanded(false)}
              className="absolute top-6 right-6 text-text-mid hover:text-text-high z-50 p-2"
            >
              <span className="text-2xl">↓</span>
            </button>

            <AnimatePresence mode="wait">
              {!showLyrics ? (
                <motion.div 
                  key="cover"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col items-center w-full mt-12"
                >
                  <img 
                    src={currentTrack.coverUrl} 
                    alt="Cover" 
                    className="w-56 h-56 xs:w-64 xs:h-64 sm:w-80 sm:h-80 rounded-xl object-cover shadow-[0_40px_120px_rgba(0,0,0,0.8),0_0_60px_var(--glow-purple)] mb-8 sm:mb-12"
                    referrerPolicy="no-referrer"
                  />

                  <div className="w-full text-center mb-8">
                    <h2 className="text-3xl font-display text-text-high mb-2">{currentTrack.title}</h2>
                    <p className="text-lg text-text-mid mb-2">{currentTrack.artist}</p>
                    {currentTrack.vibe && (
                      <div className="flex flex-wrap justify-center gap-2">
                        {currentTrack.vibe.split(' | ').map((tag, idx) => (
                          <span key={idx} className="px-3 py-1 rounded-full bg-surface border border-border text-[10px] uppercase tracking-widest text-text-mid font-mono">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
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
                          className="w-full bg-primary/5 border border-primary/20 rounded-xl p-6 text-left mb-8"
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

            {/* Progress */}
            <div className="w-full mb-8 group cursor-pointer" onClick={handleSeek}>
              <div className="h-1.5 bg-border rounded-full relative">
                <div className="absolute top-0 left-0 h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-text-high rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_10px_var(--primary)]" 
                  style={{ left: `calc(${progress}% - 6px)` }}
                />
              </div>
              <div className="flex justify-between mt-2 font-mono text-xs text-text-low">
                <span>{currentTime}</span>
                <TrackDuration audioUrl={currentTrack.audioUrl} defaultDuration={currentTrack.duration} />
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between w-full mb-8 px-4">
              <button 
                onClick={toggleShuffle}
                className={cn("transition-colors p-2", isShuffle ? "text-primary" : "text-text-mid hover:text-primary")}
              >
                <Shuffle size={20} />
              </button>
              <button onClick={handlePrev} className="text-text-high hover:text-primary transition-colors p-2"><SkipBack size={32} /></button>
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-16 h-16 flex items-center justify-center bg-primary text-void rounded-full hover:scale-105 transition-transform shadow-[0_0_30px_var(--glow-purple)]"
              >
                {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
              </button>
              <button onClick={handleNext} className="text-text-high hover:text-primary transition-colors p-2"><SkipForward size={32} /></button>
              <button 
                onClick={toggleRepeat}
                className={cn("transition-colors p-2 relative", repeatMode !== 'off' ? "text-primary" : "text-text-mid hover:text-primary")}
              >
                <Repeat size={20} />
                {repeatMode === 'one' && (
                  <span className="absolute top-1 right-1 text-[8px] font-bold bg-surface rounded-full w-3 h-3 flex items-center justify-center">1</span>
                )}
              </button>
            </div>

            {/* Volume - Hidden on mobile for better UX (use hardware buttons) */}
            <div 
              className="hidden sm:flex items-center gap-3 w-full max-w-[200px] text-text-mid group/volume"
              onMouseEnter={() => setIsHoveringVolume(true)}
              onMouseLeave={() => setIsHoveringVolume(false)}
            >
              <button 
                onClick={toggleMute}
                className="hover:text-text-high transition-colors"
              >
                {volume === 0 ? <VolumeX size={16} /> : volume < 0.5 ? <Volume1 size={16} /> : <Volume2 size={16} />}
              </button>
              
              <div 
                className="h-1.5 flex-1 bg-border rounded-full relative cursor-pointer flex items-center"
                ref={volumeBarRef}
                onMouseDown={(e) => {
                  setIsDraggingVolume(true);
                  handleVolumeChange(e);
                }}
              >
                <div 
                  className={cn(
                    "absolute top-0 left-0 h-full rounded-full transition-colors",
                    isHoveringVolume || isDraggingVolume ? "bg-primary" : "bg-text-high"
                  )} 
                  style={{ width: `${volume * 100}%` }} 
                />
                <div 
                  className={cn(
                    "absolute w-3 h-3 bg-text-high rounded-full shadow-[0_0_10px_var(--primary)] transition-opacity",
                    isHoveringVolume || isDraggingVolume ? "opacity-100" : "opacity-0"
                  )}
                  style={{ left: `calc(${volume * 100}% - 6px)` }}
                />
                
                {/* Volume Popup */}
                <AnimatePresence>
                  {(isHoveringVolume || isDraggingVolume) && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.8 }}
                      className="absolute -top-8 bg-surface border border-border text-text-high text-[10px] font-mono px-2 py-1 rounded shadow-lg pointer-events-none"
                      style={{ left: `calc(${volume * 100}% - 16px)` }}
                    >
                      {Math.round(volume * 100)}%
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
}
