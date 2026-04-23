import { useEffect, useRef } from 'react';

// Helper to convert hex to RGB efficiently outside the render loop
const hexToRgb = (hex: string) => {
  const cleanHex = hex.replace('#', '');
  return {
    r: parseInt(cleanHex.substring(0, 2), 16) || 0,
    g: parseInt(cleanHex.substring(2, 4), 16) || 0,
    b: parseInt(cleanHex.substring(4, 6), 16) || 0
  };
};

export function BackgroundEffects() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext('2d', { alpha: false });
    } catch (e) {
      console.error("Failed to get canvas context:", e);
      return;
    }
    
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    let isVisible = true;

    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
      if (isVisible) {
        animate(performance.now());
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const isMobile = window.innerWidth <= 768;

    let resizeTimeout: number;
    const resize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(() => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        initParticles();
      }, 200);
    };

    const TWO_PI = Math.PI * 2;

    class Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      color: string;
      alpha: number;

      constructor() {
        this.x = Math.random() * canvas!.width;
        this.y = Math.random() * canvas!.height;
        this.size = Math.random() * 1.5 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.15;
        this.speedY = (Math.random() - 0.5) * 0.15;
        this.alpha = Math.random() * 0.4 + 0.1;
        
        const colors = [primary, accent, '#ffffff'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x > canvas!.width) this.x = 0;
        else if (this.x < 0) this.x = canvas!.width;
        
        if (this.y > canvas!.height) this.y = 0;
        else if (this.y < 0) this.y = canvas!.height;
      }

      draw() {
        if (!ctx) return;
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, TWO_PI);
        ctx.fill();
      }
    }

    let primary = '#a78bfa';
    let secondary = '#818cf8';
    let accent = '#2dd4bf';
    let voidColor = '#050508';
    let rgbPrimary = hexToRgb(primary);
    let rgbSecondary = hexToRgb(secondary);

    const updateColors = () => {
      const style = getComputedStyle(document.documentElement);
      primary = style.getPropertyValue('--primary').trim() || '#a78bfa';
      secondary = style.getPropertyValue('--secondary').trim() || '#818cf8';
      accent = style.getPropertyValue('--accent').trim() || '#2dd4bf';
      voidColor = style.getPropertyValue('--void').trim() || '#050508';
      rgbPrimary = hexToRgb(primary);
      rgbSecondary = hexToRgb(secondary);
    };

    updateColors();
    const observer = new MutationObserver(updateColors);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    const initParticles = () => {
      particles = [];
      // Extreme particle reduction for Bacterium tier
      const count = isMobile ? Math.min(window.innerWidth / 40, 15) : Math.min(window.innerWidth / 25, 30); 
      for (let i = 0; i < count; i++) {
        particles.push(new Particle());
      }
    };

    // Pre-calculate to avoid loop instantiations
    const drawNebula = (time: number) => {
      if (!ctx) return;
      
      ctx.globalAlpha = 1;
      ctx.fillStyle = voidColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // On mobile, skip the expensive gradients to save GPU/Battery
      if (isMobile) return;

      const createOrb = (x: number, y: number, r: number, rgb: {r: number, g: number, b: number}, alpha: number) => {
        const gradient = ctx!.createRadialGradient(x, y, 0, x, y, r);
        gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`);
        gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
        ctx!.fillStyle = gradient;
        ctx!.fillRect(0, 0, canvas.width, canvas.height);
      };

      const t = time * 0.0001; 
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      
      // Removed globalCompositeOperation screen due to high cost on mobile/low-end
      createOrb(
        cx + Math.sin(t) * cx * 0.4, 
        cy + Math.cos(t * 0.7) * cy * 0.4, 
        Math.max(canvas.width, canvas.height) * 0.6, 
        rgbPrimary, 
        0.08
      );
      
      createOrb(
        cx + Math.cos(t * 1.1) * cx * 0.3, 
        cy + Math.sin(t * 0.9) * cy * 0.3, 
        Math.max(canvas.width, canvas.height) * 0.5, 
        rgbSecondary, 
        0.05
      );
    };

    const animate = (time: number) => {
      if (!isVisible) return;

      drawNebula(time);
      
      particles.forEach(particle => {
        particle.update();
        particle.draw();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resize);
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initParticles();
    animate(performance.now());

    return () => {
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      observer.disconnect();
      clearTimeout(resizeTimeout);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none"
      style={{ transform: 'translateZ(0)', willChange: 'transform' }}
    />
  );
}
