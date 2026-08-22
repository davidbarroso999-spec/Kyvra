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
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  AlignLeft
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import { registerAudioElement, useAudioAnalyser } from "@/hooks/useAudioAnalyser";
import { FrequencyVisualizer } from "@/components/ui/FrequencyVisualizer";
import { KyvraAudio, isNativeAudioAvailable } from "@/lib/nativeAudio";

const formatTime = (seconds: number = 0) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const CustomSlider = React.memo(({
  value,
  onChange,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}) => {
  const handleInteraction = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    onChange(Math.min(Math.max(percentage, 0), 100));
  };

  return (
    <div
      className={cn(
        "relative w-full h-[3px] bg-white/20 rounded-full cursor-pointer hover:h-[5px] transition-all duration-150",
        className
      )}
      onClick={handleInteraction}
      style={{ transform: 'translateZ(0)' }}
    >
      <div
        className="absolute top-0 left-0 h-full bg-white rounded-full transition-[width] duration-75 ease-out"
        style={{ width: `${value}%`, transform: 'translateZ(0)' }}
      />
    </div>
  );
});

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
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [isMobileLandscape, setIsMobileLandscape] = useState(false);

  useEffect(() => {
    if (audioRef.current) {
      registerAudioElement(audioRef.current);
    }
  }, [audioRef]);

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
    queue,
    shuffledQueue,
    setCurrentTrack,
  } = useStore();

  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Native Audio synchronization and control refs
  const lastNativeTrackIdRef = useRef<string | null>(null);
  const lastNativeIsPlayingRef = useRef<boolean | null>(null);

  // Native Audio control wrappers
  const handlePlayNext = () => {
    hapticFeedback(10);
    if (isNativeAudioAvailable()) {
      KyvraAudio.skipToNext().catch((err) => {
        console.warn("Kyvra: skipToNext failed, falling back to Zustand", err);
        playNext();
      });
    } else {
      playNext();
    }
  };

  const handlePlayPrevious = () => {
    hapticFeedback(10);
    if (isNativeAudioAvailable()) {
      KyvraAudio.skipToPrevious().catch((err) => {
        console.warn("Kyvra: skipToPrevious failed, falling back to Zustand", err);
        playPrevious();
      });
    } else {
      playPrevious();
    }
  };

  // 1. Sync Queue & Track changes to native player
  useEffect(() => {
    if (!isNativeAudioAvailable() || !currentTrack) return;

    // If the change was already handled/triggered by the native player, skip sending
    if (currentTrack.id === lastNativeTrackIdRef.current) {
      return;
    }

    const activeQueue = isShuffle ? shuffledQueue : queue;
    if (activeQueue.length === 0) return;

    const trackIndex = activeQueue.findIndex(t => t.id === currentTrack.id);
    const startIndex = trackIndex !== -1 ? trackIndex : 0;

    // Send the active queue starting from the selected track
    KyvraAudio.setQueue({
      tracks: activeQueue,
      startIndex
    }).catch(err => {
      console.error("Kyvra: Failed to set queue on native player", err);
    });
  }, [currentTrack?.id, isShuffle]);

  // 2. Sync Play/Pause state to native player
  useEffect(() => {
    if (!isNativeAudioAvailable() || !currentTrack) return;

    if (isPlaying === lastNativeIsPlayingRef.current) {
      return;
    }

    if (isPlaying) {
      KyvraAudio.play().catch(err => console.error("Kyvra: play error", err));
    } else {
      KyvraAudio.pause().catch(err => console.error("Kyvra: pause error", err));
    }
  }, [isPlaying]);

  // 3. Listen to Native Player state updates
  useEffect(() => {
    if (!isNativeAudioAvailable()) return;

    let active = true;

    const subState = KyvraAudio.addListener('playbackStateChanged', ({ isPlaying: nativeIsPlaying }) => {
      if (!active) return;
      lastNativeIsPlayingRef.current = nativeIsPlaying;
      setIsPlaying(nativeIsPlaying);
    });

    const subTrack = KyvraAudio.addListener('trackChanged', ({ mediaId }) => {
      if (!active || !mediaId) return;
      lastNativeTrackIdRef.current = mediaId;

      const activeQueue = isShuffle ? shuffledQueue : queue;
      const foundTrack = activeQueue.find(t => t.id === mediaId);
      if (foundTrack) {
        setCurrentTrack(foundTrack);
      }
    });

    const subError = KyvraAudio.addListener('playbackError', ({ message }) => {
      console.error("Kyvra: Native player error:", message);
    });

    // Native position polling (since native is playing, HTML5 audio is not updating time)
    const interval = setInterval(() => {
      if (!active) return;
      KyvraAudio.getPosition().then(({ positionMs, durationMs }) => {
        if (!active) return;
        const currentSecs = positionMs / 1000;
        const durationSecs = durationMs / 1000;
        setCurrentTime(currentSecs);
        setDuration(durationSecs);
        
        const prog = durationSecs > 0 ? (currentSecs / durationSecs) * 100 : 0;
        setProgress(isFinite(prog) ? prog : 0);
      }).catch(() => {});
    }, 1000);

    return () => {
      active = false;
      clearInterval(interval);
      subState.then(s => s.remove());
      subTrack.then(s => s.remove());
      subError.then(s => s.remove());
    };
  }, [queue, shuffledQueue, isShuffle]);

  // No YouTube states or effect controllers needed

  // Request notifications permission and trigger first notification
  useEffect(() => {
    if (isNativeAudioAvailable()) return;
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
    if (isNativeAudioAvailable()) return; // Native Android handles its own notification
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
    if (isNativeAudioAvailable()) return; // Native Android uses KyvraAudio listeners instead
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
    if (isNativeAudioAvailable()) return; // Native Android reports metadata via MediaItem, not here
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
    if (isNativeAudioAvailable()) return;
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  useEffect(() => {
    if (isNativeAudioAvailable()) return; // Native Android handles hardware/lockscreen actions via MediaSession.Callback
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
      if (isNativeAudioAvailable()) return;
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
    if (isNativeAudioAvailable()) {
      hapticFeedback(6);
      const timeMs = (value / 100) * duration * 1000;
      if (isFinite(timeMs)) {
        KyvraAudio.seekTo({ positionMs: timeMs }).then(() => {
          setProgress(value);
        }).catch(() => {});
      }
      return;
    }

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
    if (isNativeAudioAvailable()) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      return;
    }

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

  // Always render background audio engines so they are initialized and ready immediately
  const renderEngines = () => (
    <>
      <audio
        ref={(el) => {
          // @ts-ignore
          audioRef.current = el;
          if (el) {
            registerAudioElement(el);
          }
        }}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        src={isNativeAudioAvailable() ? undefined : (currentTrack?.audioUrl || undefined)}
        className="hidden"
        crossOrigin="anonymous"
        preload="auto"
        autoPlay={isNativeAudioAvailable() ? false : isPlaying}
        onCanPlay={() => {
          if (!isNativeAudioAvailable() && isPlaying && audioRef.current) {
            audioRef.current.play().catch(() => {});
          }
        }}
      />
    </>
  );

  if (!currentTrack) {
    return renderEngines();
  }

  return (
    <>
      {renderEngines()}
      {/* Origin Center Point of CircularMenu for perfect alignment */}
      <div className="fixed bottom-[3.25rem] right-6 sm:bottom-[3.625rem] sm:right-[3rem] z-[5000] flex items-center justify-center pointer-events-none">
        <div className="relative w-0 h-0 flex justify-center items-center pointer-events-auto">
          {/* MORPHING CONTAINER ÚNICO E CONTÍNUO (Sem sumiço de casca/forma) */}
          <AnimatePresence>
            {!isFullPlayerOpen && currentTrack && (
              <motion.div
                key="mini-player-persistent-pill"
                layout
                transition={{
                  layout: { type: "spring", stiffness: 350, damping: 30 },
                  opacity: { duration: 0.2 },
                }}
                style={{
                  position: 'absolute',
                  right: '46px', // Exatamente ao lado do botão MENU
                  top: '0',
                }}
                className={cn(
                  "flex overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.6)] transition-colors duration-500 glass-premium origin-right flex-row rounded-full items-center justify-center pointer-events-auto",
                  isPlayerHidden
                    ? "p-1.5 h-[56px] w-auto cursor-pointer hover:border-primary/50 group"
                    : "p-2 h-[64px] w-auto"
                )}
                initial={{ opacity: 0, scale: 0.8, x: 20, y: "-50%" }}
                animate={{ opacity: 1, scale: 1, x: 0, y: "-50%" }}
                exit={{ opacity: 0, scale: 0.8, x: 20, y: "-50%" }}
                onClick={isPlayerHidden ? (e) => {
                  e.stopPropagation();
                  hapticFeedback(8);
                  setPlayerHidden(false);
                } : undefined}
                title={isPlayerHidden ? "Expandir Player" : undefined}
                aria-label={isPlayerHidden ? "Expandir Player" : undefined}
              >
                {/* Capa do Álbum (Persistente no container, posicionamento contínuo) */}
                {currentTrack.coverUrl && (
                  <motion.div
                    layout
                    className={cn(
                      "relative rounded-full overflow-hidden shrink-0 border border-white/15 bg-black/40 shadow-sm cursor-pointer group/cover",
                      isPlayerHidden ? "w-9 h-9" : "w-10 h-10 ml-0.5"
                    )}
                    onClick={(e) => {
                      if (!isPlayerHidden) {
                        e.stopPropagation();
                        setIsFullPlayerOpen(true);
                      }
                    }}
                    title={!isPlayerHidden ? "Abrir Player Completo" : undefined}
                  >
                    <img
                      src={currentTrack.coverUrl || undefined}
                      alt="cover"
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover pointer-events-none transition-transform duration-500 group-hover/cover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                  </motion.div>
                )}

                {/* Conteúdo Dinâmico Interno que transiciona enquanto a forma se expande */}
                <AnimatePresence mode="popLayout" initial={false}>
                  {isPlayerHidden ? (
                    <motion.div
                      key="collapsed-indicator"
                      initial={{ opacity: 0, scale: 0.8, x: -6 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.8, x: -6 }}
                      transition={{ duration: 0.18 }}
                      className="flex items-center pl-1.5 pr-1.5"
                    >
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white/10 group-hover:bg-primary/20 transition-colors">
                        <ChevronLeft className="w-3.5 h-3.5 text-text-high group-hover:text-primary transition-transform duration-300 group-hover:-translate-x-0.5" />
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="extended-player-mini"
                      className="flex items-center gap-2.5 pointer-events-auto px-1 ml-1"
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 12 }}
                      transition={{ duration: 0.2 }}
                    >
                      {/* Informações da faixa e barra de progresso horizontal */}
                      <div className="flex flex-col justify-center min-w-[90px] max-w-[130px] sm:max-w-[170px] gap-y-1">
                        <span className="text-white font-bold text-xs truncate leading-tight">
                          {currentTrack.title}
                        </span>
                        <CustomSlider
                          value={progress}
                          onChange={handleSeek}
                          className="w-full"
                        />
                        <div className="flex items-center justify-between text-[8px] text-white/70 leading-none">
                          <span>{formatTime(currentTime)}</span>
                          <span>{formatTime(duration)}</span>
                        </div>
                      </div>

                      {/* Controles de Reprodução */}
                      <div className="flex items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayPrevious();
                          }}
                          className="text-white hover:bg-white/20 hover:text-white h-7 w-7 sm:h-8 sm:w-8 rounded-full transition-colors"
                        >
                          <SkipBack className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Button>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePlay();
                          }}
                          variant="ghost"
                          size="icon"
                          className="text-white bg-primary/20 hover:bg-primary/40 hover:text-white h-8 w-8 sm:h-9 sm:w-9 rounded-full transition-colors shrink-0"
                        >
                          {isPlaying ? (
                            <Pause className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                          ) : (
                            <Play className="h-4 w-4 sm:h-4.5 sm:w-4.5 ml-0.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayNext();
                          }}
                          className="text-white hover:bg-white/20 hover:text-white h-7 w-7 sm:h-8 sm:w-8 rounded-full transition-colors"
                        >
                          <SkipForward className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Button>
                      </div>

                      <div className="w-[1px] h-6 bg-white/20 mx-0.5" />

                      {/* Seta para a DIREITA para recolher / fechar */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          hapticFeedback(5);
                          setPlayerHidden(true);
                        }}
                        className="text-white hover:text-primary hover:bg-white/20 h-7 w-7 sm:h-8 sm:w-8 rounded-full transition-colors mr-0.5"
                        title="Recolher Player"
                        aria-label="Recolher Player"
                      >
                        <ChevronRight className="h-4 w-4" />
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

            {/* Subtle frequency wave visualizer */}
            <div className="absolute inset-0 z-[2] pointer-events-none overflow-hidden">
              <FrequencyVisualizer opacity={0.35} />
            </div>
            
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
                                className="flex flex-col gap-5 text-white/90 text-base md:text-lg lg:text-xl font-medium leading-relaxed text-left"
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
                          handlePlayPrevious();
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
                          handlePlayNext();
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
                        <div 
                          className="flex-1 overflow-y-auto py-2 px-3 bg-void/30 backdrop-blur-md rounded-xl custom-scrollbar border border-white/5 text-left text-xs sm:text-sm"
                        >
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
                            onClick={(e) => { e.stopPropagation(); handlePlayPrevious(); }}
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
                            onClick={(e) => { e.stopPropagation(); handlePlayNext(); }}
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
                            onClick={(e) => { e.stopPropagation(); handlePlayPrevious(); }}
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
                            onClick={(e) => { e.stopPropagation(); handlePlayNext(); }}
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

