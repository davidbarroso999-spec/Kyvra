import { useEffect, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function useScrollProgress(containerRef: React.RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const st = ScrollTrigger.create({
      trigger: container,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true, // resposta direta ao scroll, sem amortecimento
      onUpdate: (self) => setProgress(self.progress),
    });

    ScrollTrigger.refresh();

    return () => st.kill();
  }, [containerRef]);

  return progress;
}
