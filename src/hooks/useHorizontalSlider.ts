import React, { useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';

interface UseHorizontalSliderOptions {
  ease?: number;
  cardWidth?: number;
  gap?: number;
  scaleMax?: number;
  scaleMin?: number;
  offsetMultiplier?: number;
}

export function useHorizontalSlider(
  wrapperRef: React.RefObject<HTMLDivElement>,
  slideRefs: React.RefObject<HTMLDivElement[]>,
  options: UseHorizontalSliderOptions = {}
) {
  const {
    ease = 0.075,
    scaleMax = 1.75,
    scaleMin = 0.5,
    offsetMultiplier = 300,
  } = options;

  const targetRef  = useRef(0);
  const currentRef = useRef(0);
  const rafRef     = useRef(0);
  const maxScrollRef = useRef(0);

  const lerp = (start: number, end: number, factor: number) =>
    start + (end - start) * factor;

  const updateScaleAndPosition = useCallback(() => {
    const slides = slideRefs.current;
    if (!slides) return;

    slides.forEach((slide) => {
      if (!slide) return;
      const rect   = slide.getBoundingClientRect();
      const center = (rect.left + rect.right) / 2;
      const dist   = center - window.innerWidth / 2;

      let scale: number, offsetX: number;

      if (dist > 0) {
        // à direita do centro: cresce
        scale   = Math.min(scaleMax, 1 + dist / window.innerWidth);
        offsetX = (scale - 1) * offsetMultiplier;
      } else {
        // à esquerda do centro: encolhe
        scale   = Math.max(scaleMin, 1 - Math.abs(dist) / window.innerWidth);
        offsetX = 0;
      }

      gsap.set(slide, { scale, x: offsetX });
    });
  }, [scaleMax, scaleMin, offsetMultiplier, slideRefs]);

  const update = useCallback(() => {
    currentRef.current = lerp(currentRef.current, targetRef.current, ease);

    if (wrapperRef.current) {
      gsap.set(wrapperRef.current, { x: -currentRef.current });
    }

    updateScaleAndPosition();
    rafRef.current = requestAnimationFrame(update);
  }, [ease, wrapperRef, updateScaleAndPosition]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    // calcula o scroll máximo
    const recalcMax = () => {
      maxScrollRef.current = wrapper.scrollWidth - window.innerWidth;
    };

    recalcMax();
    window.addEventListener('resize', recalcMax);

    // scroll de roda do mouse → movimento horizontal
    const handleWheel = (e: WheelEvent) => {
      // deltaX para trackpad horizontal, deltaY para mouse wheel
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      targetRef.current += delta;
      targetRef.current = Math.max(0, targetRef.current);
      targetRef.current = Math.min(maxScrollRef.current, targetRef.current);
    };

    // drag para dispositivos touch / mobile
    let touchStartX = 0;
    let touchStartTarget = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartTarget = targetRef.current;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const delta = touchStartX - e.touches[0].clientX;
      targetRef.current = Math.max(0, Math.min(
        maxScrollRef.current,
        touchStartTarget + delta * 1.5  // 1.5× para mais responsividade
      ));
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    // inicia o loop de animação
    rafRef.current = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', recalcMax);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [update, wrapperRef]);

  // função para navegar programaticamente (para botões de seta)
  const scrollTo = useCallback((position: number) => {
    targetRef.current = Math.max(0, Math.min(maxScrollRef.current, position));
  }, []);

  const scrollBy = useCallback((delta: number) => {
    scrollTo(targetRef.current + delta);
  }, [scrollTo]);

  return { scrollTo, scrollBy, currentRef, targetRef };
}
