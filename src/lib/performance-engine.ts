export class UltraPerformanceEngine {
  targetFPS: number;
  lowModeFPS: number;
  frameTimes: number[];
  lastFrame: number;
  lowPerformanceMode: boolean;
  observer: IntersectionObserver | null;

  constructor(options: { targetFPS?: number; lowModeFPS?: number } = {}) {
    this.targetFPS = options.targetFPS || 120;
    this.lowModeFPS = options.lowModeFPS || 30;

    this.frameTimes = [];
    this.lastFrame = performance.now();

    this.lowPerformanceMode = false;

    this.observer = null;

    this.init();
  }

  init() {
    this.optimizeCSS();
    this.optimizeEvents();
    this.optimizeImages();
    this.optimizeAnimations();
    this.optimizeCanvas();
    // this.optimizeDOM(); // Disabled specifically for React compatibility, as moving root during mount causes crashes.
    this.monitorFPS();
    this.virtualizeOffscreen();
  }

  /* =========================
     FPS MONITOR
  ========================= */

  monitorFPS() {
    const loop = (now: number) => {
      const delta = now - this.lastFrame;
      this.lastFrame = now;

      // Prevent Infinity on first frame or identical frames
      if (delta > 0) {
        const fps = 1000 / delta;
        this.frameTimes.push(fps);

        if (this.frameTimes.length > 60) {
          this.frameTimes.shift();
        }

        const avgFPS =
          this.frameTimes.reduce((a, b) => a + b, 0) /
          this.frameTimes.length;

        if (avgFPS < 45 && !this.lowPerformanceMode) {
          this.enableLowPerformanceMode();
        }

        if (avgFPS > 80 && this.lowPerformanceMode) {
          this.disableLowPerformanceMode();
        }
      }

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }

  enableLowPerformanceMode() {
    this.lowPerformanceMode = true;

    document.documentElement.classList.add("low-performance");

    console.warn("LOW PERFORMANCE MODE ENABLED");
  }

  disableLowPerformanceMode() {
    this.lowPerformanceMode = false;

    document.documentElement.classList.remove("low-performance");

    console.warn("LOW PERFORMANCE MODE DISABLED");
  }

  /* =========================
     CSS OPTIMIZATION
  ========================= */

  optimizeCSS() {
    const style = document.createElement("style");

    style.innerHTML = `
      * {
        backface-visibility: hidden;
        -webkit-font-smoothing: antialiased;
      }

      .gpu-layer {
        transform: translateZ(0);
        will-change: transform, opacity;
      }

      .low-performance * {
        animation-duration: 0.001ms !important;
        transition-duration: 0.001ms !important;
        scroll-behavior: auto !important;
      }
    `;

    document.head.appendChild(style);
  }

  /* =========================
     EVENT OPTIMIZATION
  ========================= */

  optimizeEvents() {
    const passiveEvents = [
      "scroll",
      "touchstart",
      "touchmove",
      "wheel"
    ];

    passiveEvents.forEach(eventType => {
      window.addEventListener(
        eventType,
        () => {},
        { passive: true }
      );
    });
  }

  /* =========================
     IMAGE OPTIMIZATION
  ========================= */

  optimizeImages() {
    const images = document.querySelectorAll("img");

    images.forEach(img => {
      img.loading = "lazy";
      img.decoding = "async";

      if (!img.width) img.width = img.naturalWidth;
      if (!img.height) img.height = img.naturalHeight;
    });
  }

  /* =========================
     ANIMATION OPTIMIZATION
  ========================= */

  optimizeAnimations() {
    const animated = document.querySelectorAll("*");

    animated.forEach(el => {
      const style = getComputedStyle(el);

      if (
        style.animationName !== "none" ||
        style.transitionDuration !== "0s"
      ) {
        el.classList.add("gpu-layer");
      }
    });
  }

  /* =========================
     CANVAS OPTIMIZATION
  ========================= */

  optimizeCanvas() {
    const canvases = document.querySelectorAll("canvas");

    canvases.forEach(canvas => {

      const ctx = canvas.getContext("2d", {
        alpha: false,
        desynchronized: true
      });

      if (!ctx) return;

      // Adaptive resolution scaling
      const scale = window.devicePixelRatio > 1 ? 0.75 : 1;

      const width = canvas.clientWidth * scale;
      const height = canvas.clientHeight * scale;

      canvas.width = width;
      canvas.height = height;

      ctx.imageSmoothingEnabled = false;
    });
  }

  /* =========================
     DOM OPTIMIZATION
  ========================= */

  optimizeDOM() {
    const fragment = document.createDocumentFragment();

    while (document.body.firstChild) {
      if (document.body.firstChild !== document.getElementById('root')) {
         fragment.appendChild(document.body.firstChild);
      } else {
         break;
      }
    }

    requestAnimationFrame(() => {
      document.body.appendChild(fragment);
    });
  }

  /* =========================
     OFFSCREEN VIRTUALIZATION
  ========================= */

  virtualizeOffscreen() {
    this.observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) {
            (entry.target as HTMLElement).style.contentVisibility = "auto";
          } else {
            (entry.target as HTMLElement).style.contentVisibility = "visible";
          }
        });
      },
      {
        rootMargin: "500px"
      }
    );

    // Only observe root-level sections to avoid observer overhead
    document.querySelectorAll("section, #root > div > section").forEach(el => {
      this.observer!.observe(el);
    });
  }
}
