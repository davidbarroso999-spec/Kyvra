import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getSmoothScrollInstance } from '@/lib/smoothScroll';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    const lenis = getSmoothScrollInstance();
    if (lenis) {
      lenis.scrollTo(0, { immediate: true });
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    }
    
    // Recalcula gatilhos do ScrollTrigger na nova rota
    requestAnimationFrame(() => {
      ScrollTrigger.refresh();
      lenis?.resize();
    });
  }, [pathname]);

  return null;
}
