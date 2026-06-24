import React, { useEffect } from 'react';

export function useGPUAcceleration(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const element = ref.current;
    if (element) {
      element.style.willChange = 'transform, opacity';
      element.style.backfaceVisibility = 'hidden';
      // Inline styling to force 3D context
      if (!element.style.transform.includes('translateZ')) {
        element.style.transform = (element.style.transform + ' translateZ(0)').trim();
      }
    }
    return () => {
      if (element) {
        element.style.willChange = 'auto';
      }
    };
  }, [ref]);
}
