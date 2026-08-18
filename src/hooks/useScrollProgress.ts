import { useEffect, useState, useRef } from 'react';

export function useScrollProgress(containerRef: React.RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0);
  const targetProgressRef = useRef(0);
  const currentProgressRef = useRef(0);
  const rafRef = useRef<number>(0);
  
  // Variáveis para touch
  const touchStartYRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Velocidade fixa máxima/única por frame para garantir independência da intensidade do usuário
    const fixedVelocity = 0.0035; 

    const update = () => {
      const target = targetProgressRef.current;
      let current = currentProgressRef.current;
      
      const diff = target - current;
      
      if (Math.abs(diff) > 0.0001) {
        // Move sempre a uma velocidade constante
        let step = Math.sign(diff) * fixedVelocity;
        
        // Se estivermos muito perto do alvo, cravamos nele para não tremer (overshoot)
        if (Math.abs(step) > Math.abs(diff)) {
            step = diff;
        }
        
        current += step;
        currentProgressRef.current = current;
        setProgress(current);
      }
      
      rafRef.current = requestAnimationFrame(update);
    };

    rafRef.current = requestAnimationFrame(update);

    // Lógica Virtual de Scroll (substitui o ScrollTrigger para evitar o bug de ir além do tamanho da tela)
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      // O deltaY define a direção. A magnitude define o quanto somamos ao alvo.
      // O multiplicador de 0.001 converte os pixels de scroll num range de 0 a 1.
      const rawDelta = e.deltaY * 0.001; 
      
      targetProgressRef.current = Math.max(0, Math.min(1, targetProgressRef.current + rawDelta));
    };

    const handleTouchStart = (e: TouchEvent) => {
      touchStartYRef.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const currentY = e.touches[0].clientY;
      const deltaY = touchStartYRef.current - currentY;
      touchStartYRef.current = currentY;
      
      const rawDelta = deltaY * 0.002;
      targetProgressRef.current = Math.max(0, Math.min(1, targetProgressRef.current + rawDelta));
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignora se estiver digitando num input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        targetProgressRef.current = Math.max(0, Math.min(1, targetProgressRef.current + 0.15));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        targetProgressRef.current = Math.max(0, Math.min(1, targetProgressRef.current - 0.15));
      }
    };

    // Previne comportamento de scroll nativo atrelando os listeners com passive: false
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('keydown', handleKeyDown, { passive: false });

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [containerRef]);

  return progress;
}
