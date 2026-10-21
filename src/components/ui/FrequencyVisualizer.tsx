import React, { useRef, useEffect } from 'react';
import { useAudioAnalyser } from '@/hooks/useAudioAnalyser';
import { useStore, Theme } from '@/store/useStore';

interface FrequencyVisualizerProps {
  className?: string;
  opacity?: number;
}

const THEME_WAVE_COLORS: Record<Theme, string[]> = {
  abissal: [
    'rgba(167, 139, 250, 0.08)',
    'rgba(124, 58, 237, 0.06)',
    'rgba(245, 243, 255, 0.03)',
    'rgba(45, 212, 191, 0.05)'
  ],
  'sangue-de-drago': [
    'rgba(239, 68, 68, 0.12)',
    'rgba(153, 27, 27, 0.09)',
    'rgba(255, 241, 241, 0.04)',
    'rgba(248, 113, 113, 0.07)'
  ],
  'floresta-negra': [
    'rgba(16, 185, 129, 0.09)',
    'rgba(5, 150, 105, 0.07)',
    'rgba(240, 255, 244, 0.04)',
    'rgba(132, 204, 22, 0.06)'
  ],
  monolito: [
    'rgba(255, 255, 255, 0.08)',
    'rgba(163, 163, 163, 0.06)',
    'rgba(255, 255, 255, 0.03)',
    'rgba(115, 115, 115, 0.05)'
  ]
};

export function FrequencyVisualizer({ className, opacity = 0.25 }: FrequencyVisualizerProps) {
  const currentTheme = useStore((state) => state.theme);
  const themeRef = useRef(currentTheme);
  themeRef.current = currentTheme;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Usamos fftSize 256 para obter dados de frequência reativos
  const { analyser, isActive } = useAudioAnalyser({ fftSize: 256 });
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = canvas.clientWidth;
    let height = canvas.height = canvas.clientHeight;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: entryWidth, height: entryHeight } = entry.contentRect;
        width = canvas.width = entryWidth * window.devicePixelRatio;
        height = canvas.height = entryHeight * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
    });

    resizeObserver.observe(canvas);

    // Variáveis para animação suave
    let phase = 0;
    const bufferLength = analyser ? analyser.frequencyBinCount : 128;
    const dataArray = new Uint8Array(bufferLength);

    // Amortecimento para evitar saltos bruscos
    const smoothedVolume = { value: 0 };
    const smoothedBass = { value: 0 };
    const smoothedMid = { value: 0 };

    const draw = () => {
      const logicalWidth = canvas.width / window.devicePixelRatio;
      const logicalHeight = canvas.height / window.devicePixelRatio;

      ctx.clearRect(0, 0, logicalWidth, logicalHeight);

      let averageVolume = 0;
      let bass = 0;
      let mid = 0;

      if (analyser && isActive) {
        analyser.getByteFrequencyData(dataArray);

        // Calcula a energia média de frequências específicas
        let total = 0;
        let bassSum = 0;
        let midSum = 0;

        for (let i = 0; i < bufferLength; i++) {
          total += dataArray[i];
          if (i < bufferLength * 0.15) {
            bassSum += dataArray[i];
          } else if (i < bufferLength * 0.6) {
            midSum += dataArray[i];
          }
        }

        averageVolume = total / bufferLength / 255;
        bass = (bassSum / (bufferLength * 0.15)) / 255;
        mid = (midSum / (bufferLength * 0.45)) / 255;
      } else {
        // Modo Idle: Simula pulsações bem sutis quando pausado
        const time = Date.now() * 0.001;
        averageVolume = 0.05 + Math.sin(time) * 0.02;
        bass = 0.05 + Math.cos(time * 0.8) * 0.02;
        mid = 0.04 + Math.sin(time * 1.2) * 0.015;
      }

      // Interpolação linear para transições super suaves
      smoothedVolume.value += (averageVolume - smoothedVolume.value) * 0.1;
      smoothedBass.value += (bass - smoothedBass.value) * 0.1;
      smoothedMid.value += (mid - smoothedMid.value) * 0.1;

      // Velocidade do movimento das ondas com base no volume e batida
      phase += 0.01 + smoothedBass.value * 0.03;
      const themeColors = THEME_WAVE_COLORS[themeRef.current] || THEME_WAVE_COLORS.abissal;

      // Desenhamos 4 ondas com características diferentes para profundidade de tema escuro
      const waveConfigs = [
        {
          amplitude: logicalHeight * 0.28 * (smoothedBass.value + 0.1),
          frequency: 0.0035,
          phaseOffset: phase * 1.0,
          color: themeColors[0],
          lineWidth: 2
        },
        {
          amplitude: logicalHeight * 0.22 * (smoothedVolume.value + 0.1),
          frequency: 0.005,
          phaseOffset: phase * -1.2 + Math.PI / 4,
          color: themeColors[1],
          lineWidth: 1.5
        },
        {
          amplitude: logicalHeight * 0.18 * (smoothedMid.value + 0.1),
          frequency: 0.007,
          phaseOffset: phase * 1.5 + Math.PI / 2,
          color: themeColors[2],
          lineWidth: 1
        },
        {
          amplitude: logicalHeight * 0.32 * (smoothedVolume.value * 0.8 + 0.1),
          frequency: 0.0025,
          phaseOffset: phase * -0.7 + Math.PI,
          color: themeColors[3],
          lineWidth: 2
        }
      ];

      // Renderiza as formas de onda
      waveConfigs.forEach((config) => {
        ctx.beginPath();
        ctx.lineWidth = config.lineWidth;
        ctx.strokeStyle = config.color;

        const centerY = logicalHeight / 2;

        for (let x = 0; x <= logicalWidth; x += 3) {
          // Fórmula matemática que combina senos multiplicados para ondas orgânicas
          const angle = x * config.frequency + config.phaseOffset;
          const y = centerY + 
            Math.sin(angle) * config.amplitude * Math.cos(x * 0.002) +
            Math.cos(angle * 1.5) * (config.amplitude * 0.3) * Math.sin(x * 0.001);

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.stroke();
      });

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      resizeObserver.disconnect();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser, isActive]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full block pointer-events-none ${className}`}
      style={{ opacity }}
      id="frequency-waveform-visualizer"
    />
  );
}
