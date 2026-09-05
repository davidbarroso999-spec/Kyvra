import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

let lenisInstance: Lenis | null = null;
let wheelEventListener: ((e: WheelEvent) => void) | null = null;
let tickerCallback: ((time: number) => void) | null = null;

export function initSmoothScroll() {
  if (lenisInstance) return lenisInstance;

  lenisInstance = new Lenis({
    lerp: 0.1,
    wheelMultiplier: 0.85,
    touchMultiplier: 1,
    syncTouch: false,
    autoResize: true,
  });

  // Nasce pausado — só libera quando o Preloader confirmar 100% real.
  // Isso impede que scroll/toque durante o carregamento mova a página
  // "escondido" atrás do overlay, causando o efeito de teleporte.
  lenisInstance.stop();

  // Monitoramento de latência: mede o tempo entre o evento de wheel e a aplicação no transform/scroll
  let lastWheelTime: number | null = null;
  let isAwaitingTransform = false;

  wheelEventListener = () => {
    lastWheelTime = performance.now();
    isAwaitingTransform = true;
    try {
      performance.mark('wheel-input');
    } catch {}
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('wheel', wheelEventListener, { passive: true });
  }

  lenisInstance.on('scroll', (e: any) => {
    if (isAwaitingTransform && lastWheelTime !== null) {
      const now = performance.now();
      const latency = now - lastWheelTime;
      isAwaitingTransform = false;

      try {
        performance.mark('scroll-transform-updated');
        performance.measure('wheel-to-scroll-transform', 'wheel-input', 'scroll-transform-updated');
      } catch {}

      const isBottleneck = latency > 16.6; // Ultrapassa 1 frame a 60fps
      const logFn = isBottleneck ? console.warn : console.log;

      logFn(
        `%c[SmoothScroll Perf]%c Resposta Wheel ➔ Transform: %c${latency.toFixed(2)}ms%c (Posição: ${Math.round(e.scroll || 0)}px, Velocidade: ${(e.velocity || 0).toFixed(2)})${isBottleneck ? ' ⚠️ [Possível gargalo na thread principal]' : ''}`,
        'color: #06b6d4; font-weight: bold;',
        'color: inherit;',
        `color: ${latency < 8.3 ? '#10b981' : latency < 16.6 ? '#f59e0b' : '#ef4444'}; font-weight: bold;`,
        'color: inherit;'
      );
    }

    ScrollTrigger.update();
  });

  tickerCallback = (time: number) => {
    lenisInstance?.raf(time * 1000);
  };
  gsap.ticker.add(tickerCallback);
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
  if (typeof window !== 'undefined' && wheelEventListener) {
    window.removeEventListener('wheel', wheelEventListener);
    wheelEventListener = null;
  }
  if (tickerCallback) {
    gsap.ticker.remove(tickerCallback);
    tickerCallback = null;
  }
  lenisInstance?.destroy();
  lenisInstance = null;
}
