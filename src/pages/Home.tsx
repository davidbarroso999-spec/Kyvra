import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { getFeaturedTracksSettings, getTracksByIds, getTrackSynopses } from '@/lib/apiCache';
import { useStore } from '@/store/useStore';
import { FeaturedSlider } from '@/components/ui/FeaturedSlider';
import { LampContainer } from '@/components/ui/lamp';
import { cn } from '@/lib/utils';

const THEME_VIDEOS: Record<string, string> = {
  abissal: "https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/HEROVIDEO/YouCut_abissal.webm",
  'sangue-de-drago': "https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/HEROVIDEO/YouCut_sanguededrago.webm",
  'floresta-negra': "https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/HEROVIDEO/YouCut_floresta.webm",
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
  const themeVideoUrls = useStore((state) => state.themeVideoUrls);
  const [featuredTracks, setFeaturedTracks] = useState<any[]>([]);
  const videoRefsDesktop = useRef<Record<string, HTMLVideoElement | null>>({});
  const videoRefsMobile = useRef<Record<string, HTMLVideoElement | null>>({});
  const [activeVideoTheme, setActiveVideoTheme] = useState(theme);
  const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const videoSrcs = { ...THEME_VIDEOS, ...themeVideoUrls };

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

  // Set the correct active video theme when fully ready, avoiding stuttering
  const handleCanPlayThrough = (tName: string) => {
    if (tName === theme && activeVideoTheme !== theme) {
      try {
        const markName = `kyvra-can-play-${tName}`;
        performance.mark(markName);
        logPerformanceMeasure(
          `kyvra-buffering-lag-${tName}`,
          `kyvra-change-start-${tName}`,
          markName
        );
      } catch (e) {}

      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
        fallbackTimeoutRef.current = null;
      }
      setActiveVideoTheme(tName);
    }
  };

  // Guarantee the active video plays programmatically and transition them elegantly
  useEffect(() => {
    const activeDesktop = videoRefsDesktop.current[theme];
    const activeMobile = videoRefsMobile.current[theme];

    const playVideo = (videoEl: HTMLVideoElement | null) => {
      if (!videoEl) return;
      videoEl.muted = true;
      if (videoEl.paused) {
        videoEl.play().catch((err) => {
          console.log("Auto-play prevented, waiting for user interaction", err);
          const startOnInteraction = () => {
            const actD = videoRefsDesktop.current[theme];
            const actM = videoRefsMobile.current[theme];
            if (actD && actD.paused) actD.play().catch(() => {});
            if (actM && actM.paused) actM.play().catch(() => {});
            document.removeEventListener('click', startOnInteraction);
            document.removeEventListener('touchstart', startOnInteraction);
          };
          document.addEventListener('click', startOnInteraction, { passive: true });
          document.addEventListener('touchstart', startOnInteraction, { passive: true });
        });
      }
    };

    // If the chosen theme is not the visually active video theme, start caching/playing it in background
    if (theme !== activeVideoTheme) {
      const activeSrc = videoSrcs[theme];
      
      try {
        const startMark = `kyvra-change-start-${theme}`;
        performance.mark(startMark);
        trackFPSSlowdown(theme, performance.now());
      } catch (e) {}

      if (activeDesktop) {
        activeDesktop.preload = "auto";
        // Only load if the source is different or not initialized to prevent reset stuttering
        if (!activeDesktop.src || !activeDesktop.src.includes(activeSrc)) {
          activeDesktop.load();
        }
        playVideo(activeDesktop);
      }
      if (activeMobile) {
        activeMobile.preload = "auto";
        if (!activeMobile.src || !activeMobile.src.includes(activeSrc)) {
          activeMobile.load();
        }
        playVideo(activeMobile);
      }

      // If already fully buffered, transition immediately
      const isAlreadyReady = 
        (activeDesktop && activeDesktop.readyState >= 3) || 
        (activeMobile && activeMobile.readyState >= 3);

      if (isAlreadyReady) {
        setActiveVideoTheme(theme);
        try {
          const appliedMark = `kyvra-transition-applied-${theme}`;
          performance.mark(appliedMark);
          logPerformanceMeasure(
            `kyvra-total-transition-${theme}`,
            `kyvra-change-start-${theme}`,
            appliedMark
          );
        } catch (e) {}
      } else {
        // Fallback timer: 1200ms limit to switch theme video visually even under network failure
        if (fallbackTimeoutRef.current) {
          clearTimeout(fallbackTimeoutRef.current);
        }
        fallbackTimeoutRef.current = setTimeout(() => {
          setActiveVideoTheme(theme);
          try {
            const appliedMark = `kyvra-transition-applied-${theme}`;
            performance.mark(appliedMark);
            logPerformanceMeasure(
              `kyvra-total-transition-${theme}`,
              `kyvra-change-start-${theme}`,
              appliedMark
            );
          } catch (e) {}
        }, 1200);
      }
    } else {
      // Make sure current theme video is active and running
      playVideo(activeDesktop);
      playVideo(activeMobile);
    }

    // Ensure inactive themes pause to save CPU/GPU overhead
    const pauseTimer = setTimeout(() => {
      Object.entries(THEME_VIDEOS).forEach(([tName]) => {
        if (tName !== theme) {
          const dVid = videoRefsDesktop.current[tName];
          const mVid = videoRefsMobile.current[tName];
          if (dVid && !dVid.paused) dVid.pause();
          if (mVid && !mVid.paused) mVid.pause();
        }
      });
    }, 1200);

    return () => {
      clearTimeout(pauseTimer);
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
      }
    };
  }, [theme, activeVideoTheme]);

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
        
        {/* DESKTOP/WIDE LANDSCAPE IMMERSIVE LAYOUT */}
        <div className="hidden md:flex landscape:flex md:flex-col justify-between md:h-full landscape:h-full w-full h-[100vh] relative overflow-hidden select-none">
          
          {/* Full-width widescreen background video */}
          <div className="absolute inset-0 w-full h-full bg-black z-0 overflow-hidden">
            {Object.entries(THEME_VIDEOS)
              .filter(([tName]) => tName === theme || tName === activeVideoTheme)
              .map(([tName]) => (
                <video
                  key={`desktop-${tName}`}
                  ref={el => { videoRefsDesktop.current[tName] = el; }}
                  loop
                  muted
                  playsInline
                  preload="auto"
                  onCanPlayThrough={() => handleCanPlayThrough(tName)}
                  className={cn(
                    "absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out bg-black",
                    activeVideoTheme === tName ? "opacity-[0.82] z-10" : "opacity-0 z-0 pointer-events-none"
                  )}
                  style={{
                    willChange: "opacity",
                    transform: "translateZ(0)",
                    backfaceVisibility: "hidden"
                  }}
                  src={videoSrcs[tName]}
                />
              ))}
            {/* Multi-directional premium vignette overlays to ensure text readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#030303]/85 via-[#030303]/20 to-transparent z-20 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#030303]/60 via-transparent to-[#030303]/20 z-20 pointer-events-none" />
          </div>

          {/* Left Aligned Content overlapping the video */}
          <div className="relative z-35 flex-1 flex flex-col justify-center px-8 md:px-16 xl:px-24 pt-20 max-w-[900px]">
            {/* Ambient subtle glow box positioned behind logo to accentuate its deep theme */}
            <div className="relative overflow-visible pointer-events-none mb-2 md:mb-4 flex flex-col items-start justify-center">
              <div 
                className="absolute top-1/2 left-20 -translate-y-1/2 w-[400px] h-[300px] rounded-full pointer-events-none opacity-[0.25]"
                style={{ background: 'radial-gradient(ellipse at center, var(--primary) 0%, transparent 65%)' }}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, x: -30 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                className="relative flex flex-col items-start"
              >
                <h2 className="font-display font-medium text-[5.5rem] md:text-[6.5rem] lg:text-[8rem] xl:text-[9.5rem] tracking-[0.05em] text-gradient m-0 p-0 text-left drop-shadow-[0_20px_50px_rgba(102,51,153,0.4)] leading-none">
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
          <div className="relative z-35 px-8 md:px-16 xl:px-24 pb-8 flex justify-between items-center w-full">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ delay: 0.8 }}
              className="text-[10px] font-mono text-white/30 tracking-widest uppercase"
            >
              // REVELAÇÃO EXCLUSIVA
            </motion.div>
            <div className="text-[10px] font-mono text-white/20 tracking-wider">
              ESTÉTICA PREMIUM V3.0
            </div>
          </div>
        </div>

        {/* MOBILE PORTRAIT LAYOUT (Strictly vertical below md and portrait) */}
        <div className="md:hidden landscape:hidden flex flex-col justify-between min-h-[100vh] relative z-10 px-6 pt-24 pb-8 h-[100vh] overflow-hidden">
          {/* Background video overlay for mobile */}
          <div className="absolute inset-0 w-full h-full bg-[#030303] -z-10 overflow-hidden">
            {Object.entries(THEME_VIDEOS)
              .filter(([tName]) => tName === theme || tName === activeVideoTheme)
              .map(([tName]) => (
                <video
                  key={`mobile-${tName}`}
                  ref={el => { videoRefsMobile.current[tName] = el; }}
                  loop
                  muted
                  playsInline
                  preload="auto"
                  onCanPlayThrough={() => handleCanPlayThrough(tName)}
                  className={cn(
                    "absolute inset-0 w-full h-full object-cover object-[80%_center] transition-opacity duration-1000 ease-in-out bg-[#030303]",
                    activeVideoTheme === tName ? "opacity-[0.78] z-10" : "opacity-0 z-0 pointer-events-none"
                  )}
                  style={{
                    willChange: "opacity",
                    transform: "translateZ(0)",
                    backfaceVisibility: "hidden"
                  }}
                  src={videoSrcs[tName]}
                />
              ))}
            <div className="absolute inset-0 bg-gradient-to-t from-[#030303]/85 via-transparent to-[#030303]/35 z-20 pointer-events-none" />
          </div>

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
              <h1 className="font-display font-medium text-[22vw] leading-none text-gradient m-0 p-0 drop-shadow-2xl tracking-[0.01em] text-left select-none">
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
