import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

let lenisInstance: Lenis | null = null;

export function initSmoothScroll() {
  if (lenisInstance) return lenisInstance;

  lenisInstance = new Lenis({
    duration: 1.1,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    syncTouch: true,
    touchMultiplier: 1.5,
  });

  // Nasce pausado — só libera quando o Preloader confirmar 100% real.
  // Isso impede que scroll/toque durante o carregamento mova a página
  // "escondido" atrás do overlay, causando o efeito de teleporte.
  lenisInstance.stop();

  lenisInstance.on('scroll', ScrollTrigger.update);

  gsap.ticker.add((time) => {
    lenisInstance?.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  return lenisInstance;
}

export function resumeSmoothScroll() {
  lenisInstance?.start();
}

export function getSmoothScrollInstance() {
  return lenisInstance;
}

export function destroySmoothScroll() {
  lenisInstance?.destroy();
  lenisInstance = null;
}
