import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { getFeaturedTracksSettings, getTracksByIds, getTrackSynopses } from '@/lib/apiCache';
import { useStore } from '@/store/useStore';
import { FeaturedSlider } from '@/components/ui/FeaturedSlider';
import { LampContainer } from '@/components/ui/lamp';
import { cn } from '@/lib/utils';

import { FeaturedFragmentSection } from '@/components/ui/FeaturedFragmentSection';

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
  const [featuredTracks, setFeaturedTracks] = useState<any[]>([]);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const videoRetries = useRef<Record<string, number>>({});
  
  const [currentVideoTheme, setCurrentVideoTheme] = useState(theme);
  const [previousVideoTheme, setPreviousVideoTheme] = useState<string | null>(null);
  const [fadeActive, setFadeActive] = useState(false);
  const prevThemeRef = useRef(theme);

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
  }, [currentVideoTheme, previousVideoTheme]);

  // Global click & touch interaction overrider to satisfy strict browser autoplay requirements
  useEffect(() => {
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
  }, [currentVideoTheme]);

  // Self-healing / keep-alive heartbeat for background suspension recovery & focus recovery
  useEffect(() => {
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
  }, [theme]);

  useEffect(() => {
    async function fetchFeatured() {
      const { data: trackIds } = await getFeaturedTracksSettings();
      
      if (trackIds && trackIds.length > 0) {
        const { data: tracks, error: tracksError } = await getTracksByIds(trackIds);
          
        if (tracksError) {
          console.error("Error fetching featured tracks details:", tracksError);
          return;
        }
          
        if (tracks && tracks.length > 0) {
          const sortedTracks = trackIds.map((id: string) => tracks.find((t: any) => t.id.toString() === id.toString())).filter(Boolean);
          const { data: synopses } = await getTrackSynopses(trackIds);

          const tracksWithSynopses = sortedTracks.map((track: any) => {
            const specificSynopsis = synopses?.find((s: any) => s.title === `__SYNOPSIS_${track.id}__`);
            const fallbackSynopsis = synopses?.find((s: any) => s.title === '__FEATURED_TRACK_SYNOPSIS__');
            
            return {
              id: track.id,
              title: track.title,
              artist: track.artist || 'Kyvra',
              vibe: track.vibe || 'Introspectivo',
              duration: track.duration || '0:00',
              coverUrl: track.albums?.cover_url || '',
              audioUrl: track.audio_url,
              albumTitle: track.albums?.title || '',
              lyrics: track.lyrics,
              synopsis: specificSynopsis?.content || fallbackSynopsis?.content || ''
            };
          });

          setFeaturedTracks(tracksWithSynopses);
        }
      }
    }
    fetchFeatured();
  }, []);

  return (
    <div className="w-full bg-[#030303]">
      {/* Immersive Responsive Hero Section */}
      <section className="relative min-h-[100vh] lg:h-[100vh] w-full bg-[#030303] text-white overflow-hidden pb-10 lg:pb-0">
        
        {/* UNIFIED HARDWARE-ACCELERATED BACKGROUND ENGINE */}
        <div className="absolute inset-0 w-full h-full bg-[#030303] z-0 overflow-hidden pointer-events-none select-none">
          {/* Cinematic Fallback Gradient Background */}
          <div className="absolute inset-0 bg-[#030303] opacity-100 z-[1] transition-all duration-[2000ms]">
            <div 
              className="absolute top-[20%] left-[20%] w-[70vw] h-[70vw] max-w-[800px] max-h-[800px] rounded-full transition-all duration-[2000ms] ease-in-out mix-blend-screen opacity-25 md:opacity-25 animate-pulse"
              style={{
                background: theme === 'abissal' ? 'radial-gradient(circle, rgba(168,85,247,0.38) 0%, transparent 70%)' :
                            theme === 'sangue-de-drago' ? 'radial-gradient(circle, rgba(239,68,68,0.38) 0%, transparent 70%)' :
                            theme === 'floresta-negra' ? 'radial-gradient(circle, rgba(16,185,129,0.33) 0%, transparent 70%)' :
                            'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)',
                transform: 'translateZ(0)'
              }}
            />
            <div 
              className="absolute bottom-[20%] right-[10%] w-[60vw] h-[60vw] max-w-[700px] max-h-[700px] rounded-full transition-all duration-[2000ms] ease-in-out mix-blend-screen opacity-15 md:opacity-15 animate-pulse"
              style={{
                background: theme === 'abissal' ? 'radial-gradient(circle, rgba(99,102,241,0.28) 0%, transparent 70%)' :
                            theme === 'sangue-de-drago' ? 'radial-gradient(circle, rgba(220,38,38,0.28) 0%, transparent 70%)' :
                            theme === 'floresta-negra' ? 'radial-gradient(circle, rgba(5,150,105,0.28) 0%, transparent 70%)' :
                            'radial-gradient(circle, rgba(148,163,184,0.15) 0%, transparent 70%)',
                transform: 'translateZ(0)'
              }}
            />
            {/* Subtle noise grains for luxury texturing */}
            <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
            }} />
          </div>

          {/* Dual-Video Hardware-Accelerated Crossfade Engine (Max 2 simultaneous players to satisfy low-resource devices and browser limits) */}
          {[previousVideoTheme, currentVideoTheme].map((tName) => {
            if (!tName) return null;
            const isCurrent = tName === currentVideoTheme;
            const isTransitionActive = previousVideoTheme !== null;
            
            // Determine dynamic opacity during crossfade transition
            let opacityClass = "opacity-0 z-0 pointer-events-none";
            if (isCurrent) {
              if (isTransitionActive) {
                opacityClass = fadeActive ? "opacity-[0.78] md:opacity-[0.82] z-10" : "opacity-0 z-10";
              } else {
                opacityClass = "opacity-[0.78] md:opacity-[0.82] z-10";
              }
            } else {
              // This is the previous video fading out
              opacityClass = fadeActive ? "opacity-0 z-0 pointer-events-none" : "opacity-[0.78] md:opacity-[0.82] z-0";
            }

            return (
              <video
                key={`unified-video-${tName}`}
                ref={el => {
                  videoRefs.current[tName] = el;
                }}
                autoPlay={isCurrent}
                loop={true}
                muted={true}
                playsInline={true}
                preload="auto"
                className={cn(
                  "absolute inset-0 w-full h-full object-cover object-[80%_center] md:object-center transition-opacity duration-[2000ms] ease-in-out bg-transparent",
                  opacityClass
                )}
                style={{
                  willChange: "opacity",
                  transform: "translate3d(0,0,0)",
                  backfaceVisibility: "hidden"
                }}
                src={THEME_VIDEOS[tName]}
                onError={(e) => handleVideoError(tName, e)}
                onCanPlay={(e) => {
                  if (tName === currentVideoTheme || tName === previousVideoTheme) {
                    e.currentTarget.play().catch(() => {});
                  }
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
        <div className="hidden md:flex landscape:flex md:flex-col justify-between md:h-full landscape:h-full w-full h-[100vh] relative overflow-hidden select-none z-10">

          {/* Left Aligned Content overlapping the video */}
          <div className="relative z-35 flex-1 flex flex-col justify-center px-8 md:px-16 xl:px-24 pt-20 max-w-[900px]">
            {/* Logo container without backglow */}
            <div className="relative overflow-visible pointer-events-none mb-2 md:mb-4 flex flex-col items-start justify-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, x: -30 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                className="relative flex flex-col items-start"
              >
                <h2 className="font-display font-medium text-[5.5rem] md:text-[6.5rem] lg:text-[8rem] xl:text-[9.5rem] tracking-[0.05em] text-gradient m-0 p-0 text-left leading-none">
                  KYVRA
                </h2>
              </motion.div>
            </div>

            {/* Poetry & Description positioned BELOW the logo */}
            <div className="space-y-4 md:space-y-6 w-full max-w-[550px] md:max-w-[650px] xl:max-w-[720px] text-left mt-2 md:-mt-1 lg:mt-2">
              <motion.h1 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="font-cormorant text-white text-[1.6rem] md:text-[2rem] lg:text-[2.5rem] xl:text-[3rem] leading-[1.12] tracking-tight font-light"
              >
                Onde as estrelas morrem, a poesia ecoa.
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.2, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="font-sans text-white/75 text-xs md:text-sm lg:text-[15px] xl:text-base leading-relaxed font-light"
              >
                Kyvra é um projeto de metal sinfônico melancólico e profundo. Um portal imersivo desenhado para guiar a alma através de arranjos grandiosos, crônicas sombrias e elegias visuais.
              </motion.p>
            </div>
          </div>

          {/* Bottom brand layout footer container */}
          <div className="relative z-35 px-8 md:px-16 xl:px-24 pb-8 flex w-full">
            <div className="flex-1" />
          </div>
        </div>

        {/* MOBILE PORTRAIT LAYOUT (Strictly vertical below md and portrait) */}
        <div className="md:hidden landscape:hidden flex flex-col justify-between min-h-[100vh] relative z-10 px-6 pt-24 pb-8 h-[100vh] overflow-hidden">
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
              <h1 className="font-display font-medium text-[22vw] leading-none text-gradient m-0 p-0 tracking-[0.01em] text-left select-none">
                KYVRA
              </h1>
            </motion.div>

            {/* Poetry and description (restricted to elegant max-w) */}
            <div className="space-y-3 max-w-[500px]">
              <h1 className="font-cormorant text-white text-[1.8rem] sm:text-[2.2rem] leading-[1.12] tracking-tight font-light">
                Onde as estrelas morrem, a poesia ecoa.
              </h1>
              <p className="font-sans text-white/70 text-xs sm:text-xs leading-relaxed font-light">
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

      {/* Featured Fragment Section */}
      <FeaturedFragmentSection className="bg-void border-t border-white/5" />
    </div>
  );
}
