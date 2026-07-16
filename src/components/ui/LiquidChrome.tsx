import React, { useEffect, useRef, memo } from 'react';

interface LiquidChromeProps {
  className?: string;
  speed?: number;
  amplitude?: number;
  frequencyX?: number;
  frequencyY?: number;
  interactive?: boolean;
}

export const LiquidChrome = memo(function LiquidChrome({
  className,
  speed = 1,
  amplitude = 0.6,
  frequencyX = 3,
  frequencyY = 3,
  interactive = true,
}: LiquidChromeProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isVisible = true;
    let isTabActive = true;

    // Use IntersectionObserver to stop loop when not visible
    const observerIntersection = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        isVisible = entry.isIntersecting;
      });
    }, { threshold: 0.01 });
    
    observerIntersection.observe(container);

    // Pause animation when tab is inactive to save CPU/GPU entirely
    const handleVisibilityChange = () => {
      isTabActive = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Configurações padrão e controle do estado interno do tema do site
    const getThemeColor = (): [number, number, number] => {
      if (typeof window === 'undefined') return [0.1, 0.1, 0.1];
      const style = getComputedStyle(document.documentElement);
      const primaryHex = (
        style.getPropertyValue('--secondary').trim() ||
        style.getPropertyValue('--primary').trim() ||
        '#a78bfa'
      );
      
      const hex = primaryHex.replace('#', '');
      if (hex.length === 6) {
        const r = parseInt(hex.substring(0, 2), 16) / 255;
        const g = parseInt(hex.substring(2, 4), 16) / 255;
        const b = parseInt(hex.substring(4, 6), 16) / 255;
        // Atenua para ficar com tonalidade escura metalizada luxuosa perfeita
        const k = 0.05;
        return [r * k, g * k, b * k];
      }
      return [0.05, 0.04, 0.08];
    };

    let opts = {
      baseColor: getThemeColor(),
      speed,
      amplitude,
      frequencyX,
      frequencyY,
      interactive,
    };

    let canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    container.appendChild(canvas);

    let gl =
      canvas.getContext('webgl', { alpha: true, antialias: false, powerPreference: 'low-power' }) ||
      (canvas.getContext('experimental-webgl', { alpha: true, antialias: false }) as WebGLRenderingContext | null);

    if (!gl) return;

    gl.clearColor(0, 0, 0, 0); // Fundo transparente para permitir blend elegante com o player

    let vertexShaderSrc =
      'attribute vec2 position;attribute vec2 uv;varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position,0.0,1.0);}';
    
    // Fragment shader extremamente otimizado:
    // - Reduzido o loop de 5 para 3 iterações (melhora fill rate em 40%)
    // - Evita divisão por zero ou infinito no cálculo do seno
    let fragmentShaderSrc =
      'precision mediump float;uniform float uTime;uniform vec3 uResolution;uniform vec3 uBaseColor;uniform float uAmplitude;uniform float uFrequencyX;uniform float uFrequencyY;uniform vec2 uMouse;varying vec2 vUv;vec4 renderImage(vec2 uvCoord){vec2 fragCoord=uvCoord*uResolution.xy;vec2 uv=(2.0*fragCoord-uResolution.xy)/min(uResolution.x,uResolution.y);for(float i=1.0;i<4.0;i++){uv.x+=uAmplitude/i*cos(i*uFrequencyX*uv.y+uTime+uMouse.x*3.14159);uv.y+=uAmplitude/i*cos(i*uFrequencyY*uv.x+uTime+uMouse.y*3.14159);}vec2 diff=(uvCoord-uMouse);float dist=length(diff);float falloff=exp(-dist*20.0);float ripple=sin(10.0*dist-uTime*2.0)*0.03;uv+=(diff/(dist+0.0001))*ripple*falloff;vec3 color=uBaseColor/max(abs(sin(uTime-uv.y-uv.x)),0.08);return vec4(color,1.0);}void main(){gl_FragColor=renderImage(vUv);}';

    function compile(type: number, src: string) {
      if (!gl) return null;
      let sh = gl.createShader(type);
      if (!sh) return null;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        gl.deleteShader(sh);
        return null;
      }
      return sh;
    }

    function link(vs2: WebGLShader, fs2: WebGLShader) {
      if (!gl) return null;
      let p = gl.createProgram();
      if (!p) return null;
      gl.attachShader(p, vs2);
      gl.attachShader(p, fs2);
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        gl.deleteProgram(p);
        return null;
      }
      return p;
    }

    let vs = compile(gl.VERTEX_SHADER, vertexShaderSrc);
    let fs = compile(gl.FRAGMENT_SHADER, fragmentShaderSrc);
    if (!vs || !fs) return;
    let program = link(vs, fs);
    if (!program) return;

    gl.useProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    let posLoc = gl.getAttribLocation(program, 'position');
    let uvLoc = gl.getAttribLocation(program, 'uv');
    let uTimeLoc = gl.getUniformLocation(program, 'uTime');
    let uResolutionLoc = gl.getUniformLocation(program, 'uResolution');
    let uBaseColorLoc = gl.getUniformLocation(program, 'uBaseColor');
    let uAmplitudeLoc = gl.getUniformLocation(program, 'uAmplitude');
    let uFrequencyXLoc = gl.getUniformLocation(program, 'uFrequencyX');
    let uFrequencyYLoc = gl.getUniformLocation(program, 'uFrequencyY');
    let uMouseLoc = gl.getUniformLocation(program, 'uMouse');

    let posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    let uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([0, 0, 2, 0, 0, 2]),
      gl.STATIC_DRAW
    );
    gl.enableVertexAttribArray(uvLoc);
    gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);

    let state = {
      mouse: new Float32Array([0.5, 0.5]),
      raf: 0,
    };

    function setUniforms() {
      if (!gl) return;
      gl.uniform3fv(uBaseColorLoc, new Float32Array(opts.baseColor));
      gl.uniform1f(uAmplitudeLoc, opts.amplitude);
      gl.uniform1f(uFrequencyXLoc, opts.frequencyX);
      gl.uniform1f(uFrequencyYLoc, opts.frequencyY);
      gl.uniform2fv(uMouseLoc, state.mouse);
    }

    function resize() {
      if (!gl || !container) return;
      let rect = container.getBoundingClientRect();
      
      // DPR reduzido para 0.28 economiza ~92% de fillrate de GPU.
      // O efeito líquido-fluido com blur nativo do CSS fica indistinguível!
      const dpr = 0.28;
      let w = Math.max(1, Math.floor(rect.width * dpr));
      let h = Math.max(1, Math.floor(rect.height * dpr));
      
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform3fv(uResolutionLoc, new Float32Array([w, h, w / h]));
      gl.uniform2fv(uMouseLoc, state.mouse);
    }

    function onMouseMove(e: MouseEvent) {
      if (!container) return;
      let rect = container.getBoundingClientRect();
      let x = (e.clientX - rect.left) / rect.width;
      let y = 1 - (e.clientY - rect.top) / rect.height;
      state.mouse[0] = x;
      state.mouse[1] = y;
      if (gl) gl.uniform2fv(uMouseLoc, state.mouse);
    }

    function onTouchMove(e: TouchEvent) {
      if (!e.touches || !e.touches.length || !container) return;
      let t = e.touches[0];
      let rect = container.getBoundingClientRect();
      let x = (t.clientX - rect.left) / rect.width;
      let y = 1 - (t.clientY - rect.top) / rect.height;
      state.mouse[0] = x;
      state.mouse[1] = y;
      if (gl) gl.uniform2fv(uMouseLoc, state.mouse);
    }

    setUniforms();
    resize();

    window.addEventListener('resize', resize);
    if (opts.interactive) {
      container.addEventListener('mousemove', onMouseMove);
      container.addEventListener('touchmove', onTouchMove);
    }

    // Controle de FPS (Framerate throttling):
    // Limitar para 15 FPS economiza até 80% do processamento mantendo o movimento fluído sob blur.
    let lastTime = 0;
    const targetFPS = 15;
    const interval = 1000 / targetFPS;

    function loop(t: number) {
      state.raf = requestAnimationFrame(loop);
      if (!gl || !isVisible || !isTabActive) return;

      const elapsed = t - lastTime;
      if (elapsed < interval) return;

      lastTime = t - (elapsed % interval);

      gl.uniform1f(uTimeLoc, t * 1e-3 * opts.speed);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    state.raf = requestAnimationFrame(loop);

    // Observer class/theme changes to update baseColor smoothly
    const observer = new MutationObserver(() => {
      opts.baseColor = getThemeColor();
      setUniforms();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => {
      observerIntersection.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      observer.disconnect();
      cancelAnimationFrame(state.raf);

      window.removeEventListener('resize', resize);
      if (container) {
        container.removeEventListener('mousemove', onMouseMove);
        container.removeEventListener('touchmove', onTouchMove);
      }
      if (canvas && canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
      try {
        let ext = gl.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();
      } catch (e) {}
    };
  }, [speed, amplitude, frequencyX, frequencyY, interactive]);

  return (
    <div className={`aurora-background-animations-6 ${className || ''}`}>
      <style dangerouslySetInnerHTML={{ __html: `
        .aurora-background-animations-6 {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          pointer-events: none;
        }
        .aurora-background-animations-6 .liquid-chrome-container {
          width: 100%;
          height: 100%;
          position: absolute;
          inset: 0;
        }
        .aurora-background-animations-6 canvas {
          width: 100%;
          height: 100%;
          display: block;
        }
      `}} />
      <div ref={containerRef} className="liquid-chrome-container" />
    </div>
  );
});

