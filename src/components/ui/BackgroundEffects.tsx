import { useEffect, useRef } from 'react';

export function BackgroundEffects() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false }); // Optimize by disabling alpha
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

    let resizeTimeout: number;
    const resize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(() => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        initParticles();
      }, 200); // Throttle resize
    };

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
        this.speedX = (Math.random() - 0.5) * 0.2;
        this.speedY = (Math.random() - 0.5) * 0.2;
        this.alpha = Math.random() * 0.4 + 0.1;
        
        const colors = [
          getComputedStyle(document.documentElement).getPropertyValue('--primary').trim(),
          getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
          '#ffffff'
        ];
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
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
      }
    }

    const initParticles = () => {
      particles = [];
      // Reduce particle count significantly for performance
      const particleCount = Math.min(window.innerWidth / 20, 40); 
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }
    };

    // Cache colors to avoid reading from DOM every frame
    let primary = '#a78bfa';
    let secondary = '#818cf8';
    let voidColor = '#050508';

    const updateColors = () => {
      const style = getComputedStyle(document.documentElement);
      primary = style.getPropertyValue('--primary').trim() || '#a78bfa';
      secondary = style.getPropertyValue('--secondary').trim() || '#818cf8';
      voidColor = style.getPropertyValue('--void').trim() || '#050508';
    };

    updateColors();
    const observer = new MutationObserver(updateColors);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    const drawNebula = (time: number) => {
      if (!ctx) return;
      
      ctx.globalAlpha = 1;
      ctx.fillStyle = voidColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const createOrb = (x: number, y: number, r: number, color: string, alpha: number) => {
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
        
        let rVal = 0, gVal = 0, bVal = 0;
        if (color.startsWith('#')) {
          const hex = color.replace('#', '');
          rVal = parseInt(hex.substring(0, 2), 16);
          gVal = parseInt(hex.substring(2, 4), 16);
          bVal = parseInt(hex.substring(4, 6), 16);
        }
        
        gradient.addColorStop(0, `rgba(${rVal}, ${gVal}, ${bVal}, ${alpha})`);
        gradient.addColorStop(1, `rgba(${rVal}, ${gVal}, ${bVal}, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      };

      const t = time * 0.00015; // Slower animation
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      
      ctx.globalCompositeOperation = 'screen';
      
      createOrb(
        cx + Math.sin(t) * cx * 0.5, 
        cy + Math.cos(t * 0.8) * cy * 0.5, 
        Math.max(canvas.width, canvas.height) * 0.6, 
        primary, 
        0.12
      );
      
      createOrb(
        cx + Math.cos(t * 1.2) * cx * 0.4, 
        cy + Math.sin(t * 1.1) * cy * 0.4, 
        Math.max(canvas.width, canvas.height) * 0.5, 
        secondary, 
        0.08
      );

      ctx.globalCompositeOperation = 'source-over';
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
    
    // Initial setup
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
    />
  );
}
