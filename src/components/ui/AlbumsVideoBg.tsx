import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { useGPUAcceleration } from '@/modules/performance-optimization';

const ALBUM_THEME_VIDEOS: Record<string, string> = {
  abissal: "https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/ALBUMVIDEO/YouCut_ALBUMABISSAL.webm",
  'sangue-de-drago': "https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/ALBUMVIDEO/YouCut_ALBUMSANGUEDEDRAGO.webm",
  'floresta-negra': "https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/ALBUMVIDEO/YouCut_ALBUMFLORESTANEGRA.webm",
  'monolito': "https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/ALBUMVIDEO/YouCut_ALBUMMONOLITO.webm"
};

export function AlbumsVideoBg() {
  const theme = useStore((state) => state.theme);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const videoRetries = useRef<Record<string, number>>({});
  
  const backgroundEngineRef = useRef<HTMLDivElement>(null);
  useGPUAcceleration(backgroundEngineRef);

  const [currentVideoTheme, setCurrentVideoTheme] = useState(theme);
  const [previousVideoTheme, setPreviousVideoTheme] = useState<string | null>(null);
  const [videoLoaded, setVideoLoaded] = useState<Record<string, boolean>>({});
  const prevThemeRef = useRef(theme);

  const handleVideoError = (tName: string, e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const video = e.currentTarget;
    const count = videoRetries.current[tName] || 0;
    if (count < 3) {
      videoRetries.current[tName] = count + 1;
      setTimeout(() => {
        if (video) {
          video.load();
          video.play().catch(() => {});
        }
      }, 1500);
    }
  };

  useEffect(() => {
    if (theme !== prevThemeRef.current) {
      setPreviousVideoTheme(prevThemeRef.current);
      setCurrentVideoTheme(theme);
      prevThemeRef.current = theme;
    }
  }, [theme]);

  useEffect(() => {
    const playVideo = (v: HTMLVideoElement) => {
      if (v.paused) {
        v.play().catch((err) => {
          console.log("[Kyvra Albums Video] Playback promise rejected", err);
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

  return (
    <div 
      ref={backgroundEngineRef}
      className="absolute inset-0 z-0 bg-void overflow-hidden scale-[1.05]" 
      style={{
        contain: "strict",
        transform: "translate3d(0,0,0)",
        backfaceVisibility: "hidden",
        perspective: 1000
      }}
    >
      {Object.keys(ALBUM_THEME_VIDEOS).map((tName) => {
        const isCurrent = tName === currentVideoTheme;
        const isPrevious = tName === previousVideoTheme;
        const isLoaded = videoLoaded[tName];

        if (!isCurrent && !isPrevious && !isLoaded) {
          return null;
        }

        let opacityClass = "opacity-0";
        if (isCurrent) {
          opacityClass = "opacity-100 scale-100 z-10";
        } else if (isPrevious) {
          opacityClass = "opacity-0 scale-105 z-0";
        }

        return (
          <video
            key={`album-video-${tName}`}
            ref={el => {
              videoRefs.current[tName] = el;
            }}
            autoPlay={false}
            loop={true}
            muted={true}
            playsInline={true}
            preload="auto"
            className={cn(
              "absolute inset-0 w-full h-full object-cover object-[80%_center] md:object-center transition-all duration-[2000ms] ease-in-out bg-transparent",
              opacityClass
            )}
            style={{
              willChange: "opacity, transform",
              transform: "translate3d(0,0,0)",
              backfaceVisibility: "hidden"
            }}
            src={ALBUM_THEME_VIDEOS[tName]}
            onError={(e) => handleVideoError(tName, e)}
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

      <div className="absolute inset-0 bg-gradient-to-t from-void via-void/40 to-void/70 pointer-events-none z-20" />
      <div className="absolute inset-0 bg-radial-gradient from-transparent via-void/50 to-void pointer-events-none z-20" />
    </div>
  );
}
