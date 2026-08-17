import { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function useScrollProgress(containerRef: React.RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0);
  const targetProgressRef = useRef(0);
  const currentProgressRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const st = ScrollTrigger.create({
      trigger: container,
      start: 'top top',
      end: 'bottom bottom',
      scrub: false, // Desativamos o scrub nativo para controlar a física manualmente
      onUpdate: (self) => {
        targetProgressRef.current = self.progress;
      },
    });

    // Velocidade fixa máxima: ~4.7 segundos para rodar a animação inteira de 0 a 100%
    // Isso garante que mesmo um scroll violento vai rodar os frames a uma velocidade legível
    const maxVelocity = 0.0035; 

    const update = () => {
      const target = targetProgressRef.current;
      let current = currentProgressRef.current;
      
      const diff = target - current;
      
      if (Math.abs(diff) > 0.0001) {
        // Fator de suavização de 15% por frame
        let step = diff * 0.15;
        
        // Se a intensidade da suavização ultrapassar nossa velocidade limite, nós a capamos.
        // Isso cria a sensação de "velocidade constante" em scrolls intensos.
        if (Math.abs(step) > maxVelocity) {
            step = Math.sign(step) * maxVelocity;
        }
        
        current += step;
        currentProgressRef.current = current;
        setProgress(current);
      } else if (current !== target) {
        currentProgressRef.current = target;
        setProgress(target);
      }
      
      rafRef.current = requestAnimationFrame(update);
    };

    rafRef.current = requestAnimationFrame(update);

    ScrollTrigger.refresh();

    return () => {
      st.kill();
      cancelAnimationFrame(rafRef.current);
    };
  }, [containerRef]);

  return progress;
}
