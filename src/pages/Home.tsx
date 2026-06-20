import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { getFeaturedTracksSettings, getTracksByIds, getTrackSynopses } from '@/lib/apiCache';
import { useStore } from '@/store/useStore';
import { FeaturedSlider } from '@/components/ui/FeaturedSlider';
import { LampContainer } from '@/components/ui/lamp';

const THEME_VIDEOS: Record<string, string> = {
  abissal: "https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/HEROVIDEO/YouCut_20260620_140915393.mp4",
  'sangue-de-drago': "https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/HEROVIDEO/YouCut_sanguededrago.mp4",
  'floresta-negra': "https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/HEROVIDEO/YouCut_floresta.mp4",
  'monolito': "https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/HEROVIDEO/YouCut_monolito.mp4"
};

export function Home() {
  const { theme } = useStore();
  const [featuredTracks, setFeaturedTracks] = useState<any[]>([]);
  const videoRefDesktop = useRef<HTMLVideoElement>(null);
  const videoRefMobile = useRef<HTMLVideoElement>(null);

  const videoSrc = THEME_VIDEOS[theme] || THEME_VIDEOS.abissal;

  useEffect(() => {
    document.title = "Kyvra — Portal Oficial";
  }, []);

  // Guarantee the video plays programmatically
  useEffect(() => {
    const playVideo = (videoEl: HTMLVideoElement | null) => {
      if (videoEl) {
        videoEl.muted = true;
        videoEl.play().catch((err) => {
          console.log("Auto-play prevented by browser policy, attempting fallback on interaction", err);
          
          const startOnInteraction = () => {
            videoEl.play().catch(() => {});
            document.removeEventListener('click', startOnInteraction);
            document.removeEventListener('touchstart', startOnInteraction);
          };
          document.addEventListener('click', startOnInteraction);
          document.addEventListener('touchstart', startOnInteraction);
        });
      }
    };

    playVideo(videoRefDesktop.current);
    playVideo(videoRefMobile.current);
  }, [videoSrc]);

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
        
        {/* DESKTOP SPLIT LAYOUT (lg Breakpoint & above) */}
        <div className="hidden lg:grid lg:grid-cols-12 lg:h-full w-full">
          {/* Left Column: Brand, Lamp Glow logo & Poetry beneath it */}
          <div className="col-span-12 lg:col-span-6 xl:col-span-5 h-[100dvh] flex flex-col justify-between p-10 xl:p-14 relative bg-[#030303] z-10 border-r border-white/5 select-none pt-24">
            
            {/* Top tiny branding accent */}
            <div className="h-4" />

            {/* Lamp Logo container with massive text and adjusted spacing */}
            <div className="flex flex-col justify-center items-center lg:items-start flex-1 w-full mt-4">
              <div className="w-full h-[320px] xl:h-[350px] relative pointer-events-none flex flex-col items-center justify-center overflow-visible">
                <LampContainer className="h-[360px] lg:scale-125 xl:scale-150 overflow-visible">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                    className="flex flex-col items-center"
                  >
                    <h2 className="font-display font-medium text-[5.5rem] xl:text-[7.5rem] tracking-[0.05em] text-gradient m-0 p-0 text-center drop-shadow-2xl leading-none">
                      KYVRA
                    </h2>
                  </motion.div>
                </LampContainer>
              </div>

              {/* Poetry & Description positioned BELOW the logo, closer with negative margin top */}
              <div className="space-y-4 w-full max-w-[480px] lg:max-w-[500px] xl:max-w-[560px] mt-2 lg:-mt-2 xl:mt-4 text-left">
                <h1 className="font-cormorant text-white text-[1.8rem] xl:text-[2.3rem] leading-[1.12] tracking-tight font-light">
                  Onde as estrelas morrem, a poesia ecoa.
                </h1>
                <p className="font-sans text-white/70 text-xs xl:text-sm leading-relaxed font-light">
                  Kyvra é um projeto de metal sinfônico melancólico e profundo. Um portal imersivo desenhado para guiar a alma através de arranjos grandiosos, crônicas sombrias e elegias visuais.
                </p>
              </div>
            </div>

            {/* Bottom mini decor info */}
            <div className="text-[10px] font-mono text-white/30 tracking-widest uppercase">
              // REVELAÇÃO EXCLUSIVA
            </div>
          </div>

          {/* Right Column: Immersive Fullscreen background video with empty space */}
          <div className="col-span-12 lg:col-span-6 xl:col-span-7 h-[100dvh] relative bg-black">
            <video
              key={`desktop-${videoSrc}`}
              ref={videoRefDesktop}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover opacity-80"
              src={videoSrc}
            />
            {/* Elegant vignette overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#030303] via-transparent to-transparent z-0 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#030303]/80 via-transparent to-transparent z-0 pointer-events-none" />
          </div>
        </div>

        {/* MOBILE LAYOUT (Below lg breakpoint) */}
        <div className="lg:hidden flex flex-col justify-between min-h-[100dvh] relative z-10 px-6 pt-24 pb-8">
          {/* Background video overlay for mobile */}
          <div className="absolute inset-0 w-full h-full bg-[#030303] -z-10">
            <video
              key={`mobile-${videoSrc}`}
              ref={videoRefMobile}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover object-[80%_center] opacity-70"
              src={videoSrc}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/30 to-[#030303] pointer-events-none" />
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
              className="w-full -mx-6 px-6 flex justify-center items-center"
            >
              <h1 className="font-display font-medium text-[22vw] leading-none text-gradient m-0 p-0 drop-shadow-2xl tracking-[0.04em] text-center w-full select-none">
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
