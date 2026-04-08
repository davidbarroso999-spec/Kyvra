import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Volume2, Volume1, VolumeX, Sparkles, Loader2, AlignLeft } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { GoogleGenAI } from '@google/genai';

export function MiniPlayer() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const { currentTrack, isPlaying, setIsPlaying, playNext, playPrevious, volume } = useStore();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState('0:00');
  
  const [lyricsExplanation, setLyricsExplanation] = useState<string | null>(null);
  const [stanzaExplanations, setStanzaExplanations] = useState<Record<number, string>>({});
  const [isExplaining, setIsExplaining] = useState(false);
  const [explainingIndex, setExplainingIndex] = useState<number | null>(null); // null for full, number for stanza

  // Volume states
  const [isHoveringVolume, setIsHoveringVolume] = useState(false);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(1);
  const volumeBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Reset explanation and lyrics view when track changes
    setLyricsExplanation(null);
    setStanzaExplanations({});
    setShowLyrics(false);
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

  const handleExplainLyrics = async (text?: string, index?: number) => {
    const textToAnalyze = text || currentTrack?.lyrics;
    if (!textToAnalyze) return;
    
    setIsExplaining(true);
    setExplainingIndex(index !== undefined ? index : null);
    
    try {
      // Use process.env.GEMINI_API_KEY as per platform guidelines
      const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY;
      
      if (!apiKey) {
        const errorMsg = "A chave de acesso (API Key) não foi configurada. Verifique as configurações do sistema.";
        if (index !== undefined) {
          setStanzaExplanations(prev => ({ ...prev, [index]: errorMsg }));
        } else {
          setLyricsExplanation(errorMsg);
        }
        setIsExplaining(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `Imagine que você está explicando o significado desta letra para alguém que nunca ouviu falar desta banda ou deste universo. Seja direto, use palavras simples e evite termos difíceis ou muito "místicos".

      Analise este trecho da música "${currentTrack.title}" do artista "${currentTrack.artist}":
      
      "${textToAnalyze}"
      
      Sua missão:
      1. Explique o que está acontecendo aqui de um jeito que qualquer pessoa entenda.
      2. Conecte com o tema "Dark Romance Gótico" — fale sobre como o amor pode levar à destruição, a dor da perda, o desejo intenso ou a obsessão (narcisismo).
      3. Faça uma comparação com alguma obra histórica famosa (pode ser um livro, filme, pintura ou fato histórico) que combine com esse sentimento.
      4. REGRAS CRÍTICAS: 
         - NÃO use asteriscos (*) ou (**) em hipótese alguma.
         - NÃO use palavras rebuscadas ou difíceis.
         - Use no máximo 2 parágrafos curtos.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-preview',
        contents: prompt
      });

      if (response.text) {
        const cleanText = response.text.replace(/\*\*/g, '').replace(/\*/g, '').trim();
        if (index !== undefined) {
          setStanzaExplanations(prev => ({ ...prev, [index]: cleanText }));
        } else {
          setLyricsExplanation(cleanText);
        }
      } else {
        throw new Error("Resposta vazia da IA");
      }
    } catch (err) {
      console.error("Erro ao gerar explicação da letra:", err);
      const errorMsg = "As vozes do passado estão inaudíveis no momento. Tente novamente mais tarde.";
      if (index !== undefined) {
        setStanzaExplanations(prev => ({ ...prev, [index]: errorMsg }));
      } else {
        setLyricsExplanation(errorMsg);
      }
    } finally {
      setIsExplaining(false);
      setExplainingIndex(null);
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
          onEnded={playNext}
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
          <button onClick={playPrevious} className="text-text-mid hover:text-text-high transition-colors">
            <SkipBack size={16} />
          </button>
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-8 h-8 flex items-center justify-center bg-primary text-void rounded-full hover:scale-105 transition-transform"
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
          </button>
          <button onClick={playNext} className="text-text-mid hover:text-text-high transition-colors">
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
                      <span className="inline-block px-3 py-1 rounded-full bg-surface border border-border text-xs text-text-mid">
                        {currentTrack.vibe}
                      </span>
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
                          
                          <div className="mt-4 flex flex-col items-center gap-4">
                            {!stanzaExplanations[sIdx] && (
                              <button 
                                onClick={() => handleExplainLyrics(stanza, sIdx)}
                                disabled={isExplaining}
                                className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 mx-auto text-[10px] uppercase tracking-[0.2em] text-primary/60 hover:text-primary disabled:opacity-50"
                              >
                                {isExplaining && explainingIndex === sIdx ? (
                                  <Loader2 size={10} className="animate-spin" />
                                ) : (
                                  <Sparkles size={10} />
                                )}
                                Decifrar Estrofe
                              </button>
                            )}

                            <AnimatePresence>
                              {stanzaExplanations[sIdx] && (
                                <motion.div
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="w-full bg-primary/5 border border-primary/10 rounded-lg p-4 text-left"
                                >
                                  <p className="text-text-mid text-xs leading-relaxed italic">
                                    {stanzaExplanations[sIdx]}
                                  </p>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {!lyricsExplanation && (
                      <button
                        onClick={() => handleExplainLyrics()}
                        disabled={isExplaining}
                        className="mx-auto flex items-center gap-2 px-6 py-3 bg-surface border border-primary/30 text-primary rounded-full hover:bg-primary/10 transition-colors text-sm font-medium mb-8"
                      >
                        {isExplaining && explainingIndex === null ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
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
                <span>{currentTrack.duration}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between w-full mb-8 px-4">
              <button className="text-text-mid hover:text-primary transition-colors p-2"><Shuffle size={20} /></button>
              <button onClick={playPrevious} className="text-text-high hover:text-primary transition-colors p-2"><SkipBack size={32} /></button>
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-16 h-16 flex items-center justify-center bg-primary text-void rounded-full hover:scale-105 transition-transform shadow-[0_0_30px_var(--glow-purple)]"
              >
                {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
              </button>
              <button onClick={playNext} className="text-text-high hover:text-primary transition-colors p-2"><SkipForward size={32} /></button>
              <button className="text-text-mid hover:text-primary transition-colors p-2"><Repeat size={20} /></button>
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
