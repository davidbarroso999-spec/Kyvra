import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { getFeaturedTracksSettings, getTracksByIds, getTrackSynopses } from '@/lib/apiCache';
import { useStore } from '@/store/useStore';
import { FeaturedSlider } from '@/components/ui/FeaturedSlider';
import { LampContainer } from '@/components/ui/lamp';
import { cn } from '@/lib/utils';

const THEME_VIDEOS: Record<string, string> = {
  abissal: "https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/HEROVIDEO/YouCut_20260620_140915393.mp4",
  'sangue-de-drago': "https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/HEROVIDEO/YouCut_sanguededrago.mp4",
  'floresta-negra': "https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/HEROVIDEO/YouCut_floresta.mp4",
  'monolito': "https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/HEROVIDEO/YouCut_monolito.mp4"
};

export function Home() {
  const { theme } = useStore();
  const [featuredTracks, setFeaturedTracks] = useState<any[]>([]);
  const videoRefsDesktop = useRef<Record<string, HTMLVideoElement | null>>({});
  const videoRefsMobile = useRef<Record<string, HTMLVideoElement | null>>({});
  const [activeVideoTheme, setActiveVideoTheme] = useState(theme);
  const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    document.title = "Kyvra — Portal Oficial";
  }, []);

  // Set the correct active video theme when fully ready, avoiding stuttering
  const handleCanPlayThrough = (tName: string) => {
    if (tName === theme && activeVideoTheme !== theme) {
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
      videoEl.play().catch((err) => {
        console.log("Auto-play prevented, waiting for user interaction", err);
        const startOnInteraction = () => {
          const actD = videoRefsDesktop.current[theme];
          const actM = videoRefsMobile.current[theme];
          if (actD) actD.play().catch(() => {});
          if (actM) actM.play().catch(() => {});
          document.removeEventListener('click', startOnInteraction);
          document.removeEventListener('touchstart', startOnInteraction);
        };
        document.addEventListener('click', startOnInteraction, { passive: true });
        document.addEventListener('touchstart', startOnInteraction, { passive: true });
      });
    };

    // If the chosen theme is not the visually active video theme, start caching/playing it in background
    if (theme !== activeVideoTheme) {
      if (activeDesktop) {
        activeDesktop.preload = "auto";
        activeDesktop.load();
        playVideo(activeDesktop);
      }
      if (activeMobile) {
        activeMobile.preload = "auto";
        activeMobile.load();
        playVideo(activeMobile);
      }

      // If already fully buffered, transition immediately
      const isAlreadyReady = 
        (activeDesktop && activeDesktop.readyState >= 3) || 
        (activeMobile && activeMobile.readyState >= 3);

      if (isAlreadyReady) {
        setActiveVideoTheme(theme);
      } else {
        // Fallback timer: 1200ms limit to switch theme video visually even under network failure
        if (fallbackTimeoutRef.current) {
          clearTimeout(fallbackTimeoutRef.current);
        }
        fallbackTimeoutRef.current = setTimeout(() => {
          setActiveVideoTheme(theme);
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
          if (dVid) dVid.pause();
          if (mVid) mVid.pause();
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
      <section className="relative min-h-[100dvh] lg:h-[100dvh] w-full bg-[#030303] text-white overflow-hidden pb-10 lg:pb-0">
        
        {/* DESKTOP/WIDE LANDSCAPE SPLIT LAYOUT (md:grid or landscape:grid) */}
        <div className="hidden md:grid landscape:grid md:grid-cols-12 landscape:grid-cols-12 md:h-full landscape:h-full w-full h-[100dvh]">
          {/* Left Column: Brand, Lamp Glow logo & Poetry beneath it */}
          <div className="col-span-12 md:col-span-6 xl:col-span-5 h-[100dvh] flex flex-col justify-between p-8 xl:p-14 relative bg-[#030303] z-10 border-r border-white/5 select-none pt-20 md:pt-24 overflow-y-auto scrollbar-none">
            
            {/* Top tiny branding accent */}
            <div className="h-4" />

            {/* Lamp Logo container with massive text and adjusted spacing */}
            <div className="flex flex-col justify-center items-center md:items-start flex-1 w-full mt-4 min-h-0">
              <div className="w-full h-[220px] md:h-[300px] xl:h-[350px] relative pointer-events-none flex flex-col items-center justify-center overflow-visible">
                <LampContainer className="h-[250px] md:h-[360px] scale-90 md:scale-100 lg:scale-125 xl:scale-150 overflow-visible">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                    className="flex flex-col items-center"
                  >
                    <h2 className="font-display font-medium text-[4.5rem] md:text-[5.5rem] xl:text-[7.5rem] tracking-[0.05em] text-gradient m-0 p-0 text-center drop-shadow-2xl leading-none">
                      KYVRA
                    </h2>
                  </motion.div>
                </LampContainer>
              </div>

              {/* Poetry & Description positioned BELOW the logo */}
              <div className="space-y-4 w-full max-w-[480px] md:max-w-[500px] xl:max-w-[560px] mt-2 lg:-mt-2 xl:mt-4 text-left">
                <h1 className="font-cormorant text-white text-[1.4rem] md:text-[1.8rem] xl:text-[2.3rem] leading-[1.12] tracking-tight font-light">
                  Onde as estrelas morrem, a poesia ecoa.
                </h1>
                <p className="font-sans text-white/70 text-[11px] md:text-xs xl:text-sm leading-relaxed font-light">
                  Kyvra é um projeto de metal sinfônico melancólico e profundo. Um portal imersivo desenhado para guiar a alma através de arranjos grandiosos, crônicas sombrias e elegias visuais.
                </p>
              </div>
            </div>

            {/* Bottom mini decor info */}
            <div className="text-[10px] font-mono text-white/30 tracking-widest uppercase mt-4">
              // REVELAÇÃO EXCLUSIVA
            </div>
          </div>

          {/* Right Column: Immersive Fullscreen background video with empty space */}
          <div className="col-span-12 md:col-span-6 xl:col-span-7 h-[100dvh] relative bg-black overflow-hidden">
            {Object.entries(THEME_VIDEOS).map(([tName, tSrc]) => (
              <video
                key={`desktop-${tName}`}
                ref={el => { videoRefsDesktop.current[tName] = el; }}
                loop
                muted
                playsInline
                preload={theme === tName ? "auto" : "metadata"}
                onCanPlayThrough={() => handleCanPlayThrough(tName)}
                className={cn(
                  "absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out bg-black",
                  activeVideoTheme === tName ? "opacity-80 z-10" : "opacity-0 z-0 pointer-events-none"
                )}
                src={tSrc}
              />
            ))}
            {/* Elegant vignette overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#030303] via-transparent to-transparent z-20 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#030303]/80 via-transparent to-transparent z-20 pointer-events-none" />
          </div>
        </div>

        {/* MOBILE PORTRAIT LAYOUT (Strictly vertical below md and portrait) */}
        <div className="md:hidden landscape:hidden flex flex-col justify-between min-h-[100dvh] relative z-10 px-6 pt-24 pb-8 h-[100dvh] overflow-hidden">
          {/* Background video overlay for mobile */}
          <div className="absolute inset-0 w-full h-full bg-[#030303] -z-10 overflow-hidden">
            {Object.entries(THEME_VIDEOS).map(([tName, tSrc]) => (
              <video
                key={`mobile-${tName}`}
                ref={el => { videoRefsMobile.current[tName] = el; }}
                loop
                muted
                playsInline
                preload={theme === tName ? "auto" : "metadata"}
                onCanPlayThrough={() => handleCanPlayThrough(tName)}
                className={cn(
                  "absolute inset-0 w-full h-full object-cover object-[80%_center] transition-opacity duration-1000 ease-in-out bg-[#030303]",
                  activeVideoTheme === tName ? "opacity-70 z-10" : "opacity-0 z-0 pointer-events-none"
                )}
                src={tSrc}
              />
            ))}
            <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/30 to-[#030303] z-20 pointer-events-none" />
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
              className="w-full relative flex justify-center items-center overflow-visible"
            >
              <h1 className="font-display font-medium text-[24vw] leading-none text-gradient m-0 p-0 drop-shadow-2xl tracking-[0.01em] text-center w-full select-none">
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
