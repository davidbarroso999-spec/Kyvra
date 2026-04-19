import React, { useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';

interface UseHorizontalSliderOptions {
  ease?: number;
  cardWidth?: number;
  gap?: number;
  scaleMax?: number;
  scaleMin?: number;
  offsetMultiplier?: number;
  snapPoints?: number[]; // Posições onde os cards ficam no centro
}

export function useHorizontalSlider(
  wrapperRef: React.RefObject<HTMLDivElement>,
  slideRefs: React.RefObject<HTMLDivElement[]>,
  options: UseHorizontalSliderOptions = {}
) {
  const {
    ease = 0.075,
    scaleMax = 1.75,
    scaleMin = 0.5,
    offsetMultiplier = 300,
  } = options;

  const targetRef  = useRef(0);
  const currentRef = useRef(0);
  const rafRef     = useRef(0);
  const maxScrollRef = useRef(0);
  
  // Variáveis para detectar inércia e forçar o snap
  const isDraggingRef = useRef(false);
  const velocityRef = useRef(0);
  const lastTargetRef = useRef(0);
  const snapPointsRef = useRef<number[]>([]);

  const lerp = (start: number, end: number, factor: number) =>
    start + (end - start) * factor;

  const forceSnap = useCallback((velocity = 0, overrideTarget?: number) => {
    if (!snapPointsRef.current.length || !isDraggingRef.current === false && overrideTarget === undefined) return;

    let baseTarget = overrideTarget !== undefined ? overrideTarget : targetRef.current;

    // Multiplicador de intenção (puxa muito mais forte dependendo da velocidade de soltura).
    // O swipe de um toque gera valores como 20 a 50 de delta entre frames.
    // Assim, multiplicando por 25, o alvo é lançado centenas de pixels para frente,
    // garantindo que ele chegue ou passe do próximo "snap point"
    let projectedTarget = baseTarget + (velocity * 25);

    let closestSnap = snapPointsRef.current[0];
    let minDiff = Infinity;

    snapPointsRef.current.forEach((snap) => {
      const diff = Math.abs(snap - projectedTarget);
      if (diff < minDiff) {
        minDiff = diff;
        closestSnap = snap;
      }
    });

    // Ancra o destino no snap exato! A inércia natural do lerp fará o resto de forma suave
    targetRef.current = closestSnap;
  }, []);

  // Função para calcular os pontos de snap baseados na posição real dos itens
  const calculateSnapPoints = useCallback(() => {
    if (!wrapperRef.current || !slideRefs.current?.length) return;
    
    // Calcula as posições centrais ideais para cada card
    // Como a animação move o wrapper, um card estará no centro quando
    // wrapper.x for: (offset inicial do card) + (metade da largura do card) - (metade da tela)
    
    const centerScreen = window.innerWidth / 2;
    const newSnapPoints: number[] = [];
    
    slideRefs.current.forEach((slide) => {
      if (!slide) return;
      // Usamos offsetLeft bruto para saber a posição natural do card na div,
      // sem a distorção da matriz de transformação do GSAP
      const originX = slide.offsetLeft;
      const originWidth = slide.offsetWidth;
      
      let snapPos = originX + (originWidth / 2) - centerScreen;
      
      // Limites: não faz snap além do início nem do fim do scroll máximo
      snapPos = Math.max(0, Math.min(maxScrollRef.current, snapPos));
      newSnapPoints.push(snapPos);
    });
    
    snapPointsRef.current = newSnapPoints;
  }, [slideRefs, wrapperRef]);

  const updateScaleAndPosition = useCallback(() => {
    const slides = slideRefs.current;
    if (!slides) return;

    slides.forEach((slide) => {
      if (!slide) return;
      const rect   = slide.getBoundingClientRect();
      const center = (rect.left + rect.right) / 2;
      const dist   = center - window.innerWidth / 2;

      let scale: number, offsetX: number;

      if (dist > 0) {
        // à direita do centro: cresce
        scale   = Math.min(scaleMax, 1 + dist / window.innerWidth);
        offsetX = (scale - 1) * offsetMultiplier;
      } else {
        // à esquerda do centro: encolhe
        scale   = Math.max(scaleMin, 1 - Math.abs(dist) / window.innerWidth);
        offsetX = 0;
      }

      gsap.set(slide, { scale, x: offsetX });
    });
  }, [scaleMax, scaleMin, offsetMultiplier, slideRefs]);

  const update = useCallback(() => {
    currentRef.current = lerp(currentRef.current, targetRef.current, ease);

    if (wrapperRef.current) {
      gsap.set(wrapperRef.current, { x: -currentRef.current });
    }

    updateScaleAndPosition();
    rafRef.current = requestAnimationFrame(update);
  }, [ease, wrapperRef, updateScaleAndPosition]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    // calcula o scroll máximo
    const recalcMax = () => {
      maxScrollRef.current = wrapper.scrollWidth - window.innerWidth;
      calculateSnapPoints(); // Recalcula pontos de snap quando redimensiona
    };

    // delay pequeno pra garantir que o DOM já renderizou tamanhos
    const delayRecalc = setTimeout(recalcMax, 100);
    
    window.addEventListener('resize', recalcMax);

    // scroll de roda do mouse → movimento horizontal
    let wheelTimeout: NodeJS.Timeout;
    let wheelVelocity = 0;
    const handleWheel = (e: WheelEvent) => {
      // Se o scroll for primariamente vertical (scrollando a página para baixo/cima), ignoramos o carrossel.
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) return;

      isDraggingRef.current = true;
      clearTimeout(wheelTimeout);
      
      const delta = e.deltaX;
      
      // Mantém um valor leve caso termine no mouse wheel (trackpads já têm snap natural mas não queremos pular muitos)
      wheelVelocity = delta;

      targetRef.current += delta;
      targetRef.current = Math.max(0, targetRef.current);
      targetRef.current = Math.min(maxScrollRef.current, targetRef.current);
      
      wheelTimeout = setTimeout(() => {
        isDraggingRef.current = false;
        forceSnap(wheelVelocity > 0 ? 5 : (wheelVelocity < 0 ? -5 : 0));
      }, 100);
    };

    // drag para dispositivos touch / mobile
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTarget = 0;
    let lastTouchX = 0;
    let touchVelocity = 0;
    let isVerticalSwipe = false;
    let isFirstMove = true;

    const handleTouchStart = (e: TouchEvent) => {
      isDraggingRef.current = true;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      lastTouchX = e.touches[0].clientX;
      touchStartTarget = targetRef.current;
      touchVelocity = 0;
      isVerticalSwipe = false;
      isFirstMove = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isVerticalSwipe) return;

      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;

      if (isFirstMove) {
        // Trava o eixo: se arrastou mais no Y do que no X no primeiro movimento, é um scroll da página puro.
        if (Math.abs(currentY - touchStartY) > Math.abs(currentX - touchStartX)) {
          isVerticalSwipe = true;
          isDraggingRef.current = false; // Desliga o arraste para o snap voltar ao normal
          return;
        }
        isFirstMove = false;
      }

      touchVelocity = lastTouchX - currentX; // Positivo se deslizar para ESQUERDA (intenção de ir p/ DIREITA na lista)
      lastTouchX = currentX;

      const delta = touchStartX - currentX;
      targetRef.current = Math.max(0, Math.min(
        maxScrollRef.current,
        touchStartTarget + delta * 1.5  // 1.5× para mais responsividade
      ));
    };
    
    const handleTouchEnd = () => {
      if (isVerticalSwipe) return;
      isDraggingRef.current = false;
      forceSnap(touchVelocity);
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    // inicia o loop de animação
    rafRef.current = requestAnimationFrame(update);

    return () => {
      clearTimeout(delayRecalc);
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', recalcMax);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [update, wrapperRef, calculateSnapPoints]);

  // função para navegar programaticamente (para botões de seta)
  const scrollTo = useCallback((position: number) => {
    isDraggingRef.current = false; // Permite que ele encaixe
    targetRef.current = Math.max(0, Math.min(maxScrollRef.current, position));
    forceSnap(0, targetRef.current);
  }, [forceSnap]);

  const scrollBy = useCallback((delta: number) => {
    scrollTo(targetRef.current + delta);
  }, [scrollTo]);

  return { scrollTo, scrollBy, currentRef, targetRef };
}
