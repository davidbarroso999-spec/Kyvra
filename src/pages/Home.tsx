import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { BookOpen, Music2, Disc3 } from 'lucide-react';
import { getAllTracks } from '@/lib/apiCache';
import { useStore } from '@/store/useStore';
import { FeaturedSlider } from '@/components/ui/FeaturedSlider';
import TextBlockAnimation from '@/components/ui/text-block-animation';
import { LampContainer } from '@/components/ui/lamp';
import { cn, getOptimizedImageUrl, getOfflineUrl } from '@/lib/utils';
import { useIdleCallback, useGPUAcceleration } from '@/modules/performance-optimization';


const THEME_VIDEOS: Record<string, string> = {
  abissal: "https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/HEROVIDEO/YouCut_abissal.webm",
  'sangue-de-drago': "https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/HEROVIDEO/YouCut_sanguededrago.webm",
  'floresta-negra': "https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/HEROVIDEO/YouCut_florestanegra.webm",
  'monolito': "https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/HEROVIDEO/YouCut_monolito.webm"
};
const PSYCHOLOGICAL_ARC = [
  {
    title: 'Fascínio',
    text: 'O amor aparece como uma promessa sobrenatural, ainda distante o bastante para ser idealizada.',
    accent: 'var(--primary)',
  },
  {
    title: 'Entrega',
    text: 'A fronteira se desfaz. O eu lírico mergulha por inteiro e começa a perder o próprio contorno.',
    accent: 'var(--accent)',
  },
  {
    title: 'Obsessão',
    text: 'O vínculo vira necessidade: desejo, ciúme e dependência passam a respirar no mesmo ritmo.',
    accent: 'var(--secondary)',
  },
  {
    title: 'Ruína',
    text: 'A destruição deixa de ser acidente. O abismo é reconhecido e escolhido no lugar do vazio.',
    accent: 'var(--primary)',
  },
  {
    title: 'Consciência',
    text: 'A dor é compreendida sem arrependimento. O fim deixa de ser queda e se torna linguagem.',
    accent: 'var(--accent)',
  },
];

const PORTAL_PATHS = [
  {
    path: '/cosmogonia',
    label: 'Lore',
    description: 'Atravesse os capítulos.',
    icon: BookOpen,
  },
  {
    path: '/arquivo',
    label: 'Músicas',
    description: 'Entre nos fragmentos.',
    icon: Music2,
  },
  {
    path: '/reliquias',
    label: 'Álbuns',
    description: 'Descubra as relíquias.',
    icon: Disc3,
  },
];

const PORTAL_PHRASES = [
  'Toda queda tem origem.',
  'Dê forma ao silêncio.',
  'Relíquias além do tempo.',
  'O menu guarda o restante.',
];


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

function PsychologicalArc() {
  return (
    <section className="relative overflow-hidden border-y border-white/[0.06] bg-[#05050b] py-16 sm:py-24 lg:py-28">
      <div className="pointer-events-none absolute inset-0 opacity-40" style={{ background: 'radial-gradient(circle at 50% 0%, var(--glow-purple), transparent 42%)' }} />
      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 md:px-12 xl:px-16">
        <div className="mx-auto max-w-2xl text-center">
          <span className="font-mono text-[10px] uppercase tracking-[0.38em] text-primary/80">
            A arquitetura da queda
          </span>
          <h2 className="mt-4 font-display text-3xl font-normal leading-tight text-text-high sm:text-5xl">
            O arco psicológico
          </h2>
        </div>

        <div className="relative mt-12 grid gap-8 sm:mt-16 md:grid-cols-5 md:gap-0">
          <div className="absolute left-[8%] right-[8%] top-5 hidden h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent md:block" />
          {PSYCHOLOGICAL_ARC.map((stage, index) => (
            <motion.article
              key={stage.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.45, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
              className="group relative flex flex-col items-center border-l border-white/10 pl-5 text-center md:block md:border-l-0 md:px-4"
            >
              <div className="relative z-10 mx-auto h-px w-10 bg-white/20 transition-colors duration-300 group-hover:bg-primary" />
              <div className="pt-5">
                <TextBlockAnimation
                  blockColor="rgba(255,255,255,0.07)"
                  delay={index * 0.06}
                  stagger={0.05}
                  duration={0.52}
                >
                  <h3 className="font-display text-lg text-text-high transition-colors duration-300 group-hover:text-primary sm:text-xl">
                    {stage.title}
                  </h3>
                </TextBlockAnimation>
                <TextBlockAnimation
                  blockColor="rgba(255,255,255,0.045)"
                  delay={index * 0.06 + 0.08}
                  stagger={0.035}
                  duration={0.48}
                >
                  <p className="mx-auto mt-2 max-w-[220px] font-sans text-xs leading-relaxed text-text-low transition-colors duration-300 group-hover:text-text-mid">
                    {stage.text}
                  </p>
                </TextBlockAnimation>
              </div>
            </motion.article>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="mt-12 flex items-center gap-4 sm:mt-16"
        >
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
          <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-text-low">
            nenhuma queda acontece de uma vez
          </span>
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
        </motion.div>
      </div>
    </section>
  );
}

export function Home() {
  const theme = useStore((state) => state.theme);
  const currentTrack = useStore((state) => state.currentTrack);
  const [featuredTracks, setFeaturedTracks] = useState<any[]>([]);

  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const videoRetries = useRef<Record<string, number>>({});
  
  const backgroundEngineRef = useRef<HTMLDivElement>(null);
  useGPUAcceleration(backgroundEngineRef);

  const [themeVideoUrls, setThemeVideoUrls] = useState<Record<string, string>>(THEME_VIDEOS);

  // Resolve para o Blob do Cache local se os vídeos foram salvos offline
  useEffect(() => {
    let isCurrent = true;
    const resolveOfflineVideos = async () => {
      const resolved: Record<string, string> = { ...THEME_VIDEOS };
      for (const [key, remoteUrl] of Object.entries(THEME_VIDEOS)) {
        try {
          const offlineUrl = await getOfflineUrl(remoteUrl);
          if (isCurrent && offlineUrl) {
            resolved[key] = offlineUrl;
          }
        } catch (e) {}
      }
      if (isCurrent) {
        setThemeVideoUrls(resolved);
      }
    };
    resolveOfflineVideos();
    return () => {
      isCurrent = false;
    };
  }, []);

  const [currentVideoTheme, setCurrentVideoTheme] = useState(theme);
  const [previousVideoTheme, setPreviousVideoTheme] = useState<string | null>(null);
  const [fadeActive, setFadeActive] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState<Record<string, boolean>>({});
  const [loopFading, setLoopFading] = useState<Record<string, boolean>>({});
  const prevThemeRef = useRef(theme);
  const [initialDelayOver, setInitialDelayOver] = useState(true);

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
          activeVid.muted = true;
          activeVid.play().catch(() => {});
        }
      }
    };

    document.addEventListener('visibilitychange', handleAutoplayRecovery, { passive: true });
    window.addEventListener('focus', handleAutoplayRecovery, { passive: true });

    return () => {
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
          {/* Clean Modern Solid Dark Canvas */}
          <div className="absolute inset-0 bg-[#030303] opacity-100 z-[1] transition-colors duration-700" />

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
                src={themeVideoUrls[tName] || THEME_VIDEOS[tName]}
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
        <section id="musicas" className="relative scroll-mt-20 py-20">
          <div className="absolute inset-0 bg-[#080814]" />
          <div className="relative z-10">
            <FeaturedSlider tracks={featuredTracks} />
          </div>
        </section>
      )}

      {/* Psychological arc section */}
      <PsychologicalArc />

      {/* Three portal paths section */}
      <section className="relative overflow-hidden border-b border-white/[0.06] bg-[#030307] py-24 sm:py-32 lg:py-40">
        <div className="pointer-events-none absolute inset-0 opacity-30" style={{ background: 'radial-gradient(circle at 50% 100%, var(--glow-blue), transparent 38%)' }} />
        <div className="relative z-10 mx-auto w-full max-w-6xl px-6 md:px-12 xl:px-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto max-w-2xl text-center"
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.38em] text-primary/80">
              Portais de entrada
            </span>
            <h2 className="mt-4 font-display text-3xl font-normal leading-tight text-text-high sm:text-5xl">
              O universo se divide em três caminhos
            </h2>
          </motion.div>

          <div className="relative mt-12 sm:mt-24">
            <div className="pointer-events-none absolute left-[16.666%] right-[16.666%] top-6 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent sm:top-10" />
            <div className="grid grid-cols-3 gap-2 sm:gap-5 md:gap-8">
              {PORTAL_PATHS.map((portal, index) => {
                const Icon = portal.icon;
                return (
                  <motion.div
                    key={portal.path}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.65, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
                    className="relative z-10"
                  >
                    <Link
                      to={portal.path}
                      className="group flex min-w-0 flex-col items-center text-center"
                    >
                      <span className="relative flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-[#030307]/90 text-text-mid backdrop-blur-sm transition-all duration-500 group-hover:border-primary/60 group-hover:bg-primary/[0.08] group-hover:text-primary group-hover:shadow-[0_0_22px_var(--glow-purple)] sm:h-20 sm:w-20 sm:shadow-[0_0_28px_var(--glow-purple)]">
                        <Icon className="h-5 w-5 stroke-[1.2] sm:h-7 sm:w-7" aria-hidden="true" />
                      </span>
                      <span className="mt-4 font-mono text-[8px] uppercase tracking-[0.16em] text-text-low transition-colors duration-300 group-hover:text-primary sm:mt-7 sm:text-[10px] sm:tracking-[0.35em]">
                        {portal.label}
                      </span>
                      <p className="mt-2 max-w-[110px] font-sans text-[10px] leading-snug text-text-low transition-colors duration-300 group-hover:text-text-mid sm:mt-3 sm:max-w-[250px] sm:text-xs sm:leading-relaxed">
                        {portal.description}
                      </p>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="mt-14 grid grid-cols-2 gap-x-4 gap-y-5 border-y border-white/[0.08] py-8 sm:mt-24 sm:grid-cols-4 sm:gap-6 sm:py-10">
            {PORTAL_PHRASES.map((phrase, index) => (
              <motion.p
                key={phrase}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                className="text-center font-cormorant text-[15px] leading-tight text-text-mid transition-colors duration-300 hover:text-primary sm:text-xl"
              >
                {phrase}
              </motion.p>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
