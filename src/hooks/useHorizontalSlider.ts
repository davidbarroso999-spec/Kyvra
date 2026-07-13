import React, { useEffect, useRef, useCallback } from 'react';

// Using native transforms for better performance
interface UseHorizontalSliderOptions {
  ease?: number;
  cardWidth?: number;
  gap?: number;
  scaleMax?: number;
  scaleMin?: number;
  offsetMultiplier?: number;
  snapPoints?: number[]; // Posições onde os cards ficam no centro
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
  const isAnimatingRef = useRef(false);
  
  // Variáveis para detectar inércia e forçar o snap
  const isDraggingRef = useRef(false);
  const velocityRef = useRef(0);
  const snapPointsRef = useRef<number[]>([]);
  
  // Cache for positions
  const slideMetricsRef = useRef<{originX: number, width: number}[]>([]);
  const isMobileRef = useRef(false);

  const lerp = (start: number, end: number, factor: number) =>
    start + (end - start) * factor;

  const forceSnap = useCallback((velocity = 0, overrideTarget?: number) => {
    if (!snapPointsRef.current.length || (!isDraggingRef.current === false && overrideTarget === undefined)) return;

    let baseTarget = overrideTarget !== undefined ? overrideTarget : targetRef.current;

    // Multiplicador de intenção (puxa muito mais forte dependendo da velocidade de soltura).
    let projectedTarget = baseTarget + (velocity * 25);

    let closestSnap = snapPointsRef.current[0] || 0;
    let minDiff = Infinity;

    snapPointsRef.current.forEach((snap) => {
      const diff = Math.abs(snap - projectedTarget);
      if (diff < minDiff) {
        minDiff = diff;
        closestSnap = snap;
      }
    });

    targetRef.current = closestSnap;
  }, []);

  // Função para calcular os pontos de snap baseados na posição real dos itens
  const calculateSnapPoints = useCallback(() => {
    if (!wrapperRef.current || !slideRefs.current?.length) return;
    
    const container = wrapperRef.current.parentElement || wrapperRef.current;
    const containerWidth = container.offsetWidth;
    const centerContainer = containerWidth / 2;
    const newSnapPoints: number[] = [];
    const newMetrics: {originX: number, width: number}[] = [];
    
    isMobileRef.current = window.innerWidth < 768;
    
    slideRefs.current.forEach((slide) => {
      if (!slide) return;
      const originX = slide.offsetLeft;
      const originWidth = slide.offsetWidth;
      
      newMetrics.push({ originX, width: originWidth });
      
      let snapPos = originX + (originWidth / 2) - centerContainer;
      snapPos = Math.max(0, Math.min(maxScrollRef.current, snapPos));
      newSnapPoints.push(snapPos);
    });
    
    snapPointsRef.current = newSnapPoints;
    slideMetricsRef.current = newMetrics;
  }, [slideRefs, wrapperRef]);

  const updateScaleAndPosition = useCallback(() => {
    const slides = slideRefs.current;
    if (!slides || !wrapperRef.current) return;
    
    const container = wrapperRef.current.parentElement || wrapperRef.current;
    const cw = container.offsetWidth;
    const centerScreen = cw / 2;
    const metrics = slideMetricsRef.current;

    slides.forEach((slide, i) => {
      if (!slide || !metrics[i]) return;
      
      // Calculate center based on current translation
      const { originX, width } = metrics[i];
      const center = originX + (width / 2) - currentRef.current;
      const dist = center - centerScreen;

      let scale = 1;
      let offsetX = 0;
      
      // Only do heavy scaling logic on desktop
      if (!isMobileRef.current) {
        if (dist > 0) {
          scale = Math.min(scaleMax, 1 + dist / cw);
          offsetX = (scale - 1) * offsetMultiplier;
        } else {
          scale = Math.max(scaleMin, 1 - Math.abs(dist) / cw);
          offsetX = 0;
        }
        slide.style.transform = `translate3d(${offsetX}px, 0, 0) scale(${scale})`;
      } else {
        // Less expensive styling for mobile, no scale or simple scale
        scale = Math.max(0.9, 1 - (Math.abs(dist) / cw) * 0.2);
        slide.style.transform = `scale(${scale}) translateZ(0)`;
      }
    });
  }, [scaleMax, scaleMin, offsetMultiplier, slideRefs, wrapperRef]);

  const update = useCallback(() => {
    const diff = targetRef.current - currentRef.current;
    
    // Stop animation if we are extremely close to the target
    if (Math.abs(diff) < 0.05 && !isDraggingRef.current) {
      if (wrapperRef.current) {
         currentRef.current = targetRef.current;
         wrapperRef.current.style.transform = `translate3d(${-currentRef.current}px, 0, 0)`;
         updateScaleAndPosition();
      }
      isAnimatingRef.current = false;
      return;
    }

    currentRef.current = lerp(currentRef.current, targetRef.current, ease);

    if (wrapperRef.current) {
      wrapperRef.current.style.transform = `translate3d(${-currentRef.current}px, 0, 0)`;
    }

    updateScaleAndPosition();
    rafRef.current = requestAnimationFrame(update);
  }, [ease, wrapperRef, updateScaleAndPosition]);

  const startAnimation = useCallback(() => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(update);
  }, [update]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    // calcula o scroll máximo
    const recalcMax = () => {
      const container = wrapper.parentElement || wrapper;
      const containerWidth = container.offsetWidth;
      maxScrollRef.current = Math.max(0, wrapper.scrollWidth - containerWidth);
      calculateSnapPoints();
      startAnimation();
    };

    let sliderUnmounted = false;
    let sliderResizeFrameId: number | null = null;

    // Use ResizeObserver to detect when items are loaded inside the wrapper
    const resizeObserver = new ResizeObserver(() => {
      if (sliderResizeFrameId) {
        cancelAnimationFrame(sliderResizeFrameId);
      }
      sliderResizeFrameId = requestAnimationFrame(() => {
        if (sliderUnmounted) return;
        recalcMax();
      });
    });
    resizeObserver.observe(wrapper);

    // Also observe the children/slides if they change
    const delayRecalc = setTimeout(recalcMax, 150);
    window.addEventListener('resize', recalcMax, { passive: true });

    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTarget = 0;
    let lastTouchX = 0;
    let touchVelocity = 0;
    let isVerticalSwipe = false;
    let isFirstMove = true;

    const handleTouchStart = (e: TouchEvent) => {
      isDraggingRef.current = true;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      lastTouchX = e.touches[0].clientX;
      touchStartTarget = targetRef.current;
      touchVelocity = 0;
      isVerticalSwipe = false;
      isFirstMove = true;
      startAnimation();
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isVerticalSwipe) return;

      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;

      if (isFirstMove) {
        if (Math.abs(currentY - touchStartY) > Math.abs(currentX - touchStartX)) {
          isVerticalSwipe = true;
          isDraggingRef.current = false;
          return;
        }
        isFirstMove = false;
      }

      // Prevent standard vertical scrolling when horizontal swipe is detected
      if (e.cancelable) {
        e.preventDefault();
      }

      touchVelocity = lastTouchX - currentX;
      lastTouchX = currentX;

      const delta = touchStartX - currentX;
      targetRef.current = Math.max(0, Math.min(
        maxScrollRef.current,
        touchStartTarget + delta * 1.5 
      ));
      startAnimation();
    };
    
    const handleTouchEnd = () => {
      if (isVerticalSwipe) return;
      isDraggingRef.current = false;
      forceSnap(touchVelocity);
      startAnimation();
    };

    const container = wrapper.parentElement || wrapper;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    startAnimation();

    return () => {
      sliderUnmounted = true;
      if (sliderResizeFrameId) {
        cancelAnimationFrame(sliderResizeFrameId);
      }
      clearTimeout(delayRecalc);
      resizeObserver.disconnect();
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', recalcMax);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [startAnimation, wrapperRef, calculateSnapPoints, forceSnap]);

  const scrollTo = useCallback((position: number) => {
    isDraggingRef.current = false;
    targetRef.current = Math.max(0, Math.min(maxScrollRef.current, position));
    forceSnap(0, targetRef.current);
    startAnimation();
  }, [forceSnap, startAnimation]);

  const scrollBy = useCallback((delta: number) => {
    scrollTo(targetRef.current + delta);
  }, [scrollTo]);

  return { scrollTo, scrollBy, currentRef, targetRef };
}
