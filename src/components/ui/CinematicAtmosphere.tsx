import React, { useEffect, useRef } from 'react';

interface CinematicAtmosphereProps {
  progress: number;
}

export function CinematicAtmosphere({ progress }: CinematicAtmosphereProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const isRunningRef = useRef<boolean>(false);

  // Primeiro frame: visível de 0.0 até 0.16 (pico em 0.0)
  const firstFrameWeight = Math.max(0, 1 - progress / 0.14);
  // Último frame: visível de 0.88 até 1.0 (pico em 1.0)
  const lastFrameWeight = Math.max(0, (progress - 0.88) / 0.12);

  const isActive = firstFrameWeight > 0.01 || lastFrameWeight > 0.01;

  // Refs de estado dinâmico para evitar recriação de listeners
  const weightsRef = useRef({ first: firstFrameWeight, last: lastFrameWeight, active: isActive });
  weightsRef.current = { first: firstFrameWeight, last: lastFrameWeight, active: isActive };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize, { passive: true });

    // Quantidade otimizada de partículas (menor em mobile para 60fps cravados)
    const isMobile = window.innerWidth < 768;
    const MAX_STORM_PARTICLES = isMobile ? 18 : 36;

    interface StormParticle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      maxLife: number;
      life: number;
      type: 'fog' | 'ember' | 'dust';
    }

    const stormParticles: StormParticle[] = [];

    for (let i = 0; i < MAX_STORM_PARTICLES; i++) {
      stormParticles.push({
        x: Math.random() * width,
        y: height * 0.4 + Math.random() * (height * 0.6),
        vx: 0.8 + Math.random() * 1.6,
        vy: -0.1 + Math.random() * 0.3,
        size: 16 + Math.random() * 40,
        alpha: 0.04 + Math.random() * 0.1,
        maxLife: 140 + Math.random() * 180,
        life: Math.random() * 180,
        type: Math.random() > 0.45 ? 'fog' : Math.random() > 0.5 ? 'ember' : 'dust',
      });
    }

    let lightningTimer = 90 + Math.random() * 140;
    let lightningIntensity = 0;
    let lightningFlashDuration = 0;
    let frameCount = 0;

    const render = () => {
      const { first, last, active } = weightsRef.current;

      // Pausa imediatamente se fora das áreas de efeito (0% CPU/GPU no meio do scroll)
      if (!active) {
        ctx.clearRect(0, 0, width, height);
        isRunningRef.current = false;
        return;
      }

      frameCount++;
      ctx.clearRect(0, 0, width, height);

      // =========================================================================
      // 1. EFEITO DE TEMPESTADE: Relâmpagos e Névoa no Céu
      // =========================================================================
      const stormWeight = Math.max(first, last);

      if (stormWeight > 0.01) {
        lightningTimer--;
        if (lightningTimer <= 0) {
          lightningFlashDuration = 3 + Math.floor(Math.random() * 5);
          lightningIntensity = 0.3 + Math.random() * 0.4;
          lightningTimer = 160 + Math.random() * 240;
        }

        if (lightningFlashDuration > 0) {
          lightningFlashDuration--;
          const flicker = Math.sin(frameCount * 2.5) * 0.2 + 0.8;
          const currentFlash = lightningIntensity * flicker * stormWeight;

          const grad = ctx.createLinearGradient(0, 0, 0, height * 0.5);
          grad.addColorStop(0, `rgba(210, 225, 255, ${currentFlash * 0.5})`);
          grad.addColorStop(0.3, `rgba(180, 205, 255, ${currentFlash * 0.25})`);
          grad.addColorStop(1, 'rgba(180, 205, 255, 0)');

          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, width, height * 0.5);
        }

        // Névoa atmosférica superior
        const skyFogGrad = ctx.createLinearGradient(0, 0, 0, height * 0.4);
        skyFogGrad.addColorStop(0, `rgba(15, 23, 42, ${0.35 * stormWeight})`);
        skyFogGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = skyFogGrad;
        ctx.fillRect(0, 0, width, height * 0.4);
      }

      // =========================================================================
      // 2. PRIMEIRO FRAME: Vento e Fumaça Rasteira
      // =========================================================================
      if (first > 0.01) {
        const groundFog = ctx.createLinearGradient(0, height * 0.55, 0, height);
        const fogPulse = Math.sin(frameCount * 0.02) * 0.03 + 0.12;
        groundFog.addColorStop(0, 'rgba(0, 0, 0, 0)');
        groundFog.addColorStop(1, `rgba(10, 15, 30, ${fogPulse * first})`);

        ctx.fillStyle = groundFog;
        ctx.fillRect(0, height * 0.55, width, height * 0.45);

        for (let i = 0; i < stormParticles.length; i++) {
          const p = stormParticles[i];
          p.life++;
          p.x += p.vx * 1.3;
          p.y += p.vy;

          if (p.x > width + 60 || p.life >= p.maxLife) {
            p.x = -50;
            p.y = height * 0.55 + Math.random() * (height * 0.4);
            p.life = 0;
          }

          const lifeRatio = Math.sin((p.life / p.maxLife) * Math.PI);
          const currentAlpha = p.alpha * lifeRatio * first;

          if (p.type === 'fog') {
            const rad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
            rad.addColorStop(0, `rgba(148, 163, 184, ${currentAlpha * 0.5})`);
            rad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = rad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
          } else if (p.type === 'ember') {
            ctx.fillStyle = `rgba(251, 146, 60, ${currentAlpha * 1.2})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillStyle = `rgba(226, 232, 240, ${currentAlpha * 0.6})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 0.8, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    // Inicia a animação apenas se ativo
    if (isActive && !isRunningRef.current) {
      isRunningRef.current = true;
      animFrameRef.current = requestAnimationFrame(render);
    }

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      isRunningRef.current = false;
      window.removeEventListener('resize', handleResize);
    };
  }, [isActive]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
      style={{
        opacity: isActive ? 1 : 0,
        transition: 'opacity 0.3s ease-out',
        mixBlendMode: 'screen',
      }}
    />
  );
}
