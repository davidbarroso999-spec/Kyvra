import { useEffect, useRef } from 'react';
import { useMotionValue, MotionValue } from 'motion/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { getSmoothScrollInstance } from '@/lib/smoothScroll';

gsap.registerPlugin(ScrollTrigger);

export function useScrollProgress(containerRef: React.RefObject<HTMLElement | null>): MotionValue<number> {
  const progress = useMotionValue(0);
  const targetProgress = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const lenis = getSmoothScrollInstance();
    if (lenis) {
      lenis.resize();
    }

    const st = ScrollTrigger.create({
      trigger: container,
      start: 'top top',
      end: 'bottom bottom',
      scrub: false, // Nós gerenciamos o scrub via rAF para garantir o limite máximo de velocidade
      onUpdate: (self) => {
        targetProgress.current = self.progress;
      },
    });

    let rafId: number;
    let lastTime = performance.now();
    
    // Taxa máxima de progresso por segundo (1 / 6.9 = ~0.1449) garante 6.9s no scroll completo
    const MAX_SPEED = 1 / 6.9; 
    const LERP_SPEED = 5.5; // Fator de suavização independente de framerate

    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      const current = progress.get();
      const target = targetProgress.current;
      const diff = target - current;

      if (Math.abs(diff) > 0.0001) {
        const maxStep = MAX_SPEED * dt;
        // Interpolação baseada no tempo real para consistência entre 60Hz e 120Hz
        let step = diff * (1 - Math.exp(-LERP_SPEED * dt));

        if (Math.abs(step) > maxStep) {
          step = Math.sign(step) * maxStep;
        }

        let next = current + step;
        if (Math.abs(target - next) < 0.001) {
          next = target;
        }

        progress.set(next);
      } else if (current !== target) {
        progress.set(target);
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    const timer = setTimeout(() => {
      ScrollTrigger.refresh();
      lenis?.resize();
    }, 60);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(rafId);
      st.kill();
    };
  }, [containerRef, progress]);

  return progress;
}
