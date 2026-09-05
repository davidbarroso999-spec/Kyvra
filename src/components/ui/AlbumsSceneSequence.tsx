import { useEffect, useRef, useState, useCallback } from 'react';
import { MotionValue } from 'motion/react';
import {
  FRAME_COUNT,
  getAlbumsImageElement,
  getAlbumsFramesLoadedCount,
  isAlbumsFramesComplete,
  subscribeToAlbumsFrames,
  startPreloadingAlbumsFrames,
} from '@/lib/albumsFrameCache';

interface AlbumsSceneSequenceProps {
  progress: MotionValue<number>;
  onFrameChange?: (currentFrame: number, maxFrame: number) => void;
}

export function AlbumsSceneSequence({ progress, onFrameChange }: AlbumsSceneSequenceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastDrawnIndex = useRef<number>(-1);
  const [loadedCount, setLoadedCount] = useState<number>(getAlbumsFramesLoadedCount);
  const [isFullyLoaded, setIsFullyLoaded] = useState<boolean>(isAlbumsFramesComplete);
  const dimensionsRef = useRef({ w: 0, h: 0, dpr: 1, isMobile: false });
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  // Pré-calcula dimensões para evitar Layout Thrashing no loop do rAF
  const updateDimensions = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const isMobile = window.innerWidth < 768;
    const dpr = isMobile ? 1.0 : Math.min(window.devicePixelRatio || 1, 1.5);
    const clientW = window.innerWidth;
    const clientH = window.innerHeight;
    
    dimensionsRef.current = {
      w: Math.round(clientW * dpr),
      h: Math.round(clientH * dpr),
      dpr,
      isMobile
    };
  }, []);

  const drawFrame = (img: HTMLImageElement) => {
    if (!img || !img.complete || img.naturalWidth === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!ctxRef.current) {
      ctxRef.current = canvas.getContext('2d', { alpha: false, desynchronized: true });
    }
    const ctx = ctxRef.current;
    if (!ctx) return;

    // Se as dimensões ainda não foram calculadas, calcula agora
    if (dimensionsRef.current.w === 0) {
      updateDimensions();
    }

    const { w, h, isMobile } = dimensionsRef.current;
    if (w === 0 || h === 0) return;

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    ctx.imageSmoothingEnabled = true;
    if (!isMobile) {
      ctx.imageSmoothingQuality = 'high';
    }

    const imgRatio = img.naturalWidth / img.naturalHeight;
    const canvasRatio = w / h;

    let drawW = w, drawH = h, offX = 0, offY = 0;

    if (imgRatio > canvasRatio) {
      drawH = h;
      drawW = h * imgRatio;
      offX = (w - drawW) / 2;
    } else {
      drawW = w;
      drawH = w / imgRatio;
      offY = (h - drawH) / 2;
    }

    // drawImage cobre 100% da viewport (alpha: false) - zero overhead de clearRect
    ctx.drawImage(img, offX, offY, drawW, drawH);
  };

  const lastValidImageRef = useRef<HTMLImageElement | null>(null);

  const getBestAvailableImage = (index: number): HTMLImageElement | null => {
    // Tenta pegar o frame exato
    const img = getAlbumsImageElement(index);
    if (img && img.complete && img.naturalWidth > 0) {
      lastValidImageRef.current = img;
      return img;
    }

    // Se o frame atual não estiver carregado, recicla o último frame que deu certo
    // Isso elimina o loop massivo (O(N)) que estava causando engasgos (GC e network thrashing) no mobile
    if (lastValidImageRef.current && lastValidImageRef.current.complete && lastValidImageRef.current.naturalWidth > 0) {
      return lastValidImageRef.current;
    }

    // Fallback extremo
    const firstImg = getAlbumsImageElement(0);
    if (firstImg && firstImg.complete && firstImg.naturalWidth > 0) {
      return firstImg;
    }

    return null;
  };

  useEffect(() => {
    startPreloadingAlbumsFrames();

    const firstImg = getBestAvailableImage(0);
    if (firstImg) {
      if (firstImg.complete && firstImg.naturalWidth > 0) {
        drawFrame(firstImg);
      } else {
        firstImg.onload = () => drawFrame(firstImg);
      }
    }

    const unsubscribe = subscribeToAlbumsFrames((loaded, _total, complete) => {
      setLoadedCount(loaded);
      setIsFullyLoaded(complete);
      const idx = lastDrawnIndex.current >= 0 ? lastDrawnIndex.current : 0;
      const currentImg = getBestAvailableImage(idx);
      if (currentImg && currentImg.complete && currentImg.naturalWidth > 0) {
        drawFrame(currentImg);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    return progress.on('change', (v) => {
      const targetIndex = Math.min(
        FRAME_COUNT - 1,
        Math.max(0, Math.round(v * (FRAME_COUNT - 1)))
      );
      
      onFrameChange?.(targetIndex, FRAME_COUNT - 1);
      
      // Update zoom directly on DOM node to bypass React re-renders
      if (containerRef.current) {
         const zoom = 1.0 + 0.05 * v;
         containerRef.current.style.transform = `scale(${zoom})`;
      }

      if (targetIndex === lastDrawnIndex.current) return;
      
      lastDrawnIndex.current = targetIndex;
      const img = getBestAvailableImage(targetIndex);
      if (img) drawFrame(img);
    });
  }, [progress, onFrameChange]);

  useEffect(() => {
    const onResize = () => {
      updateDimensions();
      const img = getBestAvailableImage(Math.max(0, lastDrawnIndex.current));
      if (img) drawFrame(img);
    };
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, [updateDimensions]);

  return (
    <div className="absolute inset-0 z-0 bg-void overflow-hidden">
      <div 
        ref={containerRef}
        className="absolute inset-0 w-full h-full"
        style={{ transformOrigin: 'center center', willChange: 'transform' }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
        />
      </div>
      <div className="absolute inset-0 pointer-events-none mix-blend-color opacity-70 z-[1]" style={{ background: 'var(--primary)' }} />
      <div className="absolute inset-0 bg-gradient-to-t from-void via-void/40 to-void/70 pointer-events-none z-[2]" />
      <div className="absolute inset-0 bg-radial-gradient from-transparent via-void/45 to-void pointer-events-none z-[2]" />
      
      {!isFullyLoaded && loadedCount === 0 && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-void transition-opacity duration-500">
          <div className="flex flex-col items-center gap-3 w-48">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="font-mono text-[10px] text-white/40 tracking-widest uppercase text-center">
              A visão se materializa...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
