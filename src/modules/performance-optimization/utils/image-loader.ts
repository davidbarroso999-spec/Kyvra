import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook to lazy-load images using IntersectionObserver.
 * Initiates image download when the element is within 100px of the viewport.
 */
export function useLazyImage(src: string | undefined, placeholder: string | undefined = undefined) {
  const ref = useRef<HTMLImageElement | null>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | undefined>(placeholder || undefined);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!src) return;

    // Fallback if IntersectionObserver isn't supported
    if (!('IntersectionObserver' in window)) {
      setLoadedSrc(src);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setLoadedSrc(src);
          observer.disconnect();
        }
      },
      {
        rootMargin: '100px', // Preload ahead of scroll position
        threshold: 0.01,
      }
    );

    const element = ref.current;
    if (element) {
      observer.observe(element);
    }

    return () => {
      observer.disconnect();
    };
  }, [src]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  return {
    ref,
    src: loadedSrc || undefined,
    isLoaded,
    handleLoad,
  };
}
