import React, { useRef, useEffect } from 'react';
import { useAudioAnalyser } from '@/hooks/useAudioAnalyser';

interface AudioVisualizerProps {
  className?: string;
  variant?: 'bars' | 'wave' | 'circle';
  fftSize?: number;
  barColor?: string;
  glow?: boolean;
}

/**
 * Componente <AudioVisualizer /> que renderiza um espectro responsivo de áudio usando Canvas.
 * Oferece três modos de visualização (barras, ondas e circular orbital) e animação orgânica de fallback.
 */
export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  className = '',
  variant = 'bars',
  fftSize = 256,
  barColor,
  glow = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { analyser, audioElement } = useAudioAnalyser({ fftSize });
  const themeColorRef = useRef<string>('#a78bfa'); // Cor padrão violeta de Kyvra
  const animationRef = useRef<number>(0);

  // Escuta mudanças de tema nas classes do documento para obter a cor de acento atual
  useEffect(() => {
    const updateThemeColor = () => {
      const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
      if (primary) {
        themeColorRef.current = primary;
      }
    };

    updateThemeColor();
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(m => {
        if (m.attributeName === 'class') {
          updateThemeColor();
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let resizeObserver: ResizeObserver | null = null;

    const handleResize = (entries: ResizeObserverEntry[]) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        canvas.width = width * window.devicePixelRatio;
        canvas.height = height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
    };

    if (canvas.parentElement) {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(canvas.parentElement);
      
      // Setup inicial de dimensões baseando-se no elemento pai
      canvas.width = canvas.parentElement.clientWidth * window.devicePixelRatio;
      canvas.height = canvas.parentElement.clientHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      const width = canvas.width / window.devicePixelRatio;
      const height = canvas.height / window.devicePixelRatio;

      ctx.clearRect(0, 0, width, height);

      const color = barColor || themeColorRef.current;
      ctx.fillStyle = color;
      ctx.strokeStyle = color;

      const isPlaying = audioElement && !audioElement.paused;
      const isAndroid = typeof window !== 'undefined' && /android/i.test(navigator.userAgent);

      // Reset de configurações globais de sombra a cada quadro para evitar vazamento de estilos
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1.0;

      // Se não houver Web Audio (analisador indisponível, iOS/Android WebView que bloqueia, etc.), 
      // renderizamos uma simulação matemática bonita para manter a interface viva e dinâmica.
      if (!analyser || isAndroid) {
        const time = Date.now() * 0.003;

        if (variant === 'bars') {
          const visualBins = 48;
          const gap = 3;
          const barWidth = (width - (visualBins - 1) * gap) / visualBins;

          for (let i = 0; i < visualBins; i++) {
            let percent = 0.04;
            if (isPlaying) {
              const w1 = Math.sin(time + i * 0.18) * 0.45 + 0.5;
              const w2 = Math.cos(time * 0.85 - i * 0.12) * 0.35 + 0.35;
              percent = (w1 * 0.6 + w2 * 0.4);
              percent = Math.max(0.05, percent * (0.8 + Math.random() * 0.2));
            }
            const barHeight = percent * height * 0.8;

            if (glow) {
              ctx.shadowBlur = 8;
              ctx.shadowColor = color;
            }

            ctx.beginPath();
            ctx.roundRect(
              i * (barWidth + gap),
              height - barHeight,
              barWidth,
              barHeight,
              Math.min(2, barWidth / 2)
            );
            ctx.fill();
          }
        } else if (variant === 'wave') {
          ctx.beginPath();
          ctx.lineWidth = 2.5;
          if (glow) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = color;
          }

          const points = 80;
          for (let i = 0; i < points; i++) {
            const x = (i / (points - 1)) * width;
            let y = height / 2;
            if (isPlaying) {
              const wave1 = Math.sin(time + i * 0.12) * 16;
              const wave2 = Math.cos(time * 1.4 + i * 0.06) * 8;
              y += wave1 + wave2;
            } else {
              y += Math.sin(i * 0.1) * 1.5;
            }
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        } else if (variant === 'circle') {
          const centerX = width / 2;
          const centerY = height / 2;
          const radius = Math.min(width, height) * 0.28;
          const points = 72;

          ctx.beginPath();
          if (glow) {
            ctx.shadowBlur = 12;
            ctx.shadowColor = color;
          }

          for (let i = 0; i < points; i++) {
            const angle = (i / points) * Math.PI * 2;
            let offset = 0;
            if (isPlaying) {
              offset = (Math.sin(time * 2.2 + i * 0.25) * 10) + (Math.cos(time * 0.8 - i * 0.15) * 5);
            }
            const r = radius + offset;
            const x = centerX + Math.cos(angle) * r;
            const y = centerY + Math.sin(angle) * r;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }
        return;
      }

      // ───────────────────────────────────────────────────────────
      // CÓDIGO DO ANALISADOR REAL (WEB AUDIO API ATIVA)
      // ───────────────────────────────────────────────────────────
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      if (variant === 'bars') {
        const visualBins = Math.min(64, bufferLength);
        const gap = 3;
        const barWidth = (width - (visualBins - 1) * gap) / visualBins;

        for (let i = 0; i < visualBins; i++) {
          const dataIndex = Math.floor((i / visualBins) * bufferLength * 0.85);
          const rawValue = dataArray[dataIndex] || 0;
          const percent = Math.pow(rawValue / 255, 1.25);
          const barHeight = Math.max(3, percent * height * 0.85);

          if (glow) {
            ctx.shadowBlur = Math.min(12, percent * 15);
            ctx.shadowColor = color;
          }

          ctx.globalAlpha = percent * 0.75 + 0.25;
          ctx.beginPath();
          ctx.roundRect(
            i * (barWidth + gap),
            height - barHeight,
            barWidth,
            barHeight,
            Math.min(2, barWidth / 2)
          );
          ctx.fill();
        }
      } else if (variant === 'wave') {
        ctx.beginPath();
        ctx.lineWidth = 2.5;
        if (glow) {
          ctx.shadowBlur = 10;
          ctx.shadowColor = color;
        }

        const points = Math.min(100, bufferLength);
        for (let i = 0; i < points; i++) {
          const x = (i / (points - 1)) * width;
          const dataIndex = Math.floor((i / points) * bufferLength);
          const rawValue = dataArray[dataIndex] || 0;
          const percent = rawValue / 255;

          const offset = (percent - 0.5) * height * 0.55;
          const y = height / 2 + offset;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else if (variant === 'circle') {
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) * 0.3;
        const points = Math.min(80, bufferLength);

        ctx.beginPath();
        if (glow) {
          ctx.shadowBlur = 12;
          ctx.shadowColor = color;
        }

        for (let i = 0; i < points; i++) {
          const angle = (i / points) * Math.PI * 2;
          const dataIndex = Math.floor((i / points) * bufferLength * 0.8);
          const rawValue = dataArray[dataIndex] || 0;
          const percent = rawValue / 255;

          const r = radius + (percent * 32);
          const x = centerX + Math.cos(angle) * r;
          const y = centerY + Math.sin(angle) * r;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [analyser, audioElement, variant, barColor, glow]);

  return (
    <div id="audio-visualizer" className={`relative w-full h-full overflow-hidden ${className}`}>
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};
