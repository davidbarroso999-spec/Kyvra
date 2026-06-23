import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Maximize2,
  Minimize2,
  ChevronDown,
  AlignLeft,
  Eye,
  EyeOff
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";

const formatTime = (seconds: number = 0) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const CustomSlider = ({
  value,
  onChange,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}) => {
  return (
    <motion.div
      className={cn(
        "relative w-full h-[3px] bg-white/20 rounded-full cursor-pointer hover:h-[5px] transition-all",
        className
      )}
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = (x / rect.width) * 100;
        onChange(Math.min(Math.max(percentage, 0), 100));
      }}
    >
      <motion.div
        className="absolute top-0 left-0 h-full bg-white rounded-full"
        style={{ width: `${value}%` }}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />
    </motion.div>
  );
};

export const AudioSpectrum = ({ audioRef }: { audioRef: React.RefObject<HTMLAudioElement> }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationRef = useRef<number>(0);
  const themeColorRef = useRef<string>('#a78bfa'); // Default primary hex

  useEffect(() => {
    // Read theme color based on the current class of HTML
    const updateThemeColor = () => {
      const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
      if (primary) themeColorRef.current = primary;
    };
    
    updateThemeColor();
    
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(m => {
        if (m.attributeName === 'class') {
          updateThemeColor();
        }
      });
    });
    
    observer.observe(document.documentElement, { attributes: true });
    
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;
    const audioEl = audioRef.current;
    
    // WebAudio initialization that waits for an interaction (play)
    const initAudio = () => {
      if (audioContextRef.current) {
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        }
        return;
      }
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        audioContextRef.current = new AudioCtx();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256; 
        
        sourceRef.current = audioContextRef.current.createMediaElementSource(audioEl);
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);
      } catch (e) {
        console.warn("Kyvra: Mute ou interrupção WebAudio", e);
      }
    };

    audioEl.addEventListener('play', initAudio, { once: true });
    
    return () => {
      audioEl.removeEventListener('play', initAudio);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close().catch(()=>{});
      }
    };
  }, [audioRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true }); // optimize by specifying basic properties, alpha is true by default
    if (!ctx) return;
    
    const onResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = 100;
      ctx.imageSmoothingEnabled = false; // better performance for simple rects
    };
    onResize(); // Initial setup
    
    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      if (!analyserRef.current) return;
      
      const analyser = analyserRef.current;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = 4;
      const gap = 3;
      // We only use the lower 60% of frequency bins for visual clarity
      const visualBins = Math.floor(bufferLength * 0.6); 
      const totalWidth = visualBins * (barWidth + gap);
      const startX = (canvas.width - totalWidth) / 2;
      
      let x = startX > 0 ? startX : 0;
      const effectiveBarWidth = startX > 0 ? barWidth : (canvas.width / visualBins) - gap;
      
      // We set the fill style once per frame since it's the same color
      ctx.fillStyle = themeColorRef.current;
      
      for (let i = 0; i < visualBins; i++) {
        // Apply dampening to lower visual noise
        const rawValue = dataArray[i];
        if (rawValue === 0) {
          x += effectiveBarWidth + gap;
          continue; // Skip drawing empty bars for performance
        }
        
        // non-linear scaling for better visuals
        const percent = Math.pow(rawValue / 255, 1.5);
        const barHeight = Math.max(2, percent * canvas.height * 0.9);
        
        ctx.globalAlpha = percent * 0.7 + 0.1;
        ctx.beginPath();
        ctx.roundRect(x, canvas.height - barHeight, effectiveBarWidth, barHeight, Math.min(2, effectiveBarWidth/2));
        ctx.fill();
        
        x += effectiveBarWidth + gap;
      }
      ctx.globalAlpha = 1.0; // Reset alpha
    };
    
    draw();
    window.addEventListener('resize', onResize, { passive: true }); // passive listener
    
    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <div className="fixed bottom-0 left-0 w-full h-[80px] pointer-events-none z-[4900] opacity-60 mix-blend-screen flex items-end">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
};

export function MiniPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);

  const {
    currentTrack,
    isPlaying,
    setIsPlaying,
    playNext,
    playPrevious,
    volume,
    isShuffle,
    repeatMode,
    toggleShuffle,
    toggleRepeat,
    isPlayerHidden,
    setPlayerHidden,
  } = useStore();

  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const prog = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setProgress(isFinite(prog) ? prog : 0);
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (value: number) => {
    if (audioRef.current && audioRef.current.duration) {
      const time = (value / 100) * audioRef.current.duration;
      if (isFinite(time)) {
        audioRef.current.currentTime = time;
        setProgress(value);
      }
    }
  };

  const handleEnded = () => {
    if (repeatMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else {
      playNext();
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

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
  }, [isPlaying, currentTrack?.audioUrl]);

  if (!currentTrack) return null;

  return (
    <>
      <AudioSpectrum audioRef={audioRef} />
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        src={currentTrack.audioUrl || undefined}
        className="hidden"
        crossOrigin="anonymous"
        autoPlay={isPlaying}
        onCanPlay={() => {
          if (isPlaying && audioRef.current) {
            audioRef.current.play().catch(() => {});
          }
        }}
      />

      {/* Origin Center Point of CircularMenu for perfect alignment */}
      <div className="fixed bottom-[6rem] right-[1.5rem] sm:bottom-[3.625rem] sm:right-[3rem] z-[5000] flex items-center justify-center pointer-events-none">
        <div className="relative w-0 h-0 flex justify-center items-center pointer-events-auto">
          <AnimatePresence>
            {!isFullPlayerOpen && !isPlayerHidden && (
              <motion.div
                drag
                dragMomentum={false}
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                dragElastic={0.4}
                style={{
                  position: 'absolute',
                  right: '40px', // Exactly beside the menu (approx 30px radius + 10px gap)
                  bottom: '-30px', // Vertical center perfectly aligned with menu center (which is -30px for a 60px height element)
                }}
                className={cn(
                  "flex mx-auto overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.6)] cursor-grab active:cursor-grabbing transition-colors duration-700 glass-premium origin-bottom-right",
                  isActive 
                    ? "flex-col rounded-2xl p-3 w-[290px] h-auto" 
                    : "flex-row rounded-full p-2 w-auto h-[60px] items-center justify-center"
                )}
                initial={{ opacity: 0, filter: "blur(10px)", y: 50 }}
                animate={{ 
                  opacity: 1, 
                  filter: "blur(0px)", 
                  y: 0,
                  scale: 1
                }}
                exit={{ opacity: 0, filter: "blur(10px)", y: 50, scale: 0.9 }}
                transition={{
                  duration: 0.3,
                  ease: "easeInOut",
                  type: "spring",
                }}
                layout
              >
                <AnimatePresence mode="popLayout">
                  {isActive ? (
                    <motion.div
                      key="full-player-mini"
                      className="flex flex-col relative"
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.2 }}
                    >
                      {/* Cover */}
                      {currentTrack.coverUrl && (
                        <motion.div 
                          className="bg-white/20 overflow-hidden rounded-2xl aspect-square w-full relative group cursor-pointer"
                          onClick={() => setIsFullPlayerOpen(true)}
                        >
                          <img
                            src={currentTrack.coverUrl}
                            alt="cover"
                            loading="lazy"
                            decoding="async"
                            className="!object-contain bg-black/20 w-full my-0 p-0 !mt-0 border-none !h-full transition-transform duration-500 group-hover:scale-105"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Maximize2 className="text-white w-6 h-6 drop-shadow-md" />
                          </div>
                        </motion.div>
                      )}

                      <motion.div className="flex flex-col w-full gap-y-2 pointer-events-auto">
                        {/* Title */}
                        {currentTrack.title && (
                          <motion.h3 className="text-white font-bold text-sm text-center mt-2 truncate px-2">
                            {currentTrack.title}
                          </motion.h3>
                        )}

                        {/* Slider */}
                        <motion.div className="flex flex-col gap-y-1">
                          <CustomSlider
                            value={progress}
                            onChange={handleSeek}
                            className="w-full"
                          />
                          <div className="flex items-center justify-between mt-0.5">
                            <span className="text-white text-[10px] opacity-80">
                              {formatTime(currentTime)}
                            </span>
                            <span className="text-white text-[10px] opacity-80">
                              {formatTime(duration)}
                            </span>
                          </div>
                        </motion.div>

                        {/* Controls */}
                        <motion.div className="flex items-center justify-center w-full mt-1">
                          <div className="flex items-center gap-1.5 w-fit bg-black/40 rounded-[16px] p-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleShuffle();
                              }}
                              className={cn(
                                "text-white hover:bg-white/20 hover:text-white h-7 w-7 rounded-full transition-colors",
                                isShuffle && "bg-white/20 text-white"
                              )}
                            >
                              <Shuffle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                playPrevious();
                              }}
                              className="text-white hover:bg-white/20 hover:text-white h-7 w-7 rounded-full transition-colors"
                            >
                              <SkipBack className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePlay();
                              }}
                              variant="ghost"
                              size="icon"
                              className="text-white bg-primary/20 hover:bg-primary/40 hover:text-white h-9 w-9 rounded-full transition-colors"
                            >
                              {isPlaying ? (
                                <Pause className="h-5 w-5" />
                              ) : (
                                <Play className="h-5 w-5 ml-0.5" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                playNext();
                              }}
                              className="text-white hover:bg-white/20 hover:text-white h-7 w-7 rounded-full transition-colors"
                            >
                              <SkipForward className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRepeat();
                              }}
                              className={cn(
                                "text-white hover:bg-white/20 hover:text-white h-7 w-7 rounded-full transition-colors",
                                repeatMode !== 'off' && "bg-white/20 text-white"
                              )}
                            >
                              {repeatMode === 'one' ? <Repeat1 className="h-4 w-4 stroke-[3px]" /> : <Repeat className="h-4 w-4" />}
                            </Button>
                            <div className="w-[1px] h-5 bg-white/20 mx-0.5" />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPlayerHidden(true);
                              }}
                              className="text-white hover:text-primary hover:bg-white/20 h-7 w-7 rounded-full transition-colors"
                              title="Ocultar Player"
                            >
                              <EyeOff className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsActive(false);
                              }}
                              className="text-white hover:bg-white/20 hover:text-white h-7 w-7 rounded-full transition-colors"
                            >
                              <Minimize2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </motion.div>
                      </motion.div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="compact-player-mini"
                      className="flex items-center gap-1 pointer-events-auto"
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.2 }}
                    >
                      {currentTrack.coverUrl && (
                        <img
                          src={currentTrack.coverUrl}
                          alt="cover"
                          className="w-8 h-8 rounded-full object-cover shrink-0 ml-1 pointer-events-none"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          playPrevious();
                        }}
                        className="text-white hover:bg-white/20 hover:text-white h-8 w-8 rounded-full transition-colors ml-1"
                      >
                        <SkipBack className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePlay();
                        }}
                        variant="ghost"
                        size="icon"
                        className="text-white bg-primary/20 hover:bg-primary/40 hover:text-white h-10 w-10 rounded-full transition-colors shrink-0"
                      >
                        {isPlaying ? (
                          <Pause className="h-5 w-5" />
                        ) : (
                          <Play className="h-5 w-5 ml-0.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          playNext();
                        }}
                        className="text-white hover:bg-white/20 hover:text-white h-8 w-8 rounded-full transition-colors mr-1"
                      >
                        <SkipForward className="h-4 w-4" />
                      </Button>
                      <div className="w-[1px] h-6 bg-white/20 mx-1" />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlayerHidden(true);
                        }}
                        className="text-white hover:text-primary hover:bg-white/20 h-8 w-8 rounded-full transition-colors"
                        title="Ocultar Player"
                      >
                        <EyeOff className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsActive(true);
                        }}
                        className="text-white hover:bg-white/20 hover:text-white h-8 w-8 rounded-full transition-colors mr-1"
                      >
                        <Maximize2 className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* FULL PLAYER OVERLAY */}
      <AnimatePresence>
        {isFullPlayerOpen && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[6000] flex flex-col bg-void"
          >
            {/* Background Blur optimized for performance */}
            <div 
              className="absolute inset-0 z-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage: `url(${currentTrack.coverUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(20px)',
                transform: 'scale(1.4)',
                willChange: 'transform'
              }}
            />
            {/* Additional overlay to smooth out the grain from smaller blur */}
            <div className="absolute inset-0 z-[1] bg-void/60 pointer-events-none" />
            
            {/* Header */}
            <div className="relative z-10 flex items-center justify-between p-6 pt-12 md:p-8 md:pt-12 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFullPlayerOpen(false)}
                className="text-white hover:bg-white/10 rounded-full h-10 w-10"
              >
                <ChevronDown className="h-6 w-6" />
              </Button>
              <div className="flex flex-col items-center">
                <span className="text-[10px] tracking-[0.2em] font-sc text-primary uppercase">
                  TOCANDO AGORA
                </span>
                <span className="text-white/80 text-sm font-medium">
                  {currentTrack.albumTitle || currentTrack.artist}
                </span>
              </div>
              <div className="w-10"> {/* Balance header */} </div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 flex-1 flex flex-col md:flex-row items-center justify-center p-6 md:p-8 lg:p-12 gap-8 md:gap-12 lg:gap-16 xl:gap-20 overflow-y-auto md:overflow-hidden">
              {/* Cover Art */}
              <motion.div 
                layoutId={`cover-${currentTrack.id}`}
                className={cn(
                  "w-full aspect-square rounded-xl overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.5)] shrink-0 transition-all duration-500",
                  showLyrics 
                    ? "max-w-[260px] sm:max-w-[280px] md:max-w-[320px] lg:max-w-[360px] xl:max-w-[400px] opacity-40 md:opacity-100" 
                    : "max-w-[300px] sm:max-w-[320px] md:max-w-[400px] lg:max-w-[450px] xl:max-w-[500px]"
                )}
              >
                <img
                  src={currentTrack.coverUrl}
                  alt={currentTrack.title}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-contain bg-black/20"
                  referrerPolicy="no-referrer"
                />
              </motion.div>

              {/* Lyrics Panel */}
              <AnimatePresence>
                {showLyrics && (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20, position: "absolute" }}
                    className={cn(
                      "w-full md:w-[450px] lg:w-[500px] xl:w-[600px] h-[50dvh] md:h-[350px] lg:h-[420px] xl:h-[500px] md:max-h-[50vh] lg:max-h-[55vh] xl:max-h-[60vh] overflow-y-auto py-4 px-3 custom-scrollbar",
                      "absolute md:relative inset-x-6 md:inset-auto z-20 md:z-auto bg-void/80 md:bg-transparent backdrop-blur-xl md:backdrop-blur-none p-6 md:p-0 rounded-2xl md:rounded-none"
                    )}
                  >
                    <AnimatePresence mode="popLayout">
                      {currentTrack.lyrics ? (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex flex-col gap-5 text-white/90 text-base md:text-lg lg:text-xl font-medium leading-relaxed"
                          style={{ whiteSpace: "pre-wrap" }}
                        >
                          {currentTrack.lyrics}
                        </motion.div>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex h-full items-center justify-center"
                        >
                          <p className="text-white/50 text-center text-sm font-sans">
                            Letra não disponível para este fragmento.
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Controls */}
            <div className="relative z-10 w-full max-w-3xl mx-auto p-6 md:p-12 pb-12 shrink-0 flex flex-col gap-6">
              
              <div className="flex items-center justify-between w-full">
                <div className="flex flex-col">
                  <h2 className="text-2xl md:text-3xl font-display text-white">{currentTrack.title}</h2>
                  <p className="text-white/60 text-sm md:text-base">{currentTrack.artist}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowLyrics(!showLyrics)}
                  className={cn(
                    "rounded-full h-10 w-10 transition-colors",
                    showLyrics ? "bg-primary text-white" : "text-white/60 hover:text-white bg-white/5 hover:bg-white/10"
                  )}
                  title="Mostrar Letra"
                >
                  <AlignLeft className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex flex-col gap-2 w-full">
                <CustomSlider
                  value={progress}
                  onChange={handleSeek}
                  className="w-full h-[4px] hover:h-[6px]"
                />
                <div className="flex items-center justify-between text-white/50 text-xs font-mono">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between max-w-[400px] w-full mx-auto mt-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleShuffle();
                  }}
                  className={cn(
                    "text-white/60 hover:text-white h-12 w-12 rounded-full transition-colors",
                    isShuffle && "text-primary"
                  )}
                >
                  <Shuffle className="h-5 w-5" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    playPrevious();
                  }}
                  className="text-white/90 hover:text-white hover:bg-white/10 h-14 w-14 rounded-full transition-colors"
                >
                  <SkipBack className="h-6 w-6" />
                </Button>
                
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlay();
                  }}
                  variant="ghost"
                  size="icon"
                  className="text-void bg-primary hover:bg-primary/90 hover:scale-105 h-20 w-20 rounded-full transition-all shadow-[0_0_30px_rgba(var(--color-primary),0.4)]"
                >
                  {isPlaying ? (
                    <Pause className="h-8 w-8" />
                  ) : (
                    <Play className="h-8 w-8 ml-1" />
                  )}
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    playNext();
                  }}
                  className="text-white/90 hover:text-white hover:bg-white/10 h-14 w-14 rounded-full transition-colors"
                >
                  <SkipForward className="h-6 w-6" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleRepeat();
                  }}
                  className={cn(
                    "text-white/60 hover:text-white h-12 w-12 rounded-full transition-colors",
                    repeatMode !== 'off' && "text-primary"
                  )}
                >
                  {repeatMode === 'one' ? <Repeat1 className="h-5 w-5 stroke-[2px]" /> : <Repeat className="h-5 w-5" />}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

