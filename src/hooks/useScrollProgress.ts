import { useEffect } from 'react';
import { useMotionValue, MotionValue } from 'motion/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function useScrollProgress(containerRef: React.RefObject<HTMLElement | null>): MotionValue<number> {
  const progress = useMotionValue(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const st = ScrollTrigger.create({
      trigger: container,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true, // resposta direta ao scroll real do navegador via Lenis + GSAP
      onUpdate: (self) => {
        progress.set(self.progress);
      },
    });

    ScrollTrigger.refresh();

    return () => {
      st.kill();
    };
  }, [containerRef, progress]);

  return progress;
}
