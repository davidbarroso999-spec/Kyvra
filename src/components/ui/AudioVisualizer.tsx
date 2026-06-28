import React, { useRef, useEffect } from 'react';
import { useAudioAnalyser } from '@/hooks/useAudioAnalyser';

interface AudioVisualizerProps {
  className?: string;
  variant?: 'bars' | 'wave' | 'circle'; // Mantido para compatibilidade de tipos
  fftSize?: number;
  barColor?: string;
  glow?: boolean;
}

/**
 * Componente <AudioVisualizer /> Único e Supremo.
 * Renderiza um espectro de áudio místico e responsivo, adaptado aos temas de Kyvra,
 * com pulsação de glow sincronizada em tempo real com as batidas de graves (graves reais)
 * e animação flutuante poética de repouso (fallback).
 */
export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  className = '',
  fftSize = 256,
  barColor,
  glow = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Usamos fftSize 256 por padrão para maior densidade de resposta e performance estelar
  const { analyser, audioElement } = useAudioAnalyser({ fftSize: 256 });
  const themeColorRef = useRef<string>('#a78bfa'); // Cor primária de Kyvra
  const animationRef = useRef<number>(0);
  const smoothedHeights = useRef<number[]>([]);

  // Monitora as classes do documento para obter dinamicamente a cor de acento de cada tema (--primary)
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
      
      canvas.width = canvas.parentElement.clientWidth * window.devicePixelRatio;
      canvas.height = canvas.parentElement.clientHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      const width = canvas.width / window.devicePixelRatio;
      const height = canvas.height / window.devicePixelRatio;

      // Limpeza suave do canvas
      ctx.clearRect(0, 0, width, height);

      const color = barColor || themeColorRef.current;
      const isPlaying = audioElement && !audioElement.paused;
      const time = Date.now() * 0.002;

      // Definir quantidade de barras e canais de frequência
      const visualBins = 52;
      
      // Inicializar array de alturas suavizadas se necessário
      if (smoothedHeights.current.length !== visualBins) {
        smoothedHeights.current = new Array(visualBins).fill(5);
      }

      let bassIntensity = 0;

      // 1. LEITURA DOS DADOS EM TEMPO REAL OU FALLBACK SUTIL
      if (analyser && isPlaying) {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        // Extrai a energia dos graves para modular a pulsação do glow de fundo
        let bassSum = 0;
        const bassEndIndex = Math.min(10, bufferLength);
        for (let i = 1; i < bassEndIndex; i++) {
          bassSum += dataArray[i];
        }
        bassIntensity = bassSum / ((bassEndIndex - 1) * 255);

        // Preenche as barras com dados de frequência reais suavizados
        for (let i = 0; i < visualBins; i++) {
          // Mapeia os dados focando mais na faixa de frequências audíveis ricas (graves e médios)
          const dataIndex = Math.floor((i / visualBins) * bufferLength * 0.75);
          const rawValue = dataArray[dataIndex] || 0;
          const targetPercent = Math.pow(rawValue / 255, 1.25);
          
          // Suavização temporal (lerp) para evitar pulos bruscos e dar fluidez premium
          smoothedHeights.current[i] += (targetPercent - smoothedHeights.current[i]) * 0.28;
        }
      } else {
        // Fallback: Respiração cósmica calma e poética quando em repouso
        bassIntensity = (Math.sin(time * 0.5) * 0.5 + 0.5) * 0.15;
        
        for (let i = 0; i < visualBins; i++) {
          let percent = 0.02;
          if (isPlaying) {
            // Se estiver tocando mas sem analisador ativo (iOS/etc), gera ondas orgânicas bonitas
            const wave1 = Math.sin(time + i * 0.15) * 0.45 + 0.5;
            const wave2 = Math.cos(time * 0.75 - i * 0.08) * 0.35 + 0.35;
            percent = (wave1 * 0.6 + wave2 * 0.4) * 0.7;
          } else {
            // Respiração ociosa suave
            percent = (Math.sin(time * 0.8 + i * 0.12) * 0.5 + 0.5) * 0.06 + 0.02;
          }
          smoothedHeights.current[i] += (percent - smoothedHeights.current[i]) * 0.15;
        }
      }

      // 2. DESENHO DA AURA/GLOW PULSANTE DE FUNDO (BEAT GLOW)
      if (glow) {
        ctx.save();
        const glowOpacity = 0.03 + bassIntensity * 0.12;
        const glowRadius = Math.max(120, Math.min(width, height) * 0.4 * (1 + bassIntensity * 0.35));
        
        const radialGradient = ctx.createRadialGradient(
          width / 2, height / 2, 10,
          width / 2, height / 2, glowRadius
        );
        radialGradient.addColorStop(0, color.replace(')', `, ${glowOpacity})`).replace('rgb', 'rgba'));
        radialGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = radialGradient;
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, glowRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 3. DESENHO DO ESPECTRO DO SOM ÚNICO (SIMÉTRICO CENTRAL)
      const gap = 4;
      const barWidth = (width - (visualBins - 1) * gap) / visualBins;
      const centerY = height / 2;

      for (let i = 0; i < visualBins; i++) {
        const percent = smoothedHeights.current[i] || 0.02;
        // Altura total de cada barra (distribuída simetricamente para cima e para baixo do centro)
        const barHeight = Math.max(4, percent * height * 0.78);
        const x = i * (barWidth + gap);
        
        // Criar gradiente de cor vertical para a barra que brilha mais nas pontas (estilo neon)
        const barGradient = ctx.createLinearGradient(x, centerY - barHeight / 2, x, centerY + barHeight / 2);
        // Nas bordas extremas, o brilho é máximo. No centro, fica mais sutil e translúcido.
        barGradient.addColorStop(0, color); // Ponta superior brilhante
        barGradient.addColorStop(0.5, color.replace(')', ', 0.35)').replace('rgb', 'rgba')); // Centro sutil
        barGradient.addColorStop(1, color); // Ponta inferior brilhante

        ctx.fillStyle = barGradient;

        if (glow) {
          ctx.shadowBlur = Math.min(14, percent * 18);
          ctx.shadowColor = color;
        } else {
          ctx.shadowBlur = 0;
        }

        // Aplica opacidade proporcional para dar profundidade de camadas
        ctx.globalAlpha = percent * 0.65 + 0.35;

        // Desenha a barra simétrica central arredondada
        ctx.beginPath();
        ctx.roundRect(
          x,
          centerY - barHeight / 2,
          Math.max(0.1, barWidth),
          barHeight,
          Math.max(0, Math.min(3, barWidth / 2))
        );
        ctx.fill();
      }

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1.0;
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [analyser, audioElement, barColor, glow]);

  return (
    <div 
      id="audio-visualizer" 
      className={`relative w-full h-full overflow-hidden ${className}`}
      style={{ transform: 'translateZ(0)' }}
    >
      <canvas 
        ref={canvasRef} 
        className="block w-full h-full" 
        style={{ transform: 'translateZ(0)' }}
      />
    </div>
  );
};
