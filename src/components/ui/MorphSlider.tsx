import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Renderer, Triangle, Program, Mesh, Texture } from 'ogl';
import { gsap } from 'gsap';

import './MorphSlider.css';

const TRANSITIONS = { melt: 0, ripple: 1, shear: 2, swirl: 3 };

const vertexShader = `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShader = `
precision highp float;

uniform sampler2D tCurrent;
uniform sampler2D tNext;
uniform vec2 uResolution;
uniform vec2 uCurrentSize;
uniform vec2 uNextSize;
uniform float uProgress;
uniform float uDir;
uniform int uMode;
uniform float uIntensity;
uniform float uScale;
uniform float uAberration;
uniform float uDrift;
uniform float uTime;
uniform float uReduce;
uniform vec2 uPointer;
uniform vec3 uOverlay;
uniform float uSameCover;

varying vec2 vUv;

const float PI = 3.14159265359;

float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

mat2 rot(float a) {
  float s = sin(a);
  float c = cos(a);
  return mat2(c, -s, s, c);
}

vec2 coverUV(vec2 uv, vec2 res, vec2 img) {
  float rA = res.x / max(res.y, 1.0);
  float iA = img.x / max(img.y, 1.0);
  vec2 s = vec2(1.0);
  float ratio = rA / max(iA, 0.0001);
  if (ratio > 1.0) {
    s.y = 1.0 / ratio;
  } else {
    s.x = ratio;
  }
  return (uv - 0.5) * s + 0.5;
}

void main() {
  float p = clamp(uProgress, 0.0, 1.0);
  float env = sin(p * PI);

  vec2 uv = vUv;

  uv += vec2(sin(uTime * 0.25 + uv.y * 4.0), cos(uTime * 0.22 + uv.x * 4.0)) * uDrift * 0.008;
  uv = (uv - 0.5) * (1.0 - uDrift * 0.02 * sin(uTime * 0.4)) + 0.5;

  vec2 uvC = uv;
  vec2 uvN = uv;
  float m = smoothstep(0.0, 1.0, p);

  // Otimização Crítica GPU: Evita calcular FBM pesado quando o slide está em repouso
  if (p <= 0.001) {
    m = 0.0;
  } else if (p >= 0.999) {
    m = 1.0;
  } else if (uReduce < 0.5) {
    if (uMode == 3) {
      vec2 c = uv - 0.5;
      float r = length(c);
      float ang = env * uIntensity * 3.5 * (1.0 - r);
      uvC = rot(ang) * c + 0.5;
      uvN = rot(-ang) * c + 0.5;
      m = smoothstep(0.0, 1.0, p);
    } else if (uMode == 1) {
      float d = distance(uv, uPointer);
      float ring = p * 1.6;
      float wave = sin((d - ring) * 30.0) * env;
      vec2 dir = normalize(uv - uPointer + 1e-4);
      vec2 disp = dir * wave * uIntensity * 0.25;
      uvC = uv + disp;
      uvN = uv + disp * 0.6;
      m = 1.0 - smoothstep(ring - 0.03, ring + 0.03, d);
    } else if (uMode == 2) {
      float slices = 14.0;
      float row = floor(uv.y * slices);
      float rnd = hash11(row);
      vec2 disp = vec2((rnd - 0.5) * env * uIntensity * 0.6, 0.0);
      uvC = uv + disp;
      uvN = uv + disp;
      float localX = uDir > 0.0 ? uv.x : 1.0 - uv.x;
      float th = p * 1.5 - 0.25 + (rnd - 0.5) * 0.25;
      m = 1.0 - smoothstep(th - 0.06, th + 0.06, localX);
    } else {
      float nn = fbm(uv * uScale + uTime * 0.03);
      float warp = fbm(uv * uScale * 1.7 - uTime * 0.02);
      vec2 g = vec2(nn, warp) - 0.5;
      uvC = uv + g * uIntensity * 0.5 * p;
      uvN = uv - g * uIntensity * 0.5 * (1.0 - p);
      m = smoothstep(nn - 0.15, nn + 0.15, p);
    }
  }

  vec3 col;
  if (uSameCover > 0.5 && env > 0.0005) {
    // Efeito de transição morph melt espetacular para faixas do mesmo álbum / mesma capa
    float nn = fbm(uv * uScale + uTime * 0.03);
    float warp = fbm(uv * uScale * 1.7 - uTime * 0.02);
    vec2 g = vec2(nn, warp) - 0.5;

    float meltWave = env * (uIntensity * 1.5);
    vec2 liquidWarp = vec2(g.x * 1.1, (g.y * 1.4 + 0.35) * uDir) * meltWave;
    vec2 sDistorted = coverUV(uv + liquidWarp, uResolution, uCurrentSize);

    float caSame = uReduce < 0.5 ? uAberration * env * 0.07 : 0.0;
    vec3 colMelt = vec3(
      texture2D(tCurrent, sDistorted + vec2(caSame, 0.0)).r,
      texture2D(tCurrent, sDistorted).g,
      texture2D(tCurrent, sDistorted - vec2(caSame, 0.0)).b
    );
    // Variação de densidade líquida e pulso atmosférico
    colMelt = mix(colMelt, colMelt * (0.65 + 0.7 * nn), env * 0.45);
    col = colMelt;
  } else {
    vec2 sC = coverUV(uvC, uResolution, uCurrentSize);
    vec2 sN = coverUV(uvN, uResolution, uNextSize);

    float ca = uReduce < 0.5 ? uAberration * env * 0.03 : 0.0;

    vec3 colC = vec3(
      texture2D(tCurrent, sC + vec2(ca, 0.0)).r,
      texture2D(tCurrent, sC).g,
      texture2D(tCurrent, sC - vec2(ca, 0.0)).b
    );
    vec3 colN = vec3(
      texture2D(tNext, sN + vec2(ca, 0.0)).r,
      texture2D(tNext, sN).g,
      texture2D(tNext, sN - vec2(ca, 0.0)).b
    );

    col = mix(colC, colN, m);
  }

  float vig = smoothstep(1.25, 0.25, length(uv - 0.5));
  col = mix(col, uOverlay, (1.0 - vig) * 0.28);

  gl_FragColor = vec4(col, 1.0);
}
`;

function makeFallbackTexture(gl: any) {
  const size = 4;
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    data[i * 4] = 24;
    data[i * 4 + 1] = 24;
    data[i * 4 + 2] = 28;
    data[i * 4 + 3] = 255;
  }
  return new Texture(gl, { image: data, width: size, height: size, generateMipmaps: false });
}

function hexToRgb(hex: string) {
  let h = (hex || '#000000').replace('#', '');
  if (h.length === 3) {
    h = h
      .split('')
      .map(c => c + c)
      .join('');
  }
  const n = parseInt(h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

class MorphEngine {
  container: any;
  items: any[];
  getOptions: () => any;
  onIndexChange: (idx: number) => void;
  reducedMotion: boolean;
  current: number;
  animating: boolean;
  dragging: boolean;
  dragDir: number;
  shownIndex: number;
  tween: any;
  renderer: any;
  gl: any;
  canvas: any;
  geometry: any;
  textures: any[];
  sizes: any[];
  program: any;
  mesh: any;
  boundContextLost: any;
  resizeObserver: any;
  intersectionObserver: any;
  boundVisibilityChange: any;
  isVisible: boolean = true;
  isTabActive: boolean = true;
  boundLoop: any;
  raf: any;

  constructor(container: any, { items, startIndex, reducedMotion, getOptions, onIndexChange, dprCap }: any) {
    this.container = container;
    this.items = items;
    this.getOptions = getOptions;
    this.onIndexChange = onIndexChange;
    this.reducedMotion = reducedMotion;

    this.current = startIndex;
    this.animating = false;
    this.dragging = false;
    this.dragDir = 0;
    this.shownIndex = startIndex;
    this.tween = null;

    this.renderer = new Renderer({
      alpha: false,
      antialias: true,
      powerPreference: 'high-performance',
      dpr: Math.min(window.devicePixelRatio || 1, dprCap)
    });
    this.gl = this.renderer.gl;
    this.gl.clearColor(0.05, 0.05, 0.06, 1);

    this.canvas = this.gl.canvas;
    this.canvas.className = 'morph-slider-canvas';
    container.appendChild(this.canvas);

    this.geometry = new Triangle(this.gl);

    this.textures = this.items.map(() => makeFallbackTexture(this.gl));
    this.sizes = this.items.map(() => [1, 1]);

    const opts = this.getOptions();
    this.program = new Program(this.gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        tCurrent: { value: this.textures[this.current] },
        tNext: { value: this.textures[this.current] },
        uResolution: { value: [1, 1] },
        uCurrentSize: { value: this.sizes[this.current] },
        uNextSize: { value: this.sizes[this.current] },
        uProgress: { value: 0 },
        uDir: { value: 1 },
        uMode: { value: TRANSITIONS[opts.transition as keyof typeof TRANSITIONS] ?? 0 },
        uIntensity: { value: opts.intensity },
        uScale: { value: opts.scale },
        uAberration: { value: opts.aberration },
        uDrift: { value: opts.drift },
        uTime: { value: 0 },
        uReduce: { value: reducedMotion ? 1 : 0 },
        uPointer: { value: [0.5, 0.5] },
        uOverlay: { value: hexToRgb(opts.overlayColor) },
        uSameCover: { value: 0 }
      }
    });

    this.mesh = new Mesh(this.gl, { geometry: this.geometry, program: this.program });

    this.boundContextLost = this.onContextLost.bind(this);
    this.canvas.addEventListener('webglcontextlost', this.boundContextLost, false);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();

    this.loadTextures();

    this.isVisible = true;
    this.isTabActive = !document.hidden;

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const prev = this.isVisible;
          this.isVisible = entry.isIntersecting;
          if (!prev && this.isVisible && this.isTabActive) {
            cancelAnimationFrame(this.raf);
            this.raf = requestAnimationFrame(this.boundLoop);
          }
        });
      },
      { threshold: 0.05 }
    );
    this.intersectionObserver.observe(container);

    this.boundVisibilityChange = () => {
      const prev = this.isTabActive;
      this.isTabActive = !document.hidden;
      if (!prev && this.isTabActive && this.isVisible) {
        cancelAnimationFrame(this.raf);
        this.raf = requestAnimationFrame(this.boundLoop);
      }
    };
    document.addEventListener('visibilitychange', this.boundVisibilityChange, { passive: true });

    this.boundLoop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.boundLoop);
  }

  loadTextures() {
    this.items.forEach((item, index) => {
      if (!item.image) return;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const applyTexture = (loadedImg: HTMLImageElement) => {
        if (!this.gl || this.gl.isContextLost()) return;
        try {
          const texture = new Texture(this.gl, { generateMipmaps: false });
          texture.image = loadedImg;
          this.textures[index] = texture;
          this.sizes[index] = [loadedImg.naturalWidth || 1, loadedImg.naturalHeight || 1];
          if (index === this.current) {
            this.program.uniforms.tCurrent.value = texture;
            this.program.uniforms.uCurrentSize.value = this.sizes[index];
          }
        } catch {}
      };

      img.onload = () => applyTexture(img);
      img.onerror = () => {
        const fallbackImg = new Image();
        fallbackImg.onload = () => applyTexture(fallbackImg);
        fallbackImg.src = item.image;
        if (fallbackImg.complete && fallbackImg.naturalWidth > 0) {
          applyTexture(fallbackImg);
        }
      };
      img.src = item.image;
      if (img.complete && img.naturalWidth > 0) {
        applyTexture(img);
      }
    });
  }

  resize() {
    const rect = this.container.getBoundingClientRect();
    const w = Math.max(rect.width, 1);
    const h = Math.max(rect.height, 1);
    this.renderer.setSize(w, h);
    this.program.uniforms.uResolution.value = [this.gl.canvas.width, this.gl.canvas.height];
  }

  syncOptions() {
    const opts = this.getOptions();
    this.program.uniforms.uMode.value = TRANSITIONS[opts.transition as keyof typeof TRANSITIONS] ?? 0;
    this.program.uniforms.uIntensity.value = opts.intensity;
    this.program.uniforms.uScale.value = opts.scale;
    this.program.uniforms.uAberration.value = opts.aberration;
    this.program.uniforms.uDrift.value = opts.drift;
    this.program.uniforms.uOverlay.value = hexToRgb(opts.overlayColor);
  }

  loop(t: number) {
    if (!this.isVisible || !this.isTabActive) {
      return;
    }
    this.program.uniforms.uTime.value = t * 0.001;
    if (!this.dragging && !this.animating) this.syncOptions();
    this.renderer.render({ scene: this.mesh });
    this.raf = requestAnimationFrame(this.boundLoop);
  }

  wrap(i: number) {
    const n = this.items.length;
    return ((i % n) + n) % n;
  }

  prepareNext(dir: number) {
    const target = this.wrap(this.current + dir);
    this.program.uniforms.tCurrent.value = this.textures[this.current];
    this.program.uniforms.uCurrentSize.value = this.sizes[this.current];
    this.program.uniforms.tNext.value = this.textures[target];
    this.program.uniforms.uNextSize.value = this.sizes[target];
    this.program.uniforms.uDir.value = dir;
    return target;
  }

  goTo(dir: number) {
    if (this.animating || this.dragging || this.items.length < 2) return;
    const opts = this.getOptions();
    if (!opts.loop) {
      const raw = this.current + dir;
      if (raw < 0 || raw > this.items.length - 1) return;
    }
    this.syncOptions();
    const target = this.prepareNext(dir);
    this.animating = true;
    this.announce(target);
    const duration = this.reducedMotion ? Math.min(opts.duration, 0.4) : opts.duration;
    this.tween = gsap.fromTo(
      this.program.uniforms.uProgress,
      { value: 0 },
      {
        value: 1,
        duration,
        ease: opts.ease,
        onComplete: () => this.commit(target),
        onInterrupt: () => {
          this.animating = false;
          this.tween = null;
        }
      }
    );
  }

  announce(index: number) {
    if (index === this.shownIndex) return;
    this.shownIndex = index;
    if (this.onIndexChange) this.onIndexChange(index);
  }

  commit(target: number) {
    this.current = target;
    this.program.uniforms.tCurrent.value = this.textures[target];
    this.program.uniforms.uCurrentSize.value = this.sizes[target];
    this.program.uniforms.uProgress.value = 0;
    this.animating = false;
    this.tween = null;
    this.announce(target);
  }

  next() {
    this.goTo(1);
  }

  prev() {
    this.goTo(-1);
  }

  setPointer(x: number, y: number) {
    this.program.uniforms.uPointer.value = [x, y];
  }

  beginDrag() {
    if (this.animating || this.items.length < 2) return false;
    this.dragging = true;
    this.dragDir = 0;
    this.syncOptions();
    return true;
  }

  drag(ndx: number) {
    if (!this.dragging) return;
    const opts = this.getOptions();
    const dir = ndx < 0 ? 1 : -1;
    if (!opts.loop) {
      const raw = this.current + dir;
      if (raw < 0 || raw > this.items.length - 1) {
        this.program.uniforms.uProgress.value = 0;
        return;
      }
    }
    if (dir !== this.dragDir) {
      this.dragDir = dir;
      this.prepareNext(dir);
    }
    const progress = Math.min(Math.abs(ndx), 1);
    this.program.uniforms.uProgress.value = progress;
    this.announce(progress > 0.5 ? this.wrap(this.current + dir) : this.current);
  }

  endDrag() {
    if (!this.dragging) return;
    this.dragging = false;
    const p = this.program.uniforms.uProgress.value;
    if (this.dragDir === 0) return;
    const target = this.wrap(this.current + this.dragDir);
    const duration = this.reducedMotion ? 0.3 : 0.5;
    this.animating = true;
    if (p > 0.4) {
      this.announce(target);
      this.tween = gsap.to(this.program.uniforms.uProgress, {
        value: 1,
        duration,
        ease: 'power2.out',
        onComplete: () => this.commit(target)
      });
    } else {
      this.announce(this.current);
      this.tween = gsap.to(this.program.uniforms.uProgress, {
        value: 0,
        duration,
        ease: 'power2.out',
        onComplete: () => {
          this.animating = false;
          this.tween = null;
        }
      });
    }
  }

  onContextLost(e: any) {
    e.preventDefault();
    cancelAnimationFrame(this.raf);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    if (this.tween) this.tween.kill();
    this.resizeObserver.disconnect();
    if (this.intersectionObserver) this.intersectionObserver.disconnect();
    if (this.boundVisibilityChange) {
      document.removeEventListener('visibilitychange', this.boundVisibilityChange);
    }
    this.canvas.removeEventListener('webglcontextlost', this.boundContextLost);
    this.textures.forEach(tex => {
      if (tex && tex.texture) this.gl.deleteTexture(tex.texture);
    });
    if (this.program && this.program.program) this.gl.deleteProgram(this.program.program);
    const ext = this.gl.getExtension('WEBGL_lose_context');
    if (ext) ext.loseContext();
    if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
  }
}

interface MorphSliderProps {
  items?: Array<{ image: string; caption?: string }>;
  startIndex?: number;
  transition?: 'melt' | 'ripple' | 'shear' | 'swirl';
  duration?: number;
  ease?: string;
  intensity?: number;
  scale?: number;
  aberration?: number;
  drift?: number;
  autoplay?: boolean;
  autoplayDelay?: number;
  loop?: boolean;
  radius?: number;
  overlayColor?: string;
  showCaptions?: boolean;
  showControls?: boolean;
  showIndicators?: boolean;
  className?: string;
  onActiveIndexChange?: (index: number) => void;
  [key: string]: any;
}

export interface MorphSliderRef {
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
}

const MorphSlider = forwardRef<MorphSliderRef, MorphSliderProps>(({
  items = [],
  startIndex = 0,
  transition = 'melt',
  duration = 1.1,
  ease = 'power2.inOut',
  intensity = 0.55,
  scale = 2.4,
  aberration = 0.35,
  drift = 0.4,
  autoplay = false,
  autoplayDelay = 4,
  loop = true,
  radius = 16,
  overlayColor = '#000000',
  showCaptions = true,
  showControls = true,
  showIndicators = true,
  className = '',
  onActiveIndexChange,
  ...props
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<MorphEngine | null>(null);

  useImperativeHandle(ref, () => ({
    next: () => {
      if (engineRef.current) engineRef.current.next();
    },
    prev: () => {
      if (engineRef.current) engineRef.current.prev();
    },
    goTo: (idx: number) => {
      if (engineRef.current) {
        // Since goTo in MorphEngine takes a direction, not an absolute index,
        // we can compute the direction if we want, or just expose a raw goTo.
        // Actually, MorphEngine goTo expects +1 or -1. 
        // Wait, the interface for engine.goTo is `goTo(dir: number)`.
        // Let's implement an absolute go to:
        const current = engineRef.current.current;
        if (idx === current) return;
        engineRef.current.goTo(idx > current ? 1 : -1);
      }
    }
  }));

  const [index, setIndex] = useState(startIndex);
  const [hovering, setHovering] = useState(false);

  const optsRef = useRef<any>({});
  optsRef.current = { transition, duration, ease, intensity, scale, aberration, drift, overlayColor, loop };

  useEffect(() => {
    if (!containerRef.current || items.length === 0) return undefined;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const dynamicDprCap = isMobile ? 1.25 : 1.5;

    const engine = new MorphEngine(containerRef.current, {
      items,
      startIndex,
      reducedMotion,
      dprCap: dynamicDprCap,
      getOptions: () => optsRef.current,
      onIndexChange: (idx: number) => {
        setIndex(idx);
        if (onActiveIndexChange) onActiveIndexChange(idx);
      }
    });
    engineRef.current = engine;
    setIndex(startIndex);
    if (onActiveIndexChange) onActiveIndexChange(startIndex);

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, startIndex]);

  const handleNext = useCallback(() => engineRef.current?.next(), []);
  const handlePrev = useCallback(() => engineRef.current?.prev(), []);

  // Autoplay contínuo e sincronizado que começa no mount e não trava
  useEffect(() => {
    if (!autoplay) return undefined;
    if (items.length <= 1) return undefined;

    const interval = setInterval(() => {
      if (hovering) return;
      const engine = engineRef.current;
      if (engine && !engine.animating && !engine.dragging) {
        engine.next();
      }
    }, Math.max(autoplayDelay, 2) * 1000);

    return () => clearInterval(interval);
  }, [autoplay, autoplayDelay, hovering, items.length]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    let startX = 0;
    let width = 1;
    let active = false;

    const onDown = (e: any) => {
      const rect = el.getBoundingClientRect();
      width = rect.width || 1;
      startX = e.clientX;
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      engineRef.current?.setPointer(px, 1 - py);
      active = engineRef.current?.beginDrag() ?? false;
      if (active && el.setPointerCapture) {
        try {
          el.setPointerCapture(e.pointerId);
        } catch {}
      }
    };
    const onMove = (e: any) => {
      if (!active) return;
      const ndx = (e.clientX - startX) / width;
      engineRef.current?.drag(ndx);
    };
    const onUp = () => {
      if (!active) return;
      active = false;
      engineRef.current?.endDrag();
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);

    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
    };
  }, []);

  const onKeyDown = useCallback(
    (e: any) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    },
    [handleNext, handlePrev]
  );

  const hasCaptions = items.some(item => item.caption);

  return (
    <div
      className={`morph-slider ${className}`.trim()}
      style={{
        borderRadius: `${radius}px`,
        '--ms-swap': `${(duration * 0.66).toFixed(3)}s`,
        '--ms-dot': `${(duration * 0.45).toFixed(3)}s`
      } as any}
      onMouseEnter={() => {
        if (typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches) {
          setHovering(true);
        }
      }}
      onMouseLeave={() => setHovering(false)}
      {...props}
    >
      <div
        ref={containerRef}
        className="morph-slider-stage"
        role="group"
        aria-roledescription="carousel"
        aria-label="Image morph slider"
        tabIndex={0}
        onKeyDown={onKeyDown}
      />

      {showCaptions && hasCaptions && (
        <div className="morph-slider-caption" aria-live="polite">
          {items.map((item, i) =>
            item.caption ? (
              <span
                key={i}
                aria-hidden={i === index ? undefined : true}
                className={`morph-slider-caption-text ${i === index ? 'is-active' : ''}`}
              >
                {item.caption}
              </span>
            ) : null
          )}
        </div>
      )}

      {showControls && (
        <div className="morph-slider-controls">
          <button type="button" className="morph-slider-btn" aria-label="Previous slide" onClick={handlePrev}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path
                d="M15 5l-7 7 7 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button type="button" className="morph-slider-btn" aria-label="Next slide" onClick={handleNext}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path
                d="M9 5l7 7-7 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      )}

      {showIndicators && (
        <div className="morph-slider-indicators" role="tablist" aria-label="Slides">
          {items.map((item, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Go to slide ${i + 1}`}
              className={`morph-slider-dot ${i === index ? 'is-active' : ''}`}
              onClick={() => {
                const engine = engineRef.current;
                if (!engine || i === index) return;
                engine.goTo(i > index ? 1 : -1);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export interface MorphCoverTransitionProps {
  coverUrl?: string;
  trackId?: string | number;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
  intensity?: number;
  scale?: number;
  aberration?: number;
  drift?: number;
  duration?: number;
  radius?: number;
  direction?: 'next' | 'prev';
}

/**
 * Transição de capas do Player e Destaques com shaders WebGL do MorphSlider (React Bits):
 * Transiciona com deslocamento "melt", aberração cromática e respiração viva (drift),
 * ocorrendo em QUALQUER troca de música (seja do mesmo álbum ou de álbuns diferentes).
 */
export const MorphCoverTransition = React.memo(({
  coverUrl,
  trackId,
  title,
  className = '',
  style,
  intensity = 0.55,
  scale = 2.4,
  aberration = 0.35,
  drift = 0.4,
  duration = 1.1,
  radius = 16,
  direction = 'next',
}: MorphCoverTransitionProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const glRef = useRef<any>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const programRef = useRef<Program | null>(null);
  const meshRef = useRef<Mesh | null>(null);
  const rafRef = useRef<number | null>(null);
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const currentTextureRef = useRef<Texture | null>(null);
  const currentSizeRef = useRef<[number, number]>([1, 1]);
  const activeTrackKeyRef = useRef<string | undefined>(
    trackId !== undefined ? String(trackId) : coverUrl
  );
  const activeCoverUrlRef = useRef<string | undefined>(coverUrl);
  const transitionDirRef = useRef<number>(1);
  const [hasWebGlError, setHasWebGlError] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let destroyed = false;
    let renderer: Renderer;
    let gl: any;

    try {
      renderer = new Renderer({
        alpha: false,
        antialias: true,
        dpr: Math.min(window.devicePixelRatio || 1, 1.5)
      });
      gl = renderer.gl;
      gl.clearColor(0.04, 0.04, 0.05, 1);
      rendererRef.current = renderer;
      glRef.current = gl;

      const canvas = gl.canvas;
      canvas.className = 'morph-slider-canvas w-full h-full block';
      canvas.style.borderRadius = `${radius}px`;
      container.innerHTML = '';
      container.appendChild(canvas);

      const geometry = new Triangle(gl);
      const initialTexture = makeFallbackTexture(gl);
      currentTextureRef.current = initialTexture;

      const program = new Program(gl, {
        vertex: vertexShader,
        fragment: fragmentShader,
        uniforms: {
          tCurrent: { value: initialTexture },
          tNext: { value: initialTexture },
          uResolution: { value: [1, 1] },
          uCurrentSize: { value: [1, 1] },
          uNextSize: { value: [1, 1] },
          uProgress: { value: 0 },
          uDir: { value: 1 },
          uMode: { value: TRANSITIONS.melt },
          uIntensity: { value: intensity },
          uScale: { value: scale },
          uAberration: { value: aberration },
          uDrift: { value: drift },
          uTime: { value: 0 },
          uReduce: { value: 0 },
          uPointer: { value: [0.5, 0.5] },
          uOverlay: { value: hexToRgb('#000000') },
          uSameCover: { value: 0 }
        }
      });
      programRef.current = program;

      const mesh = new Mesh(gl, { geometry, program });
      meshRef.current = mesh;

      const resize = () => {
        if (!container || destroyed) return;
        const rect = container.getBoundingClientRect();
        const w = Math.max(rect.width, 1);
        const h = Math.max(rect.height, 1);
        renderer.setSize(w, h);
        program.uniforms.uResolution.value = [gl.canvas.width, gl.canvas.height];
      };

      const ro = new ResizeObserver(resize);
      ro.observe(container);
      resize();

      const loadInitial = (url?: string) => {
        if (!url) return;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        const applyInit = (imgElement: HTMLImageElement) => {
          if (destroyed || !gl || gl.isContextLost()) return;
          try {
            const tex = new Texture(gl, { generateMipmaps: false });
            tex.image = imgElement;
            currentTextureRef.current = tex;
            currentSizeRef.current = [imgElement.naturalWidth || 1, imgElement.naturalHeight || 1];
            program.uniforms.tCurrent.value = tex;
            program.uniforms.tNext.value = tex;
            program.uniforms.uCurrentSize.value = currentSizeRef.current;
            program.uniforms.uNextSize.value = currentSizeRef.current;
          } catch {}
        };
        img.onload = () => applyInit(img);
        img.onerror = () => {
          const fallback = new Image();
          fallback.onload = () => applyInit(fallback);
          fallback.src = url;
          if (fallback.complete && fallback.naturalWidth > 0) applyInit(fallback);
        };
        img.src = url;
        if (img.complete && img.naturalWidth > 0) applyInit(img);
      };

      loadInitial(coverUrl);

      const loop = (t: number) => {
        if (destroyed) return;
        program.uniforms.uTime.value = t * 0.001;
        program.uniforms.uIntensity.value = intensity;
        program.uniforms.uScale.value = scale;
        program.uniforms.uAberration.value = aberration;
        program.uniforms.uDrift.value = drift;
        renderer.render({ scene: mesh });
        rafRef.current = requestAnimationFrame(loop);
      };

      rafRef.current = requestAnimationFrame(loop);

      return () => {
        destroyed = true;
        ro.disconnect();
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        if (tweenRef.current) tweenRef.current.kill();
        if (currentTextureRef.current?.texture) {
          try { gl.deleteTexture(currentTextureRef.current.texture); } catch {}
        }
        if (program?.program) {
          try { gl.deleteProgram(program.program); } catch {}
        }
        const ext = gl.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      };
    } catch (e) {
      console.warn("Kyvra: WebGL MorphCoverTransition initialization fallback", e);
      setHasWebGlError(true);
    }
  }, [radius]);

  // Transição reativa quando a música ou capa muda
  useEffect(() => {
    if (!coverUrl) return;
    const currentKey = trackId !== undefined ? String(trackId) : coverUrl;
    if (currentKey === activeTrackKeyRef.current) return;
    
    const prevCoverUrl = activeCoverUrlRef.current;
    const isSameCover = Boolean(prevCoverUrl && prevCoverUrl === coverUrl);

    activeTrackKeyRef.current = currentKey;
    activeCoverUrlRef.current = coverUrl;

    const gl = glRef.current;
    const program = programRef.current;
    if (!gl || !program || gl.isContextLost()) return;

    const dirVal = direction === 'prev' ? -1 : 1;
    transitionDirRef.current = dirVal;
    program.uniforms.uDir.value = dirVal;
    program.uniforms.uMode.value = TRANSITIONS.melt;

    // Caso 1: Troca de música dentro do mesmo álbum (mesma capa)
    // Dispara liquefação melt no GPU instantaneamente usando a textura já em memória
    if (isSameCover && currentTextureRef.current) {
      if (tweenRef.current) tweenRef.current.kill();

      program.uniforms.uSameCover.value = 1.0;
      program.uniforms.tCurrent.value = currentTextureRef.current;
      program.uniforms.tNext.value = currentTextureRef.current;
      program.uniforms.uCurrentSize.value = currentSizeRef.current;
      program.uniforms.uNextSize.value = currentSizeRef.current;

      tweenRef.current = gsap.fromTo(
        program.uniforms.uProgress,
        { value: 0 },
        {
          value: 1,
          duration: Math.max(duration, 0.45),
          ease: "power2.inOut",
          onComplete: () => {
            program.uniforms.uSameCover.value = 0.0;
            program.uniforms.uProgress.value = 0;
            tweenRef.current = null;
          }
        }
      );
      return;
    }

    // Caso 2: Capa diferente (álbum diferente ou primeira troca de capa)
    let hasStarted = false;
    const nextImg = new Image();
    nextImg.crossOrigin = 'anonymous';

    const startTransition = (loadedImg: HTMLImageElement) => {
      if (hasStarted || !gl || gl.isContextLost()) return;
      hasStarted = true;
      try {
        const nextTex = new Texture(gl, { generateMipmaps: false });
        nextTex.image = loadedImg;
        const nextSize: [number, number] = [loadedImg.naturalWidth || 1, loadedImg.naturalHeight || 1];

        if (currentTextureRef.current) {
          program.uniforms.tCurrent.value = currentTextureRef.current;
          program.uniforms.uCurrentSize.value = currentSizeRef.current;
        }
        program.uniforms.tNext.value = nextTex;
        program.uniforms.uNextSize.value = nextSize;
        program.uniforms.uSameCover.value = 0.0;

        if (tweenRef.current) tweenRef.current.kill();

        tweenRef.current = gsap.fromTo(
          program.uniforms.uProgress,
          { value: 0 },
          {
            value: 1,
            duration: Math.max(duration, 0.45),
            ease: "power2.inOut",
            onComplete: () => {
              if (currentTextureRef.current?.texture && currentTextureRef.current !== nextTex) {
                try { gl.deleteTexture(currentTextureRef.current.texture); } catch {}
              }
              currentTextureRef.current = nextTex;
              currentSizeRef.current = nextSize;
              program.uniforms.tCurrent.value = nextTex;
              program.uniforms.uCurrentSize.value = nextSize;
              program.uniforms.uProgress.value = 0;
              tweenRef.current = null;
            }
          }
        );
      } catch (err) {
        console.warn("Kyvra: Morph transition error", err);
      }
    };

    nextImg.onload = () => startTransition(nextImg);
    nextImg.onerror = () => {
      const fallback = new Image();
      fallback.onload = () => startTransition(fallback);
      fallback.src = coverUrl;
      if (fallback.complete && fallback.naturalWidth > 0) startTransition(fallback);
    };
    nextImg.src = coverUrl;
    if (nextImg.complete && nextImg.naturalWidth > 0) {
      startTransition(nextImg);
    }
  }, [coverUrl, trackId, duration, direction]);

  if (hasWebGlError) {
    return (
      <div className={`relative overflow-hidden aspect-square ${className}`} style={{ borderRadius: `${radius}px`, ...style }}>
        <img
          src={coverUrl}
          alt={title || "Capa da música"}
          className="w-full h-full object-contain"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden aspect-square select-none pointer-events-auto ${className}`.trim()}
      style={{
        borderRadius: `${radius}px`,
        ...style,
      }}
    />
  );
});
MorphCoverTransition.displayName = 'MorphCoverTransition';

export default MorphSlider;

