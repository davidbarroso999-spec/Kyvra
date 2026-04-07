import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Volume2, Sparkles, Loader2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { GoogleGenAI } from '@google/genai';

export function MiniPlayer() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { currentTrack, isPlaying, setIsPlaying, playNext, playPrevious, volume } = useStore();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState('0:00');
  
  const [lyricsExplanation, setLyricsExplanation] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);

  useEffect(() => {
    // Reset explanation when track changes
    setLyricsExplanation(null);
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
    if (!currentTrack?.lyrics) return;
    
    setIsExplaining(true);
    try {
      // @ts-ignore
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `Você é um crítico musical e poeta místico. Analise a seguinte letra da música "${currentTrack.title}" do artista "${currentTrack.artist}":
      
      "${currentTrack.lyrics}"
      
      Decifre os versos, explique os sentimentos transmitidos pela música e relacione trechos específicos com emoções e conceitos profundos (ex: "esta música transmite o sentimento X por causa do verso Y que diz Z, relacionando-se a W"). Mantenha um tom acadêmico, poético e levemente gótico/melancólico. Seja conciso (máximo de 2 parágrafos).`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      if (response.text) {
        setLyricsExplanation(response.text);
      }
    } catch (err) {
      console.error("Erro ao gerar explicação da letra:", err);
      setLyricsExplanation("As vozes do passado estão inaudíveis no momento. Tente novamente mais tarde.");
    } finally {
      setIsExplaining(false);
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
        className="fixed bottom-6 right-6 z-[1000] glass rounded-xl p-3 flex items-center gap-4 w-[320px] shadow-2xl cursor-pointer"
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

          <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full">
            <button 
              onClick={() => setIsExpanded(false)}
              className="absolute top-6 right-6 text-text-mid hover:text-text-high"
            >
              <span className="text-2xl">↓</span>
            </button>

            <motion.img 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              src={currentTrack.coverUrl} 
              alt="Cover" 
              className="w-64 h-64 sm:w-80 sm:h-80 rounded-xl object-cover shadow-[0_40px_120px_rgba(0,0,0,0.8),0_0_60px_var(--glow-purple)] mb-12"
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

            {currentTrack.lyrics && (
              <div className="w-full mb-8 flex flex-col items-center">
                <div className="w-full max-h-32 overflow-y-auto mb-4 text-center scrollbar-hide">
                  <p className="text-text-low text-sm whitespace-pre-line italic">
                    {currentTrack.lyrics}
                  </p>
                </div>
                
                {!lyricsExplanation && (
                  <button
                    onClick={handleExplainLyrics}
                    disabled={isExplaining}
                    className="flex items-center gap-2 px-4 py-2 bg-surface border border-primary/30 text-primary rounded-full hover:bg-primary/10 transition-colors text-xs font-medium"
                  >
                    {isExplaining ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    Decifrar Letra
                  </button>
                )}

                <AnimatePresence>
                  {lyricsExplanation && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="w-full bg-primary/5 border border-primary/20 rounded-lg p-4 mt-2 text-left max-h-48 overflow-y-auto scrollbar-hide"
                    >
                      <div className="flex items-center gap-2 text-primary mb-2">
                        <Sparkles size={14} />
                        <h4 className="font-display text-sm">Visão do Arquivista</h4>
                      </div>
                      <p className="text-text-mid text-xs leading-relaxed italic whitespace-pre-line">
                        {lyricsExplanation}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

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
            <div className="flex items-center justify-between w-full mb-8">
              <button className="text-text-mid hover:text-primary transition-colors"><Shuffle size={20} /></button>
              <button onClick={playPrevious} className="text-text-high hover:text-primary transition-colors"><SkipBack size={32} /></button>
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-16 h-16 flex items-center justify-center bg-primary text-void rounded-full hover:scale-105 transition-transform shadow-[0_0_30px_var(--glow-purple)]"
              >
                {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
              </button>
              <button onClick={playNext} className="text-text-high hover:text-primary transition-colors"><SkipForward size={32} /></button>
              <button className="text-text-mid hover:text-primary transition-colors"><Repeat size={20} /></button>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-3 w-full max-w-[200px] text-text-mid">
              <Volume2 size={16} />
              <div 
                className="h-1 flex-1 bg-border rounded-full relative cursor-pointer"
                onClick={(e) => {
                  const bounds = e.currentTarget.getBoundingClientRect();
                  const percent = (e.clientX - bounds.left) / bounds.width;
                  useStore.getState().setVolume(Math.max(0, Math.min(1, percent)));
                }}
              >
                <div className="absolute top-0 left-0 h-full bg-text-high rounded-full" style={{ width: `${volume * 100}%` }} />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
}
