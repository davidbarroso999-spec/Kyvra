import { useEffect, useRef } from 'react';
import { useMotionValue, MotionValue } from 'motion/react';

export function useScrollProgress(containerRef: React.RefObject<HTMLElement | null>): MotionValue<number> {
  const progressValue = useMotionValue(0);
  const targetProgressRef = useRef(0);
  const virtualYRef = useRef(0);
  const rafRef = useRef<number>(0);
  const isRunningRef = useRef<boolean>(false);
  const lastTimeRef = useRef<number>(0);
  
  // Variáveis para touch
  const touchStartYRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Distância total virtual calibrada para durar ~6,9 segundos de rolagem natural (24 FPS padrão cinema)
    const VIRTUAL_SCROLL_LENGTH = window.innerHeight * 5.2;
    
    // Taxa de velocidade máxima por segundo (1 / 6.9s ≈ 0.1449 por segundo)
    // Isso garante que a transição completa de 165 frames rode a 24 FPS cravados em 6,9 segundos
    const MAX_PROGRESS_PER_SEC = 1 / 6.9;
    
    // Suavização orgânica ágil e fluida (Lerp cinematográfico)
    const LERP_FACTOR = 0.105;

    const update = (currentTime: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = currentTime;
      const deltaTime = Math.min(0.1, (currentTime - lastTimeRef.current) / 1000);
      lastTimeRef.current = currentTime;

      const target = targetProgressRef.current;
      const current = progressValue.get();
      
      const diff = target - current;
      
      if (Math.abs(diff) > 0.00005) {
        // Velocidade máxima permitida pelo tempo delta para cravar os 6,9 segundos (24 FPS)
        const maxStep = MAX_PROGRESS_PER_SEC * deltaTime;
        
        let desiredStep = diff * LERP_FACTOR;
        
        // Limita o passo para a velocidade máxima calibrada de 6,9s
        if (Math.abs(desiredStep) > maxStep) {
          desiredStep = Math.sign(desiredStep) * maxStep;
        }
        
        let newProgress = current + desiredStep;
        
        if (Math.abs(target - newProgress) < 0.0001) {
          newProgress = target;
        }
        
        progressValue.set(newProgress);
        rafRef.current = requestAnimationFrame(update);
      } else {
        if (current !== target) {
          progressValue.set(target);
        }
        isRunningRef.current = false;
        lastTimeRef.current = 0;
      }
    };

    const scheduleUpdate = () => {
      if (!isRunningRef.current) {
        isRunningRef.current = true;
        lastTimeRef.current = performance.now();
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(update);
      }
    };

    const setVirtualY = (newY: number) => {
      virtualYRef.current = Math.max(0, Math.min(VIRTUAL_SCROLL_LENGTH, newY));
      targetProgressRef.current = virtualYRef.current / VIRTUAL_SCROLL_LENGTH;
      scheduleUpdate();
    };

    // Lógica Virtual de Scroll padronizada com passive: true
    const handleWheel = (e: WheelEvent) => {
      let deltaY = e.deltaY;
      if (e.deltaMode === 1) { // Linhas de roda de mouse comum
        deltaY *= 44; 
      } else if (e.deltaMode === 2) { // Páginas
        deltaY *= window.innerHeight * 0.7;
      } else {
        deltaY *= 1.25; // Trackpads perfeitamente calibrados para 6,9s
      }
      
      setVirtualY(virtualYRef.current + deltaY);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        touchStartYRef.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const currentY = e.touches[0].clientY;
      const deltaY = touchStartYRef.current - currentY;
      touchStartYRef.current = currentY;
      
      // Amortecimento dinâmico para mobile percorrer em 6,9 segundos com resposta imediata e super fluida
      setVirtualY(virtualYRef.current + deltaY * 1.35);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      
      const jumpAmount = VIRTUAL_SCROLL_LENGTH * 0.08; // Pula ~8% da jornada por tecla
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setVirtualY(virtualYRef.current + jumpAmount);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setVirtualY(virtualYRef.current - jumpAmount);
      }
    };

    // Listeners com passive: true para renderização assíncrona fluida no Android/Chrome
    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('keydown', handleKeyDown, { passive: false });

    return () => {
      cancelAnimationFrame(rafRef.current);
      isRunningRef.current = false;
      lastTimeRef.current = 0;
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [containerRef, progressValue]);

  return progressValue;
}
