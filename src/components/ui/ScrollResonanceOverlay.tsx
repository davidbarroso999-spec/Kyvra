import React, { useEffect, useRef, useState } from 'react';
import { subscribeResonanceState, ResonanceState } from '@/lib/scrollAudioResonance';
import { useStore, Theme } from '@/store/useStore';

const THEME_ACCENTS: Record<Theme, { hex: string; rgba: string }> = {
  abissal: { hex: '#a78bfa', rgba: 'rgba(167, 139, 250,' },
  'sangue-de-drago': { hex: '#ef4444', rgba: 'rgba(239, 68, 68,' },
  'floresta-negra': { hex: '#10b981', rgba: 'rgba(16, 185, 129,' },
  monolito: { hex: '#e2e8f0', rgba: 'rgba(226, 232, 240,' },
};

export function ScrollResonanceOverlay() {
  const currentTheme = useStore((state) => state.theme);
  const isEnabled = useStore((state) => state.scrollResonanceEnabled);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const stateRef = useRef<ResonanceState>({ intensity: 0, velocity: 0, direction: 1 });
  const smoothedIntensity = useRef(0);
  const isRunning = useRef(false);

  // Wavefront ripples array
  const ripples = useRef<{
    radius: number;
    maxRadius: number;
    alpha: number;
    speed: number;
    y: number;
  }[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeResonanceState((newState) => {
      stateRef.current = newState;
      if (newState.intensity > 0.02 && !isRunning.current && isEnabled) {
        isRunning.current = true;
        animFrameRef.current = requestAnimationFrame(render);
      }
    });

    return () => {
      unsubscribe();
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isEnabled]);

  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      isRunning.current = false;
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      isRunning.current = false;
      return;
    }

    const targetIntensity = isEnabled ? stateRef.current.intensity : 0;
    // Interpolação suave para acompanhar o decaimento do áudio (delay decay)
    smoothedIntensity.current += (targetIntensity - smoothedIntensity.current) * 0.12;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const themeColors = THEME_ACCENTS[currentTheme] || THEME_ACCENTS.abissal;

    // 1. Vinheta Periférica de Ressonância (Borda acústica)
    if (smoothedIntensity.current > 0.01) {
      const vignetteGrad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        Math.min(width, height) * 0.35,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.75
      );

      const auraAlpha = smoothedIntensity.current * 0.08; // Sutilíssimo
      vignetteGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vignetteGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0)');
      vignetteGrad.addColorStop(1, `${themeColors.rgba} ${auraAlpha})`);

      ctx.fillStyle = vignetteGrad;
      ctx.fillRect(0, 0, width, height);
    }

    // 2. Ondas de Frente de Ressonância (Acoustic Wavefront Ripples)
    if (targetIntensity > 0.15 && Math.random() < targetIntensity * 0.45) {
      const centerY = stateRef.current.direction > 0 ? height * 0.25 : height * 0.75;
      ripples.current.push({
        radius: 10,
        maxRadius: Math.max(width, height) * 0.55,
        alpha: 0.14 * targetIntensity,
        speed: 4 + Math.abs(stateRef.current.velocity) * 2.5,
        y: centerY,
      });
    }

    for (let i = ripples.current.length - 1; i >= 0; i--) {
      const r = ripples.current[i];
      r.radius += r.speed;
      const progress = r.radius / r.maxRadius;
      const currentAlpha = r.alpha * (1 - progress);

      if (progress >= 1 || currentAlpha <= 0.002) {
        ripples.current.splice(i, 1);
        continue;
      }

      ctx.beginPath();
      ctx.ellipse(width / 2, r.y, r.radius, r.radius * 0.35, 0, 0, Math.PI * 2);
      ctx.lineWidth = 1;
      ctx.strokeStyle = `${themeColors.rgba} ${currentAlpha})`;
      ctx.stroke();
    }

    // Continua rodando se ainda houver intensidade ou ondas visíveis
    if (smoothedIntensity.current > 0.005 || ripples.current.length > 0) {
      animFrameRef.current = requestAnimationFrame(render);
    } else {
      ctx.clearRect(0, 0, width, height);
      isRunning.current = false;
    }
  };

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    handleResize();
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-[12] w-full h-full"
      style={{
        mixBlendMode: 'screen',
        contain: 'strict',
      }}
    />
  );
}
