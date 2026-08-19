import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

let lenisInstance: Lenis | null = null;

// Inicializa Lenis UMA VEZ pra toda a aplicação — ele usa o scroll
// NATIVO do navegador por baixo, só suaviza o resultado. Não bloqueia
// wheel/touch, não roda RAF perpétuo próprio, respeita position: sticky.
export function initSmoothScroll() {
  if (lenisInstance) return lenisInstance;

  lenisInstance = new Lenis({
    duration: 1.1,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    syncTouch: false, // Desativado para mobile-first (usar scroll nativo e suave do celular em vez de emulação)
    touchMultiplier: 2, // Se estiver ativo o scroll, isso dá um multiplicador
  });

  lenisInstance.on('scroll', ScrollTrigger.update);

  gsap.ticker.add((time) => {
    lenisInstance?.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  return lenisInstance;
}

export function getSmoothScrollInstance() {
  return lenisInstance;
}

export function destroySmoothScroll() {
  lenisInstance?.destroy();
  lenisInstance = null;
}
