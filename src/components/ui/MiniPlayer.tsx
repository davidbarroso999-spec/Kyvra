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
      // Se for Android (Capacitor/WebView), pulamos a conexão com o AudioContext.
      // É crucial: ao chamar createMediaElementSource em dispositivos móveis Android,
      // o player do WebView deixa de ser registrado como "reprodução de mídia padrão",
      // impedindo que o Android exiba a notificação do player com controles de música no Lockscreen/Central.
      const isAndroid = typeof window !== 'undefined' && /android/i.test(navigator.userAgent);
      if (isAndroid) {
        return;
      }

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
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = 4;
      const gap = 3;
      const isAndroid = typeof window !== 'undefined' && /android/i.test(navigator.userAgent);
      
      // Se for Android (WebAudio desativado para manter notificação), ou se o analisador não estiver ativo,
      // renderizamos uma animação de ondas senoidais simulando o espectro de áudio com excelente fidelidade e sem lag.
      if (!analyserRef.current || isAndroid) {
        const visualBins = 32;
        const totalWidth = visualBins * (barWidth + gap);
        const startX = (canvas.width - totalWidth) / 2;
        let x = startX > 0 ? startX : 0;
        const effectiveBarWidth = startX > 0 ? barWidth : (canvas.width / visualBins) - gap;
        
        ctx.fillStyle = themeColorRef.current;
        const isPlaying = audioRef.current && !audioRef.current.paused;
        const time = Date.now() * 0.0035;
        
        for (let i = 0; i < visualBins; i++) {
          let heightPercent = 0.04; // Altura mínima de repouso
          
          if (isPlaying) {
            // Cria ondas orgânicas combinando frequências senoidais e cossenos diferentes
            const w1 = Math.sin(time + i * 0.3) * 0.45 + 0.5;
            const w2 = Math.cos(time * 0.7 - i * 0.18) * 0.3 + 0.3;
            const w3 = Math.sin(time * 1.6 + i * 0.6) * 0.2 + 0.2;
            heightPercent = (w1 * 0.5 + w2 * 0.3 + w3 * 0.2);
            // adiciona um pequeno ruído rítmico natural
            heightPercent = Math.max(0.08, heightPercent * (0.85 + Math.random() * 0.15));
          }
          
          const barHeight = Math.max(2, heightPercent * canvas.height * 0.85);
          ctx.globalAlpha = heightPercent * 0.75 + 0.15;
          ctx.beginPath();
          ctx.roundRect(x, canvas.height - barHeight, effectiveBarWidth, barHeight, Math.min(2, effectiveBarWidth/2));
          ctx.fill();
          
          x += effectiveBarWidth + gap;
        }
        ctx.globalAlpha = 1.0;
        return;
      }
      
      const analyser = analyserRef.current;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);
      
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

const hapticFeedback = (duration = 10) => {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(duration);
    } catch (e) {
      // Ignored
    }
  }
};

// Helper function to show and update native media notifications via Service Worker
export async function showMediaNotification(track: any, isPlaying: boolean) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) {
    return;
  }

  if (Notification.permission !== 'granted') {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    if (!registration) return;

    // Send postMessage to Service Worker for robust background/active updates
    const activeSW = navigator.serviceWorker.controller || registration.active;
    if (activeSW) {
      activeSW.postMessage({
        type: 'UPDATE_MEDIA_NOTIFICATION',
        track: {
          title: track.title,
          artist: track.artist || 'Kyvra',
          coverUrl: track.coverUrl
        },
        isPlaying: isPlaying
      });
    }

    const getAbsoluteUrl = (url: string | undefined | null, fallback: string) => {
      if (!url) return window.location.origin + fallback;
      if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
      return window.location.origin + (url.startsWith('/') ? '' : '/') + url;
    };

    const artworkUrl = getAbsoluteUrl(track.coverUrl, '/pwa-512x512.png');

    await registration.showNotification(track.title, {
      body: track.artist || 'Kyvra',
      icon: artworkUrl,
      badge: artworkUrl,
      image: artworkUrl, // Displays as a beautiful big cover in the Android media panel
      tag: 'kyvra-music-player',
      requireInteraction: false,
      silent: true, // Keep it silent during state toggles so it behaves smoothly like a real media player
      actions: [
        {
          action: 'previous',
          title: 'Anterior'
        },
        {
          action: isPlaying ? 'pause' : 'play',
          title: isPlaying ? 'Pausar' : 'Tocar'
        },
        {
          action: 'next',
          title: 'Próxima'
        },
        {
          action: 'close',
          title: 'Fechar'
        }
      ]
    } as any);
  } catch (e) {
    console.warn("Kyvra: Failed to show media notification", e);
  }
}

export function MiniPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [isMobileLandscape, setIsMobileLandscape] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      setIsMobileLandscape(
        window.innerWidth > window.innerHeight && window.innerHeight < 600
      );
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

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

  // Request notifications permission and trigger first notification
  useEffect(() => {
    if (isPlaying && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        try {
          Notification.requestPermission().then((permission) => {
            if (permission === 'granted' && currentTrack) {
              showMediaNotification(currentTrack, isPlaying);
            }
          });
        } catch (e) {
          console.warn("Kyvra: Notification request permission failed", e);
        }
      }
    }
  }, [isPlaying, currentTrack]);

  // Sync state and track changes to the Notification Bar Player
  useEffect(() => {
    if (currentTrack) {
      showMediaNotification(currentTrack, isPlaying);
    } else {
      // Clear notification if no track is playing
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.getNotifications({ tag: 'kyvra-music-player' }).then((notifications) => {
            for (const notification of notifications) {
              notification.close();
            }
          });
        });
      }
    }
  }, [currentTrack, isPlaying]);

  // Handle media actions from the Service Worker notification buttons
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      const { type, action } = event.data || {};
      
      if (type === 'MEDIA_ACTION') {
        if (action === 'play') {
          setIsPlaying(true);
        } else if (action === 'pause') {
          setIsPlaying(false);
        } else if (action === 'next') {
          hapticFeedback(10);
          playNext();
        } else if (action === 'previous') {
          hapticFeedback(10);
          playPrevious();
        } else if (action === 'close') {
          setIsPlaying(false);
          // Explicitly ask the SW to dismiss the notification
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'CLOSE_NOTIFICATION'
            });
          }
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, [setIsPlaying, playNext, playPrevious]);

  // Media Session API integration for Android control center, lock screen, and bluetooth actions
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;

    try {
      const getAbsoluteUrl = (url: string | undefined | null, fallback: string) => {
        if (!url) return window.location.origin + fallback;
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
        return window.location.origin + (url.startsWith('/') ? '' : '/') + url;
      };

      const artworkUrl = getAbsoluteUrl(currentTrack.coverUrl, '/pwa-512x512.png');

      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist || 'O Arquivista',
        album: currentTrack.albumTitle || 'Kyvra',
        artwork: [
          { src: artworkUrl, sizes: '96x96', type: 'image/png' },
          { src: artworkUrl, sizes: '128x128', type: 'image/png' },
          { src: artworkUrl, sizes: '192x192', type: 'image/png' },
          { src: artworkUrl, sizes: '256x256', type: 'image/png' },
          { src: artworkUrl, sizes: '384x384', type: 'image/png' },
          { src: artworkUrl, sizes: '512x512', type: 'image/png' },
        ]
      });
    } catch (e) {
      console.warn("Kyvra: Media Session Metadata registration failed", e);
    }
  }, [currentTrack]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;

    try {
      navigator.mediaSession.setActionHandler('play', () => {
        setIsPlaying(true);
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        setIsPlaying(false);
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        hapticFeedback(10);
        playPrevious();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        hapticFeedback(10);
        playNext();
      });
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        if (audioRef.current) {
          hapticFeedback(8);
          const offset = details.seekOffset || 10;
          audioRef.current.currentTime = Math.max(audioRef.current.currentTime - offset, 0);
        }
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        if (audioRef.current) {
          hapticFeedback(8);
          const offset = details.seekOffset || 10;
          audioRef.current.currentTime = Math.min(audioRef.current.currentTime + offset, audioRef.current.duration || 0);
        }
      });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (audioRef.current && details.seekTime !== undefined) {
          audioRef.current.currentTime = details.seekTime;
        }
      });
    } catch (e) {
      console.warn("Kyvra: Media Session Action Handlers registration failed", e);
    }

    return () => {
      if (!('mediaSession' in navigator)) return;
      try {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('seekbackward', null);
        navigator.mediaSession.setActionHandler('seekforward', null);
        navigator.mediaSession.setActionHandler('seekto', null);
      } catch (e) {}
    };
  }, [currentTrack, playNext, playPrevious, setIsPlaying]);

  const togglePlay = () => {
    hapticFeedback(12);
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const prog = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setProgress(isFinite(prog) ? prog : 0);
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration);

      // Keep media session position state in sync
      if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
        try {
          navigator.mediaSession.setPositionState({
            duration: audioRef.current.duration || 0,
            playbackRate: audioRef.current.playbackRate || 1,
            position: audioRef.current.currentTime || 0
          });
        } catch (e) {
          // Ignore if values are temporarily out of sync
        }
      }
    }
  };

  const handleSeek = (value: number) => {
    if (audioRef.current && audioRef.current.duration) {
      hapticFeedback(6);
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
        preload="auto"
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
                    ? (isMobileLandscape ? "flex-row rounded-2xl p-2.5 w-[380px] h-[110px] items-center gap-3" : "flex-col rounded-2xl p-3 w-[290px] h-auto") 
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
                      className={cn("relative w-full h-full", isMobileLandscape ? "flex flex-row items-center gap-3" : "flex flex-col")}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.2 }}
                    >
                      {/* Cover */}
                      {currentTrack.coverUrl && (
                        <motion.div 
                          className={cn(
                            "bg-white/20 overflow-hidden rounded-2xl relative group cursor-pointer",
                            isMobileLandscape ? "w-20 h-20 shrink-0" : "aspect-square w-full"
                          )}
                          onClick={() => setIsFullPlayerOpen(true)}
                        >
                          <img
                            src={currentTrack.coverUrl || undefined}
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

                      <motion.div className={cn("pointer-events-auto", isMobileLandscape ? "flex flex-col flex-1 gap-y-1 mt-0 justify-between h-full py-0.5" : "flex flex-col w-full gap-y-2")}>
                        {/* Title */}
                        {currentTrack.title && (
                          <motion.h3 className={cn("text-white font-bold text-sm truncate px-1", isMobileLandscape ? "text-left mt-0 text-xs" : "text-center mt-2 px-2")}>
                            {currentTrack.title}
                          </motion.h3>
                        )}

                        {/* Slider */}
                        <motion.div className="flex flex-col gap-y-0.5">
                          <CustomSlider
                            value={progress}
                            onChange={handleSeek}
                            className="w-full"
                          />
                          <div className="flex items-center justify-between mt-0 leading-none">
                            <span className="text-white text-[9px] opacity-80 leading-none">
                              {formatTime(currentTime)}
                            </span>
                            <span className="text-white text-[9px] opacity-80 leading-none">
                              {formatTime(duration)}
                            </span>
                          </div>
                        </motion.div>

                        {/* Controls */}
                        <motion.div className={cn("flex items-center w-full", isMobileLandscape ? "justify-start mt-0.5" : "justify-center mt-1")}>
                          <div className={cn("flex items-center w-fit bg-black/40 rounded-full", isMobileLandscape ? "p-1 gap-1" : "p-1.5 gap-1.5")}>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                hapticFeedback(8);
                                toggleShuffle();
                              }}
                              className={cn(
                                "text-white hover:bg-white/20 hover:text-white rounded-full transition-colors",
                                isMobileLandscape ? "h-6 w-6" : "h-7 w-7",
                                isShuffle && "bg-white/20 text-white"
                              )}
                            >
                              <Shuffle className={isMobileLandscape ? "h-3 w-3" : "h-4 w-4"} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                hapticFeedback(10);
                                playPrevious();
                              }}
                              className={cn("text-white hover:bg-white/20 hover:text-white rounded-full transition-colors", isMobileLandscape ? "h-6 w-6" : "h-7 w-7")}
                            >
                              <SkipBack className={isMobileLandscape ? "h-3 w-3" : "h-4 w-4"} />
                            </Button>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePlay();
                              }}
                              variant="ghost"
                              size="icon"
                              className={cn("text-white bg-primary/20 hover:bg-primary/40 hover:text-white rounded-full transition-colors", isMobileLandscape ? "h-7 w-7" : "h-9 w-9")}
                            >
                              {isPlaying ? (
                                <Pause className={isMobileLandscape ? "h-4 w-4" : "h-5 w-5"} />
                              ) : (
                                <Play className={cn(isMobileLandscape ? "h-4 w-4" : "h-5 w-5", isMobileLandscape ? "ml-0" : "ml-0.5")} />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                hapticFeedback(10);
                                playNext();
                              }}
                              className={cn("text-white hover:bg-white/20 hover:text-white rounded-full transition-colors", isMobileLandscape ? "h-6 w-6" : "h-7 w-7")}
                            >
                              <SkipForward className={isMobileLandscape ? "h-3 w-3" : "h-4 w-4"} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                hapticFeedback(8);
                                toggleRepeat();
                              }}
                              className={cn(
                                "text-white hover:bg-white/20 hover:text-white rounded-full transition-colors",
                                isMobileLandscape ? "h-6 w-6" : "h-7 w-7",
                                repeatMode !== 'off' && "bg-white/20 text-white"
                              )}
                            >
                              {repeatMode === 'one' ? <Repeat1 className={cn("stroke-[3px]", isMobileLandscape ? "h-3 w-3" : "h-4 w-4")} /> : <Repeat className={isMobileLandscape ? "h-3 w-3" : "h-4 w-4"} />}
                            </Button>
                            <div className={cn("bg-white/20 mx-0.5", isMobileLandscape ? "w-[1px] h-4" : "w-[1px] h-5")} />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                hapticFeedback(5);
                                setPlayerHidden(true);
                              }}
                              className={cn("text-white hover:text-primary hover:bg-white/20 rounded-full transition-colors", isMobileLandscape ? "h-6 w-6" : "h-7 w-7")}
                              title="Ocultar Player"
                            >
                              <EyeOff className={isMobileLandscape ? "h-3 w-3" : "h-4 w-4"} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                hapticFeedback(5);
                                setIsActive(false);
                              }}
                              className={cn("text-white hover:bg-white/20 hover:text-white rounded-full transition-colors", isMobileLandscape ? "h-6 w-6" : "h-7 w-7")}
                            >
                              <Minimize2 className={isMobileLandscape ? "h-3 w-3" : "h-4 w-4"} />
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
                          src={currentTrack.coverUrl || undefined}
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
                          hapticFeedback(10);
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
                          hapticFeedback(10);
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
                          hapticFeedback(5);
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
                          hapticFeedback(5);
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
            <div className="relative z-10 flex items-center justify-between p-6 pt-12 md:py-6 md:px-8 shrink-0 landscape:py-3 landscape:pt-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFullPlayerOpen(false)}
                className="text-white hover:bg-white/10 rounded-full h-10 w-10"
              >
                <ChevronDown className="h-6 w-6" />
              </Button>
              <div className="flex flex-col items-center">
                <span className="text-[10px] tracking-[0.2em] font-sc text-primary uppercase leading-none mb-1">
                  TOCANDO AGORA
                </span>
                <span className="text-white/80 text-sm font-medium leading-none">
                  {currentTrack.albumTitle || currentTrack.artist}
                </span>
              </div>
              <div className="w-10"> {/* Balance header */} </div>
            </div>

            {/* Main Content Wrapper */}
            <div className={cn(
              "relative z-10 flex-1 flex",
              isMobileLandscape ? "flex-row p-4 gap-6 items-center justify-center overflow-hidden h-[calc(100vh-60px)]" : "flex-col overflow-y-auto"
            )}>
              {/* RETRATO / DESKTOP (Padrão) */}
              {!isMobileLandscape ? (
                <>
                  {/* Main Content */}
                  <div className="flex-1 flex flex-col md:flex-row items-center justify-center p-6 md:px-12 md:py-4 gap-8 md:gap-12 lg:gap-16 xl:gap-20 md:overflow-hidden">
                    {/* Cover Art */}
                    <motion.div 
                      layoutId={`cover-${currentTrack.id}`}
                      className={cn(
                        "w-full aspect-square rounded-xl overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.5)] shrink-0 transition-all duration-500",
                        showLyrics 
                          ? "max-w-[240px] sm:max-w-[260px] md:max-w-[280px] lg:max-w-[320px] xl:max-w-[380px] md:h-[28vh] lg:h-[34vh] xl:h-[40vh] opacity-40 md:opacity-100" 
                          : "max-w-[280px] sm:max-w-[300px] md:max-w-[360px] lg:max-w-[420px] xl:max-w-[480px] md:h-[38vh] lg:h-[44vh] xl:h-[50vh]"
                      )}
                    >
                      <img
                        src={currentTrack.coverUrl || undefined}
                        alt={currentTrack.title}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover bg-black/20"
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
                            "w-full md:w-[450px] lg:w-[500px] xl:w-[600px] h-[45dvh] md:h-[35vh] lg:h-[42vh] xl:h-[50vh] md:max-h-[50vh] lg:max-h-[55vh] xl:max-h-[60vh] overflow-y-auto py-4 px-3 custom-scrollbar",
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
                  <div className="w-full max-w-3xl mx-auto p-6 md:py-4 md:px-12 pb-8 shrink-0 flex flex-col gap-4">
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

                    <div className="flex items-center justify-between max-w-[400px] w-full mx-auto mt-2 md:mt-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          hapticFeedback(8);
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
                          hapticFeedback(10);
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
                          hapticFeedback(10);
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
                          hapticFeedback(8);
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
                </>
              ) : (
                /* PAISAGEM MÓVEL (Duas Colunas) */
                <>
                  {/* Coluna da Esquerda: Sempre a Capa */}
                  <div className="w-[40%] flex items-center justify-center p-2 shrink-0">
                    <motion.div 
                      layoutId={`cover-${currentTrack.id}`}
                      className="w-[170px] sm:w-[200px] aspect-square rounded-xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5)] shrink-0 transition-all duration-300"
                    >
                      <img
                        src={currentTrack.coverUrl || undefined}
                        alt={currentTrack.title}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover bg-black/20"
                        referrerPolicy="no-referrer"
                      />
                    </motion.div>
                  </div>

                  {/* Coluna da Direita: Controles OU Letras */}
                  <div className="w-[60%] h-full flex flex-col justify-center px-4 gap-3 relative overflow-hidden flex-1">
                    {showLyrics ? (
                      /* Painel de Letras Otimizado para Landscape */
                      <div className="flex-1 flex flex-col overflow-hidden min-h-0 pt-2 pb-1">
                        <div className="flex items-center justify-between mb-1 shrink-0">
                          <h3 className="text-white font-bold text-sm truncate">{currentTrack.title}</h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowLyrics(false)}
                            className="text-primary hover:bg-white/10 text-xs h-7 px-2 rounded-md shrink-0"
                          >
                            Voltar
                          </Button>
                        </div>
                        <div className="flex-1 overflow-y-auto py-2 px-3 bg-void/30 backdrop-blur-md rounded-xl custom-scrollbar border border-white/5 text-left text-xs sm:text-sm">
                          {currentTrack.lyrics ? (
                            <div className="text-white/90 font-medium leading-relaxed" style={{ whiteSpace: "pre-wrap" }}>
                              {currentTrack.lyrics}
                            </div>
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <p className="text-white/50 font-sans">
                                Letra não disponível para este fragmento.
                              </p>
                            </div>
                          )}
                        </div>
                        {/* Controles simplificados sob a letra */}
                        <div className="flex items-center justify-center gap-4 mt-2 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); hapticFeedback(10); playPrevious(); }}
                            className="text-white/80 hover:text-white h-8 w-8 rounded-full"
                          >
                            <SkipBack className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                            variant="ghost"
                            size="icon"
                            className="text-void bg-primary hover:bg-primary/95 h-9 w-9 rounded-full flex items-center justify-center"
                          >
                            {isPlaying ? <Pause className="h-4.5 w-4.5" /> : <Play className="h-4.5 w-4.5 ml-0.5" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); hapticFeedback(10); playNext(); }}
                            className="text-white/80 hover:text-white h-8 w-8 rounded-full"
                          >
                            <SkipForward className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* Painel de Controles Padrão em Landscape */
                      <div className="flex flex-col gap-3 py-2 justify-center h-full">
                        <div className="flex items-center justify-between w-full text-left">
                          <div className="flex flex-col max-w-[75%]">
                            <h2 className="text-lg md:text-xl font-display text-white truncate">{currentTrack.title}</h2>
                            <p className="text-white/60 text-xs truncate">{currentTrack.artist}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowLyrics(true)}
                            className="rounded-full h-9 w-9 text-white/60 hover:text-white bg-white/5 hover:bg-white/10 shrink-0"
                            title="Mostrar Letra"
                          >
                            <AlignLeft className="h-4.5 w-4.5" />
                          </Button>
                        </div>

                        <div className="flex flex-col gap-1 w-full">
                          <CustomSlider
                            value={progress}
                            onChange={handleSeek}
                            className="w-full h-[3px]"
                          />
                          <div className="flex items-center justify-between text-white/50 text-[10px] font-mono leading-none">
                            <span>{formatTime(currentTime)}</span>
                            <span>{formatTime(duration)}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between max-w-[320px] w-full mx-auto mt-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); hapticFeedback(8); toggleShuffle(); }}
                            className={cn("text-white/60 hover:text-white h-9 w-9 rounded-full", isShuffle && "text-primary")}
                          >
                            <Shuffle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); hapticFeedback(10); playPrevious(); }}
                            className="text-white/95 hover:text-white hover:bg-white/10 h-10 w-10 rounded-full"
                          >
                            <SkipBack className="h-5 w-5" />
                          </Button>
                          <Button
                            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                            variant="ghost"
                            size="icon"
                            className="text-void bg-primary hover:bg-primary/90 h-14 w-14 rounded-full flex items-center justify-center shadow-lg"
                          >
                            {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); hapticFeedback(10); playNext(); }}
                            className="text-white/95 hover:text-white hover:bg-white/10 h-10 w-10 rounded-full"
                          >
                            <SkipForward className="h-5 w-5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); hapticFeedback(8); toggleRepeat(); }}
                            className={cn("text-white/60 hover:text-white h-9 w-9 rounded-full", repeatMode !== 'off' && "text-primary")}
                          >
                            {repeatMode === 'one' ? <Repeat1 className="h-4 w-4 stroke-[2px]" /> : <Repeat className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

