import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Disable smooth scrolling temporarily for the jump
    const html = document.documentElement;
    const originalScrollBehavior = html.style.scrollBehavior;
    
    html.style.scrollBehavior = 'auto';
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    
    // Restore original behavior in the next frame
    requestAnimationFrame(() => {
      html.style.scrollBehavior = originalScrollBehavior;
    });
  }, [pathname]);

  return null;
}
