import React, { useRef, useEffect } from 'react';
import { useAudioAnalyser } from '@/hooks/useAudioAnalyser';

interface AudioVisualizerProps {
  className?: string;
  variant?: 'bars' | 'wave' | 'circle'; // Mantido para compatibilidade de tipos
  fftSize?: number;
  barColor?: string;
  glow?: boolean;
}

// Utilitário para parsear cores CSS para RGB [r, g, b] normalizados (0.0 a 1.0)
function parseColorToRgb(colorStr: string): [number, number, number] {
  const str = colorStr.trim().toLowerCase();
  
  // Hexadecimal
  if (str.startsWith('#')) {
    const cleanHex = str.replace('#', '');
    if (cleanHex.length === 3) {
      return [
        parseInt(cleanHex[0] + cleanHex[0], 16) / 255,
        parseInt(cleanHex[1] + cleanHex[1], 16) / 255,
        parseInt(cleanHex[2] + cleanHex[2], 16) / 255
      ];
    }
    if (cleanHex.length === 6) {
      return [
        parseInt(cleanHex.substring(0, 2), 16) / 255,
        parseInt(cleanHex.substring(2, 4), 16) / 255,
        parseInt(cleanHex.substring(4, 6), 16) / 255
      ];
    }
  }

  // RGB / RGBA
  if (str.startsWith('rgb')) {
    const match = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      return [
        parseInt(match[1], 10) / 255,
        parseInt(match[2], 10) / 255,
        parseInt(match[3], 10) / 255
      ];
    }
  }

  // HSL / HSLA
  if (str.startsWith('hsl')) {
    const match = str.match(/hsla?\((\d+),\s*([\d.]+)%,\s*([\d.]+)%/);
    if (match) {
      const h = parseInt(match[1], 10) / 360;
      const s = parseFloat(match[2]) / 100;
      const l = parseFloat(match[3]) / 100;

      let r = l, g = l, b = l;
      if (s !== 0) {
        const hue2rgb = (p: number, q: number, t: number) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1/6) return p + (q - p) * 6 * t;
          if (t < 1/2) return q;
          if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
          return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
      }
      return [r, g, b];
    }
  }

  // Fallback padrão para a cor primária clássica de Kyvra (#a78bfa)
  return [167 / 255, 139 / 255, 250 / 255];
}

// Vertex Shader para renderização em tela cheia com Quad
const VERTEX_SHADER_SOURCE = `
  attribute vec2 position;
  varying vec2 v_uv;
  void main() {
    v_uv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

// Fragment Shader com SDF de cantos arredondados, glow neon suave de alta intensidade e pulsação de graves
const FRAGMENT_SHADER_SOURCE = `
  precision mediump float;
  varying vec2 v_uv;

  uniform vec2 u_resolution;
  uniform vec3 u_color;
  uniform float u_time;
  uniform float u_bass_intensity;
  uniform float u_frequencies[52];
  uniform float u_glow_enabled;

  // Função de distância orientada (SDF) para caixa arredondada
  float sdRoundRect(vec2 p, vec2 b, float r) {
    vec2 d = abs(p) - b + vec2(r);
    return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - r;
  }

  void main() {
    // Coordenada normalizada
    vec2 uv = v_uv;
    
    // Proporção de tela para evitar distorção geométrica no SDF das barras e arredondamentos
    vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
    
    // 1. Glow Radial de Fundo pulsante (Beat Glow místico de Kyvra)
    float distToCenter = length(uv - vec2(0.5));
    float backgroundGlow = 0.0;
    if (u_glow_enabled > 0.5) {
      // Glow suave de fundo, expandindo e brilhando mais de acordo com as batidas de graves
      float radialFalloff = 4.0 - u_bass_intensity * 1.8;
      backgroundGlow = exp(-distToCenter * radialFalloff) * (0.04 + u_bass_intensity * 0.18);
    }

    // 2. Desenho das barras simétricas centrais usando SDF arredondado
    const int visualBins = 52;
    float totalWidth = 1.0;
    // Cada barra ocupa uma fração do espaço X. Definimos uma largura e espaçamento sutil.
    float colWidth = totalWidth / float(visualBins);
    float barWidth = colWidth * 0.60; // 60% de largura da coluna, 40% de gap
    float r = barWidth * 0.45; // Raio dos cantos arredondados
    
    float accumFill = 0.0;
    float accumGlow = 0.0;
    
    // Identifica qual coluna X o pixel se encontra
    int currentBarIdx = int(uv.x * float(visualBins));
    
    // Iteramos nas colunas vizinhas imediatas (de -2 a +2) para sobreposição suave de glow horizontal
    for (int offset = -2; offset <= 2; offset++) {
      int j = currentBarIdx + offset;
      if (j >= 0 && j < visualBins) {
        // Truque de loop de limite estático para obter o valor dinâmico do array no WebGL 1
        float freq = 0.0;
        for (int k = 0; k < visualBins; k++) {
          if (k == j) {
            freq = u_frequencies[k];
            break;
          }
        }
        
        // Altura simétrica a partir do centro
        float barHeight = max(0.015, freq * 0.76);
        vec2 center = vec2((float(j) + 0.5) * colWidth, 0.5);
        
        // Coordenadas normalizadas e corrigidas pelo aspecto
        vec2 p = (uv - center) * aspect;
        vec2 b = vec2(barWidth, barHeight) * 0.5 * aspect;
        float roundedR = r * aspect.y;
        
        float d = sdRoundRect(p, b, roundedR);
        
        // Antialiasing suave das bordas das barras baseada na densidade de pixels
        float pixelDist = 1.5 / u_resolution.y;
        float fill = smoothstep(pixelDist, -pixelDist, d);
        accumFill = max(accumFill, fill);
        
        // Glow neon estelar individual para cada barra
        if (u_glow_enabled > 0.5) {
          // Glow cai com a distância das bordas da barra, modulado pela intensidade da frequência
          float glowFalloff = 0.0035 / (d + 0.0035);
          float barGlow = glowFalloff * (0.18 + freq * 0.82);
          accumGlow = max(accumGlow, barGlow * 0.16);
        }
      }
    }

    // Gradiente vertical do preenchimento da barra (mais brilhante nas pontas e translúcido no centro)
    float distFromCenterY = abs(uv.y - 0.5) * 2.0;
    vec3 baseColor = u_color;
    vec3 neonColor = mix(baseColor * 0.7, baseColor + vec3(0.2, 0.2, 0.2), smoothstep(0.0, 1.0, distFromCenterY));

    // Composição final das cores
    vec3 color = vec3(0.0);
    float alpha = 0.0;

    if (accumFill > 0.0) {
      color = neonColor;
      alpha = accumFill * (0.45 + distFromCenterY * 0.55); // Preenchimento sutilmente translúcido no centro
    }

    if (u_glow_enabled > 0.5) {
      // Glow ao redor das barras
      vec3 glowColor = u_color;
      color = mix(color, glowColor, (1.0 - accumFill) * smoothstep(0.0, 1.0, accumGlow));
      alpha = max(alpha, accumFill + accumGlow * 0.85);

      // Adiciona o glow místico de fundo
      color += u_color * backgroundGlow;
      alpha = max(alpha, backgroundGlow);
    }

    gl_FragColor = vec4(color, alpha * 0.95);
  }
`;

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  className = '',
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

    // Tentamos usar o WebGL para renderização de alta fidelidade via GPU
    let gl: WebGLRenderingContext | null = null;
    let program: WebGLProgram | null = null;
    let buffer: WebGLBuffer | null = null;
    let fallbackCtx: CanvasRenderingContext2D | null = null;
    let isWebGL = false;

    // Variáveis de localizações dos uniformes WebGL
    let uResolutionLoc: WebGLUniformLocation | null = null;
    let uColorLoc: WebGLUniformLocation | null = null;
    let uTimeLoc: WebGLUniformLocation | null = null;
    let uBassIntensityLoc: WebGLUniformLocation | null = null;
    let uFrequenciesLoc: WebGLUniformLocation | null = null;
    let uGlowEnabledLoc: WebGLUniformLocation | null = null;

    try {
      gl = (canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false }) ||
            canvas.getContext('experimental-webgl', { alpha: true, antialias: true, premultipliedAlpha: false })) as WebGLRenderingContext;
      
      if (gl) {
        // 1. Compilar Vertex Shader
        const vs = gl.createShader(gl.VERTEX_SHADER);
        if (vs) {
          gl.shaderSource(vs, VERTEX_SHADER_SOURCE);
          gl.compileShader(vs);
          if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
            console.warn('Erro ao compilar Vertex Shader:', gl.getShaderInfoLog(vs));
            throw new Error('VS compilation failed');
          }
        }

        // 2. Compilar Fragment Shader
        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        if (fs) {
          gl.shaderSource(fs, FRAGMENT_SHADER_SOURCE);
          gl.compileShader(fs);
          if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
            console.warn('Erro ao compilar Fragment Shader:', gl.getShaderInfoLog(fs));
            throw new Error('FS compilation failed');
          }
        }

        // 3. Criar e linkar Program
        program = gl.createProgram();
        if (program && vs && fs) {
          gl.attachShader(program, vs);
          gl.attachShader(program, fs);
          gl.linkProgram(program);
          if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.warn('Erro ao linkar programa WebGL:', gl.getProgramInfoLog(program));
            throw new Error('Program link failed');
          }
          gl.useProgram(program);
        }

        // 4. Criar Buffer para o Quad (2D plane)
        const vertices = new Float32Array([
          -1.0, -1.0,
           1.0, -1.0,
          -1.0,  1.0,
          -1.0,  1.0,
           1.0, -1.0,
           1.0,  1.0,
        ]);
        buffer = gl.createBuffer();
        if (buffer) {
          gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
          gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
          
          if (program) {
            const positionLoc = gl.getAttribLocation(program, 'position');
            gl.enableVertexAttribArray(positionLoc);
            gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
          }
        }

        // 5. Obter referências para Uniforms
        if (program) {
          uResolutionLoc = gl.getUniformLocation(program, 'u_resolution');
          uColorLoc = gl.getUniformLocation(program, 'u_color');
          uTimeLoc = gl.getUniformLocation(program, 'u_time');
          uBassIntensityLoc = gl.getUniformLocation(program, 'u_bass_intensity');
          uFrequenciesLoc = gl.getUniformLocation(program, 'u_frequencies');
          uGlowEnabledLoc = gl.getUniformLocation(program, 'u_glow_enabled');
        }

        // Configuração inicial do blend para transparência de glow fluida
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        isWebGL = true;
      }
    } catch (e) {
      console.warn('WebGL não suportado ou falhou na inicialização. Usando fallback Canvas 2D.', e);
      isWebGL = false;
    }

    // Fallback se WebGL falhar
    if (!isWebGL) {
      fallbackCtx = canvas.getContext('2d', { alpha: true });
    }

    let resizeObserver: ResizeObserver | null = null;

    const handleResize = (entries: ResizeObserverEntry[]) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        canvas.width = width * window.devicePixelRatio;
        canvas.height = height * window.devicePixelRatio;
        if (!isWebGL && fallbackCtx) {
          fallbackCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
        }
      }
    };

    if (canvas.parentElement) {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(canvas.parentElement);
      
      canvas.width = canvas.parentElement.clientWidth * window.devicePixelRatio;
      canvas.height = canvas.parentElement.clientHeight * window.devicePixelRatio;
      if (!isWebGL && fallbackCtx) {
        fallbackCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
    }

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      const width = canvas.width / window.devicePixelRatio;
      const height = canvas.height / window.devicePixelRatio;

      const isPlaying = audioElement && !audioElement.paused;
      const time = Date.now() * 0.002;

      // Definir quantidade de barras e canais de frequência
      const visualBins = 52;
      
      // Inicializar array de alturas suavizadas se necessário
      if (smoothedHeights.current.length !== visualBins) {
        smoothedHeights.current = new Array(visualBins).fill(0.02);
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
          const dataIndex = Math.floor((i / visualBins) * bufferLength * 0.75);
          const rawValue = dataArray[dataIndex] || 0;
          const targetPercent = Math.pow(rawValue / 255, 1.25);
          
          smoothedHeights.current[i] += (targetPercent - smoothedHeights.current[i]) * 0.28;
        }
      } else {
        // Fallback: Respiração cósmica calma e poética quando em repouso
        bassIntensity = (Math.sin(time * 0.5) * 0.5 + 0.5) * 0.15;
        
        for (let i = 0; i < visualBins; i++) {
          let percent = 0.02;
          if (isPlaying) {
            const wave1 = Math.sin(time + i * 0.15) * 0.45 + 0.5;
            const wave2 = Math.cos(time * 0.75 - i * 0.08) * 0.35 + 0.35;
            percent = (wave1 * 0.6 + wave2 * 0.4) * 0.7;
          } else {
            percent = (Math.sin(time * 0.8 + i * 0.12) * 0.5 + 0.5) * 0.06 + 0.02;
          }
          smoothedHeights.current[i] += (percent - smoothedHeights.current[i]) * 0.15;
        }
      }

      const activeColorStr = barColor || themeColorRef.current;

      if (isWebGL && gl) {
        // 2A. DRAW COM WEBGL ACELERADO POR GPU (Shader místico e leve)
        const rgb = parseColorToRgb(activeColorStr);

        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT);

        if (program) {
          gl.useProgram(program);
          
          // Enviar Uniforms para a GPU
          gl.uniform2f(uResolutionLoc, canvas.width, canvas.height);
          gl.uniform3f(uColorLoc, rgb[0], rgb[1], rgb[2]);
          gl.uniform1f(uTimeLoc, time);
          gl.uniform1f(uBassIntensityLoc, bassIntensity);
          gl.uniform1fv(uFrequenciesLoc, new Float32Array(smoothedHeights.current));
          gl.uniform1f(uGlowEnabledLoc, glow ? 1.0 : 0.0);

          gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
      } else if (fallbackCtx) {
        // 2B. RENDER FALLBACK EM CANVAS 2D (caso WebGL falhe ou não seja suportado)
        fallbackCtx.clearRect(0, 0, width, height);

        // Glow radial pulsante de fundo
        if (glow) {
          fallbackCtx.save();
          const glowOpacity = 0.03 + bassIntensity * 0.12;
          const glowRadius = Math.max(120, Math.min(width, height) * 0.4 * (1 + bassIntensity * 0.35));
          
          const radialGradient = fallbackCtx.createRadialGradient(
            width / 2, height / 2, 10,
            width / 2, height / 2, glowRadius
          );
          radialGradient.addColorStop(0, activeColorStr.replace(')', `, ${glowOpacity}`).replace('rgb', 'rgba'));
          radialGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
          
          fallbackCtx.fillStyle = radialGradient;
          fallbackCtx.beginPath();
          fallbackCtx.arc(width / 2, height / 2, glowRadius, 0, Math.PI * 2);
          fallbackCtx.fill();
          fallbackCtx.restore();
        }

        // Espectro simétrico simples
        const gap = 4;
        const barWidth = (width - (visualBins - 1) * gap) / visualBins;
        const centerY = height / 2;

        for (let i = 0; i < visualBins; i++) {
          const percent = smoothedHeights.current[i] || 0.02;
          const barHeight = Math.max(4, percent * height * 0.78);
          const x = i * (barWidth + gap);
          
          const barGradient = fallbackCtx.createLinearGradient(x, centerY - barHeight / 2, x, centerY + barHeight / 2);
          barGradient.addColorStop(0, activeColorStr);
          barGradient.addColorStop(0.5, activeColorStr.replace(')', ', 0.35)').replace('rgb', 'rgba'));
          barGradient.addColorStop(1, activeColorStr);

          fallbackCtx.fillStyle = barGradient;

          if (glow) {
            fallbackCtx.shadowBlur = Math.min(14, percent * 18);
            fallbackCtx.shadowColor = activeColorStr;
          } else {
            fallbackCtx.shadowBlur = 0;
          }

          fallbackCtx.globalAlpha = percent * 0.65 + 0.35;

          fallbackCtx.beginPath();
          fallbackCtx.roundRect(
            x,
            centerY - barHeight / 2,
            Math.max(0.1, barWidth),
            barHeight,
            Math.max(0, Math.min(3, barWidth / 2))
          );
          fallbackCtx.fill();
        }

        fallbackCtx.shadowBlur = 0;
        fallbackCtx.globalAlpha = 1.0;
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      
      // Limpeza de recursos WebGL para evitar vazamento de memória de GPU
      if (isWebGL && gl) {
        if (buffer) {
          gl.deleteBuffer(buffer);
        }
        if (program) {
          gl.deleteProgram(program);
        }
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
