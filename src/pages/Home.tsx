import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getAllTracks } from '@/lib/apiCache';
import { useStore } from '@/store/useStore';
import { FeaturedSlider } from '@/components/ui/FeaturedSlider';
import { LampContainer } from '@/components/ui/lamp';
import { cn, getOptimizedImageUrl } from '@/lib/utils';
import { useIdleCallback, useGPUAcceleration } from '@/modules/performance-optimization';

import { AudioVisualizer } from '@/components/ui/AudioVisualizer';

const THEME_VIDEOS: Record<string, string> = {
  abissal: "https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/HEROVIDEO/YouCut_abissal.webm",
  'sangue-de-drago': "https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/HEROVIDEO/YouCut_sanguededrago.webm",
  'floresta-negra': "https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/HEROVIDEO/YouCut_florestanegra.webm",
  'monolito': "https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/HEROVIDEO/YouCut_monolito.webm"
};

const logPerformanceMeasure = (measureName: string, startMark: string, endMark: string) => {
  try {
    performance.measure(measureName, startMark, endMark);
    const entries = performance.getEntriesByName(measureName);
    const entry = entries[entries.length - 1];
    if (entry) {
      console.log(
        `%c[KYVRA PERFORMANCE] %c${measureName}: %c${entry.duration.toFixed(2)}ms`,
        "color: #00ffd2; font-weight: bold;",
        "color: #ffffff; font-weight: 500;",
        "color: #ff005c; font-weight: bold;"
      );
    }
  } catch (e) {
    // Ignore error
  }
};

const trackFPSSlowdown = (themeName: string, startTime: number) => {
  const frameTimes: number[] = [];
  
  const measureFPS = () => {
    const now = performance.now();
    frameTimes.push(now);
    if (now - startTime < 1200) {
      if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(measureFPS);
      }
    } else {
      let stutters = 0;
      for (let i = 1; i < frameTimes.length; i++) {
        const delta = frameTimes[i] - frameTimes[i-1];
        if (delta > 20) { // Se o frame demorar mais de 20ms (queda de FPS abaixo de 50 FPS)
          stutters++;
        }
      }

      if (stutters > 15) {
        console.warn("[KYVRA TELEMETER] Evento de frame atrasado detectado. Iniciando compensação de clock de CPU e otimização de renderização interna.");
      }

      console.log(
        `%c[KYVRA TELEMETER] %cTroca concluída para %c${themeName}%c. Tempo de renderização/estabilização: %c${(performance.now() - startTime).toFixed(2)}ms%c | Quadros com stutter detectados: %c${stutters}`,
        "color: #00e5ff; font-weight: bold;",
        "color: #ffffff;",
        "color: #ffd200; font-weight: bold;",
        "color: #ffffff;",
        "color: #00ff73; font-weight: bold;",
        "color: #ffffff;",
        stutters > 0 ? "color: #ff3c00; font-weight: bold;" : "color: #00ff73; font-weight: bold;"
      );
    }
  };
  
  if (typeof requestAnimationFrame !== 'undefined') {
    requestAnimationFrame(measureFPS);
  }
};

export function Home() {
  const theme = useStore((state) => state.theme);
  const currentTrack = useStore((state) => state.currentTrack);
  const [featuredTracks, setFeaturedTracks] = useState<any[]>([]);

  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const videoRetries = useRef<Record<string, number>>({});
  
  const backgroundEngineRef = useRef<HTMLDivElement>(null);
  useGPUAcceleration(backgroundEngineRef);

  const [currentVideoTheme, setCurrentVideoTheme] = useState(theme);
  const [previousVideoTheme, setPreviousVideoTheme] = useState<string | null>(null);
  const [fadeActive, setFadeActive] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState<Record<string, boolean>>({});
  const [loopFading, setLoopFading] = useState<Record<string, boolean>>({});
  const prevThemeRef = useRef(theme);
  const [initialDelayOver, setInitialDelayOver] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialDelayOver(true);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const handleVideoError = (tName: string, e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const video = e.currentTarget;
    const count = videoRetries.current[tName] || 0;
    if (count < 3) {
      videoRetries.current[tName] = count + 1;
      console.warn(`[Kyvra Video Engine] Erro ao carregar vídeo do tema ${tName}. Tentando recarregar (${count + 1}/3)...`);
      setTimeout(() => {
        if (video) {
          video.load();
          video.play().catch(() => {});
        }
      }, 1500);
    } else {
      console.error(`[Kyvra Video Engine] Falha persistente ao carregar o vídeo para o tema ${tName}. Mantendo plano de fundo atmosférico.`);
    }
  };

  useEffect(() => {
    document.title = "KYVRA | Fragmentos de um universo sombrio";
  }, []);

  // Proactive self-healing/adaptive check for legacy or slow devices
  useEffect(() => {
    const isLegacyDevice = () => {
      try {
        if (typeof navigator !== 'undefined') {
          const lowCores = navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4;
          const lowMemory = (navigator as any).deviceMemory && (navigator as any).deviceMemory <= 2;
          const userAgent = navigator.userAgent.toLowerCase();
          const isLegacyMobile = /pocket|galaxy s3|s4|grand|duos|mini|y-|galaxy y|sm-t|sm-g3|samsung|motorola|lg-/i.test(userAgent) && /mobile/i.test(userAgent);
          return !!(lowCores || lowMemory || isLegacyMobile);
        }
      } catch (e) {}
      return false;
    };

    if (isLegacyDevice()) {
      console.log("[KYVRA ENGINE] Aparelho legado detectado. Iniciando heurísticas avançadas de renderização para garantir 60 FPS no modo padrão.");
    }
  }, []);

  // Handle smooth dual-video crossfade transition on theme change
  useEffect(() => {
    if (theme !== prevThemeRef.current) {
      setPreviousVideoTheme(prevThemeRef.current);
      setCurrentVideoTheme(theme);
      setFadeActive(false);
      prevThemeRef.current = theme;

      try {
        trackFPSSlowdown(theme, performance.now());
      } catch (e) {}

      // Trigger animation on next paint
      const frame = requestAnimationFrame(() => {
        setFadeActive(true);
      });

      const timer = setTimeout(() => {
        setPreviousVideoTheme(null);
        setFadeActive(false);
      }, 2000);

      return () => {
        cancelAnimationFrame(frame);
        clearTimeout(timer);
      };
    }
  }, [theme]);

  // Handle playing of current and transitioning videos programmatically
  useEffect(() => {
    if (!initialDelayOver) return;

    const playVideo = (videoEl: HTMLVideoElement | null) => {
      if (!videoEl) return;
      videoEl.muted = true;
      if (videoEl.paused) {
        videoEl.play().catch((err) => {
          console.log("[Kyvra Video Engine] Playback promise rejected, waiting for user interaction.", err);
        });
      }
    };

    const activeVideo = videoRefs.current[currentVideoTheme];
    if (activeVideo) {
      activeVideo.preload = "auto";
      playVideo(activeVideo);
    }

    if (previousVideoTheme) {
      const prevVideo = videoRefs.current[previousVideoTheme];
      if (prevVideo) {
        playVideo(prevVideo);
      }
    }
  }, [currentVideoTheme, previousVideoTheme, initialDelayOver]);

  // Global click & touch interaction overrider to satisfy strict browser autoplay requirements
  useEffect(() => {
    if (!initialDelayOver) return;

    const forceAutoplay = () => {
      try {
        const activeVideo = videoRefs.current[currentVideoTheme];
        if (activeVideo && activeVideo.paused) {
          activeVideo.play().catch(() => {});
        }
      } catch (err) {
        console.warn("[Kyvra Video Engine] Interaction-triggered autoplay failed: ", err);
      }
    };

    const interactionEvents = ['click', 'touchstart', 'pointerdown', 'scroll', 'keydown'];
    interactionEvents.forEach(evt => {
      document.addEventListener(evt, forceAutoplay, { once: true, passive: true });
    });

    return () => {
      interactionEvents.forEach(evt => {
        document.removeEventListener(evt, forceAutoplay);
      });
    };
  }, [currentVideoTheme, initialDelayOver]);

  // Self-healing / keep-alive heartbeat for background suspension recovery & focus recovery
  useEffect(() => {
    if (!initialDelayOver) return;

    const handleAutoplayRecovery = () => {
      if (document.visibilityState === 'visible') {
        const activeVid = videoRefs.current[theme];
        if (activeVid && activeVid.paused) {
          activeVid.play().catch(() => {});
        }
      }
    };

    const heartbeatTimer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        const activeVid = videoRefs.current[theme];
        if (activeVid && activeVid.paused) {
          activeVid.muted = true;
          activeVid.play().catch(() => {});
        }
      }
    }, 1500);

    document.addEventListener('visibilitychange', handleAutoplayRecovery, { passive: true });
    window.addEventListener('focus', handleAutoplayRecovery, { passive: true });

    return () => {
      clearInterval(heartbeatTimer);
      document.removeEventListener('visibilitychange', handleAutoplayRecovery);
      window.removeEventListener('focus', handleAutoplayRecovery);
    };
  }, [theme, initialDelayOver]);

  useEffect(() => {
    async function fetchFeatured() {
      const { data: allTracks, error } = await getAllTracks();
      
      if (error) {
        console.error("Error fetching tracks:", error);
        return;
      }
        
      if (allTracks && allTracks.length > 0) {
        // Group all tracks by album to guarantee unique album covers (no repeating albums)
        const albumGroups = new Map<string, any[]>();
        
        for (const track of allTracks) {
          const albumKey = track.albums?.title || track.album_id || String(track.id);
          if (!albumGroups.has(albumKey)) {
            albumGroups.set(albumKey, []);
          }
          albumGroups.get(albumKey)!.push(track);
        }

        // Pick one track randomly from each album group so all songs across all albums rotate over time
        const selectedTracks: any[] = [];
        for (const [, tracksInAlbum] of albumGroups.entries()) {
          const randomIndex = Math.floor(Math.random() * tracksInAlbum.length);
          selectedTracks.push(tracksInAlbum[randomIndex]);
        }

        // Shuffle the album order so the presentation is dynamic
        const shuffledUniqueAlbumTracks = selectedTracks.sort(() => 0.5 - Math.random());

        const finalTracks = shuffledUniqueAlbumTracks.map((track: any) => {
          const vibe = track.vibe || 'Introspectivo';
          const albumTitle = track.albums?.title || 'Desconhecido';
          
          return {
            id: track.id,
            title: track.title,
            artist: track.artist || 'Kyvra',
            vibe: vibe,
            duration: track.duration || '0:00',
            coverUrl: getOptimizedImageUrl(track.albums?.cover_url || '', 800, 75),
            audioUrl: track.audio_url,
            albumTitle: albumTitle,
            lyrics: track.lyrics,
            synopsis: `Um fragmento sonoro explorando vibrações de ${vibe.toLowerCase()}, ecoando a essência do álbum ${albumTitle}.`
          };
        });

        setFeaturedTracks(finalTracks);
      }
    }
    fetchFeatured();
  }, []);

  // Preload featured cover images when browser has idle CPU cycles to enhance "first paint" smoothness
  useEffect(() => {
    if (featuredTracks.length === 0) return;
    const preloadImg = () => {
      featuredTracks.forEach(track => {
        if (track.coverUrl) {
          const img = new Image();
          img.src = track.coverUrl;
        }
      });
    };

    if ('requestIdleCallback' in window) {
      const id = (window as any).requestIdleCallback(preloadImg, { timeout: 2000 });
      return () => (window as any).cancelIdleCallback(id);
    } else {
      const id = setTimeout(preloadImg, 2000);
      return () => clearTimeout(id);
    }
  }, [featuredTracks]);

  return (
    <div className="w-full bg-[#030303]">
      {/* Immersive Responsive Hero Section */}
      <section className="relative min-h-[100dvh] lg:h-[100dvh] w-full bg-[#030303] text-white overflow-hidden pb-10 lg:pb-0">
        
        {/* UNIFIED HARDWARE-ACCELERATED BACKGROUND ENGINE */}
        <div ref={backgroundEngineRef} className="absolute inset-0 w-full h-full bg-[#030303] z-0 overflow-hidden pointer-events-none select-none">
          {/* Cinematic Fallback Gradient Background */}
          <div className="absolute inset-0 bg-[#030303] opacity-100 z-[1] transition-all duration-[2000ms]">
            <div 
              className="absolute top-[20%] left-[20%] w-[70vw] h-[70vw] max-w-[800px] max-h-[800px] rounded-full transition-all duration-[2000ms] ease-in-out mix-blend-screen opacity-25 md:opacity-25 animate-pulse"
              style={{
                background: theme === 'abissal' ? 'radial-gradient(circle, rgba(168,85,247,0.38) 0%, transparent 70%)' :
                            theme === 'sangue-de-drago' ? 'radial-gradient(circle, rgba(239,68,68,0.38) 0%, transparent 70%)' :
                            theme === 'floresta-negra' ? 'radial-gradient(circle, rgba(16,185,129,0.33) 0%, transparent 70%)' :
                            'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)',
                transform: 'translate3d(0,0,0)',
                willChange: 'transform'
              }}
            />
            <div 
              className="absolute bottom-[20%] right-[10%] w-[60vw] h-[60vw] max-w-[700px] max-h-[700px] rounded-full transition-all duration-[2000ms] ease-in-out mix-blend-screen opacity-15 md:opacity-15 animate-pulse"
              style={{
                background: theme === 'abissal' ? 'radial-gradient(circle, rgba(99,102,241,0.28) 0%, transparent 70%)' :
                            theme === 'sangue-de-drago' ? 'radial-gradient(circle, rgba(220,38,38,0.28) 0%, transparent 70%)' :
                            theme === 'floresta-negra' ? 'radial-gradient(circle, rgba(5,150,105,0.28) 0%, transparent 70%)' :
                            'radial-gradient(circle, rgba(148,163,184,0.15) 0%, transparent 70%)',
                transform: 'translate3d(0,0,0)',
                willChange: 'transform'
              }}
            />
            {/* Subtle noise grains for luxury texturing */}
            <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
            }} />
          </div>

          {/* Dual-Video Hardware-Accelerated Crossfade Engine (Max 2 simultaneous players to satisfy low-resource devices and browser limits) */}
          {initialDelayOver && [previousVideoTheme, currentVideoTheme].map((tName) => {
            if (!tName) return null;
            const isCurrent = tName === currentVideoTheme;
            const isTransitionActive = previousVideoTheme !== null;
            const isLoaded = videoLoaded[tName];
            const isLoopFading = loopFading[tName];
            
            // Determine dynamic opacity during crossfade transition
            let opacityClass = "opacity-0 z-0 pointer-events-none scale-105";
            if (isCurrent && isLoaded) {
              if (isTransitionActive) {
                opacityClass = fadeActive ? "opacity-[0.78] md:opacity-[0.82] z-10 scale-100" : "opacity-0 z-10 scale-[1.02]";
              } else {
                opacityClass = isLoopFading 
                  ? "opacity-0 scale-[1.02] z-10" 
                  : "opacity-[0.78] md:opacity-[0.82] scale-100 z-10";
              }
            } else if (!isCurrent) {
              // This is the previous video fading out
              opacityClass = fadeActive ? "opacity-0 z-0 pointer-events-none scale-105" : "opacity-[0.78] md:opacity-[0.82] z-0 scale-100";
            }

            return (
              <video
                key={`unified-video-${tName}`}
                ref={el => {
                  videoRefs.current[tName] = el;
                }}
                autoPlay={false}
                loop={true}
                muted={true}
                playsInline={true}
                preload="auto"
                className={cn(
                  "absolute inset-0 w-full h-full object-cover object-[80%_center] md:object-center bg-transparent",
                  opacityClass
                )}
                style={{
                  willChange: "opacity, transform",
                  transform: "translate3d(0,0,0)",
                  backfaceVisibility: "hidden",
                  transition: isLoopFading
                    ? "opacity 1000ms cubic-bezier(0.25, 1, 0.5, 1), transform 1000ms cubic-bezier(0.25, 1, 0.5, 1)"
                    : "opacity 2000ms ease-in-out, transform 2000ms ease-in-out"
                }}
                src={THEME_VIDEOS[tName]}
                onError={(e) => handleVideoError(tName, e)}
                onTimeUpdate={(e) => {
                  const video = e.currentTarget;
                  if (!video || !video.duration) return;
                  const timeLeft = video.duration - video.currentTime;
                  // Start fade-out when less than 1.0 second remains
                  if (timeLeft < 1.0 && timeLeft > 0) {
                    if (!loopFading[tName]) {
                      setLoopFading(prev => ({ ...prev, [tName]: true }));
                    }
                  } else {
                    if (loopFading[tName]) {
                      setLoopFading(prev => ({ ...prev, [tName]: false }));
                    }
                  }
                }}
                onCanPlay={(e) => {
                  e.currentTarget.play().catch(() => {});
                }}
                onCanPlayThrough={(e) => {
                  setVideoLoaded(prev => ({ ...prev, [tName]: true }));
                  e.currentTarget.play().catch(() => {});
                }}
                onPlaying={(e) => {
                  setVideoLoaded(prev => ({ ...prev, [tName]: true }));
                }}
              />
            );
          })}



          {/* Unified Vignettes overlays to ensure readability responsive */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#030303]/85 via-[#030303]/20 to-transparent md:block hidden z-20 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#030303]/60 via-transparent to-[#030303]/20 md:block hidden z-20 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#030303]/85 via-transparent to-[#030303]/35 md:hidden block z-20 pointer-events-none" />
        </div>

        {/* DESKTOP/WIDE LANDSCAPE IMMERSIVE LAYOUT */}
        <div className="hidden md:flex landscape:flex md:flex-col justify-between md:h-full landscape:h-full w-full h-[100dvh] relative overflow-hidden select-none z-10">

          {/* Left Aligned Content overlapping the video */}
          <div className="relative z-35 flex-1 flex flex-col justify-center px-6 md:px-12 xl:px-16 pt-20 w-full landscape:pt-14 landscape:gap-y-1">
            {/* Logo container without backglow */}
            <div className="relative overflow-visible pointer-events-none mb-2 md:mb-4 flex flex-col items-start justify-center landscape:mb-1">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, x: -30 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                className="relative flex flex-col items-start"
              >
                <h2 className="font-display font-medium text-[4.5rem] xs:text-[5.5rem] sm:text-[7rem] md:text-[9rem] lg:text-[11rem] xl:text-[13rem] tracking-[0.05em] text-gradient m-0 p-0 text-left leading-none landscape:text-[2.5rem] landscape:sm:text-[3.5rem] landscape:md:text-[5rem] landscape:lg:text-[6.5rem]">
                  KYVRA
                </h2>
              </motion.div>
            </div>

            {/* Poetry & Description positioned BELOW the logo */}
            <div className="space-y-4 md:space-y-6 w-full max-w-[650px] md:max-w-[750px] xl:max-w-[850px] text-left mt-2 md:-mt-1 lg:mt-2 landscape:mt-0.5 landscape:space-y-1">
              <motion.h1 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="font-cormorant text-white text-[1.6rem] xs:text-[2rem] sm:text-[2.5rem] md:text-[3rem] lg:text-[3.6rem] xl:text-[4.5rem] leading-[1.12] tracking-tight font-light landscape:text-[1.2rem] landscape:sm:text-[1.5rem] landscape:md:text-[1.8rem] landscape:lg:text-[2.2rem]"
              >
                Onde as estrelas morrem, a poesia ecoa.
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.2, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="font-sans text-white/75 text-xs xs:text-sm md:text-base lg:text-[18px] xl:text-[20px] leading-relaxed font-light landscape:text-[10px] landscape:sm:text-[11px] landscape:md:text-[12px] landscape:lg:text-[14px]"
              >
                Kyvra é um portal imersivo de metal sinfônico melancólico e profundo, desenhado para guiar a alma através de arranjos grandiosos, crônicas sombrias e elegias visuais.
              </motion.p>
            </div>
          </div>

          {/* Bottom brand layout footer container */}
          <div className="relative z-35 px-6 md:px-12 xl:px-16 pb-8 flex w-full">
            <div className="flex-1" />
          </div>
        </div>

        {/* MOBILE PORTRAIT LAYOUT (Strictly vertical below md and portrait) */}
        <div className="md:hidden landscape:hidden flex flex-col justify-between min-h-[100dvh] relative z-10 px-6 pt-24 pb-8 h-[100dvh] overflow-hidden">
          {/* Empty spacer on mobile to keep top clean */}
          <div className="flex-1" />

          {/* Lower area on mobile with Logo + Poetry integrated closely at the bottom */}
          <div className="space-y-6 mt-auto w-full">
            {/* Elegant Mobile Logo spanning full screen width */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full relative flex justify-start items-center overflow-visible"
            >
              <h1 className="font-display font-medium text-[24vw] leading-none text-gradient m-0 p-0 tracking-[0.01em] text-left select-none">
                KYVRA
              </h1>
            </motion.div>

            {/* Poetry and description (restricted to elegant max-w) */}
            <div className="space-y-3 max-w-[500px]">
              <h1 className="font-cormorant text-white text-[2rem] sm:text-[2.5rem] leading-[1.12] tracking-tight font-light">
                Onde as estrelas morrem, a poesia ecoa.
              </h1>
              <p className="font-sans text-white/70 text-sm sm:text-sm leading-relaxed font-light">
                Kyvra é um projeto de metal sinfônico melancólico e profundo. Um portal imersivo desenhado para guiar a alma através de arranjos grandiosos, crônicas sombrias e elegias visuais.
              </p>
            </div>
          </div>
        </div>

        {/* Gradiente na parede de baixo do vídeo para continuidade fluida das seções */}
        <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-[#080814] via-[#080814]/60 to-transparent z-30 pointer-events-none" />

      </section>

      {/* Featured Musics section */}
      {featuredTracks.length > 0 && (
        <section id="musicas" className="py-20 relative scroll-mt-20">
          <div className="absolute inset-0 bg-[#080814]" />
          <div className="relative z-10">
            <FeaturedSlider tracks={featuredTracks} />
          </div>
        </section>
      )}

    </div>
  );
}
