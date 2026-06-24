import React, { useState, useEffect, useRef } from 'react';

interface UseVirtualizationOptions {
  overscanCount?: number;
}

export function useVirtualization<T>(
  items: T[],
  itemHeight: number,
  options: UseVirtualizationOptions = {}
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const overscan = options.overscanCount ?? 5;

  const [scrollTop, setScrollTop] = useState(0);
  const [containerOffsetTop, setContainerOffsetTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 800);

  useEffect(() => {
    const handleScroll = () => {
      setScrollTop(window.scrollY);
    };

    const handleResize = () => {
      setViewportHeight(window.innerHeight);
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const absoluteTop = rect.top + window.scrollY;
        setContainerOffsetTop(absoluteTop);
      }
    };

    // Calculate initial values
    handleScroll();
    handleResize();

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });

    // Use a ResizeObserver to handle layout shifts dynamically
    const element = containerRef.current;
    let resizeObserver: ResizeObserver | null = null;
    if (element) {
      resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(() => {
          handleResize();
        });
      });
      resizeObserver.observe(element);
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [items]);

  // Calculations
  const relativeScrollTop = Math.max(0, scrollTop - containerOffsetTop);
  
  const startIndex = Math.max(0, Math.floor(relativeScrollTop / itemHeight) - overscan);
  const endIndex = Math.min(items.length, Math.ceil((relativeScrollTop + viewportHeight) / itemHeight) + overscan);

  const slicedItems = items.slice(startIndex, endIndex);
  const paddingTop = startIndex * itemHeight;
  const paddingBottom = Math.max(0, (items.length - endIndex) * itemHeight);

  return {
    containerRef,
    slicedItems,
    paddingTop,
    paddingBottom,
    startIndex,
  };
}

