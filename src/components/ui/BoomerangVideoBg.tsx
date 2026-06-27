import { useEffect, useRef, useState } from 'react';

interface BoomerangVideoBgProps {
  videoUrl?: string;
}

export function BoomerangVideoBg({
  videoUrl = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260611_183632_c311af08-e4b7-458f-81e7-79847a49b3d3.mp4"
}: BoomerangVideoBgProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isPlayingCanvas, setIsPlayingCanvas] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Arrays de canvases offscreen capturados
  const framesRef = useRef<HTMLCanvasElement[]>([]);
  const isCapturingRef = useRef(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Resetar estado de captura
    framesRef.current = [];
    isCapturingRef.current = true;
    setIsPlayingCanvas(false);
    setLoadingProgress(0);

    let rvfcId: number | null = null;
    let rafId: number | null = null;
    let lastTime = -1;

    const captureFrame = () => {
      if (!isCapturingRef.current || !video) return;

      const videoW = video.videoWidth;
      const videoH = video.videoHeight;
      if (videoW === 0 || videoH === 0) {
        // Vídeo ainda não carregou os metadados de dimensões
        if ('requestVideoFrameCallback' in video) {
          rvfcId = (video as any).requestVideoFrameCallback(captureFrame);
        } else {
          rafId = requestAnimationFrame(captureFrame);
        }
        return;
      }

      // Evitar capturar frames duplicados caso o currentTime seja idêntico
      if (video.currentTime !== lastTime) {
        lastTime = video.currentTime;

        // Calcular tamanho proporcional com largura máxima de 960px
        const maxW = 960;
        let targetW = videoW;
        let targetH = videoH;

        if (videoW > maxW) {
          const ratio = maxW / videoW;
          targetW = maxW;
          targetH = Math.round(videoH * ratio);
        }

        // Criar canvas offscreen para guardar o frame
        const offscreen = document.createElement('canvas');
        offscreen.width = targetW;
        offscreen.height = targetH;
        const ctx = offscreen.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, targetW, targetH);
          framesRef.current.push(offscreen);

          // Atualizar progresso visual aproximado baseado na duração
          if (video.duration) {
            setLoadingProgress(Math.min(100, Math.round((video.currentTime / video.duration) * 100)));
          }
        }
      }

      // Agendar próxima captura
      if ('requestVideoFrameCallback' in video) {
        rvfcId = (video as any).requestVideoFrameCallback(captureFrame);
      } else {
        rafId = requestAnimationFrame(captureFrame);
      }
    };

    const onPlay = () => {
      if ('requestVideoFrameCallback' in video) {
        rvfcId = (video as any).requestVideoFrameCallback(captureFrame);
      } else {
        rafId = requestAnimationFrame(captureFrame);
      }
    };

    const onEnded = () => {
      isCapturingRef.current = false;
      if (rvfcId) (video as any).cancelVideoFrameCallback(rvfcId);
      if (rafId) cancelAnimationFrame(rafId);

      if (framesRef.current.length > 0) {
        setIsPlayingCanvas(true);
      }
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('ended', onEnded);

    // Começa a carregar e tocar
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    video.play().catch(err => {
      console.warn("Kyvra [BoomerangVideoBg]: Falha na reprodução automática do vídeo:", err);
    });

    return () => {
      isCapturingRef.current = false;
      if (video) {
        video.removeEventListener('play', onPlay);
        video.removeEventListener('ended', onEnded);
        video.pause();
      }
      if (rvfcId && video) {
        try {
          (video as any).cancelVideoFrameCallback(rvfcId);
        } catch(e){}
      }
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [videoUrl]);

  // Loop de reprodução em canvas (Boomerang / Ping-pong) a 30fps
  useEffect(() => {
    if (!isPlayingCanvas || framesRef.current.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let currentFrameIndex = 0;
    let direction = 1; // 1 = forward, -1 = backward
    let lastTimestamp = 0;
    const fpsInterval = 1000 / 30; // 30fps em ms

    // Redimensionar canvas de acordo com o tamanho do elemento pai e pixels do dispositivo
    const resizeCanvas = () => {
      if (!canvas || !canvas.parentElement) return;
      canvas.width = canvas.parentElement.clientWidth * window.devicePixelRatio;
      canvas.height = canvas.parentElement.clientHeight * window.devicePixelRatio;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const playLoop = (timestamp: number) => {
      animationFrameId = requestAnimationFrame(playLoop);

      const elapsed = timestamp - lastTimestamp;
      if (elapsed >= fpsInterval) {
        lastTimestamp = timestamp - (elapsed % fpsInterval);

        const frame = framesRef.current[currentFrameIndex];
        if (frame && canvas) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Desenhar o frame cobrindo todo o canvas (object-fit: cover via 2D)
          const canvasW = canvas.width;
          const canvasH = canvas.height;
          const imgW = frame.width;
          const imgH = frame.height;
          
          const ratioX = canvasW / imgW;
          const ratioY = canvasH / imgH;
          const ratio = Math.max(ratioX, ratioY);
          
          const newW = imgW * ratio;
          const newH = imgH * ratio;
          const x = (canvasW - newW) / 2;
          const y = (canvasH - newH) / 2;

          ctx.drawImage(frame, x, y, newW, newH);
        }

        // Avançar/retroceder índice de frames
        currentFrameIndex += direction;

        if (currentFrameIndex >= framesRef.current.length) {
          currentFrameIndex = Math.max(0, framesRef.current.length - 2);
          direction = -1; // inverter direção para trás
        } else if (currentFrameIndex < 0) {
          currentFrameIndex = Math.min(1, framesRef.current.length - 1);
          direction = 1; // inverter direção para a frente
        }
      }
    };

    animationFrameId = requestAnimationFrame(playLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [isPlayingCanvas]);

  return (
    <div id="boomerang-video-container" className="absolute inset-0 z-0 scale-[1.08] origin-center overflow-hidden">
      {/* Vídeo para captura inicial e reprodução até acabar */}
      <video
        ref={videoRef}
        src={videoUrl}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
          isPlayingCanvas ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        muted
        playsInline
        webkit-playsinline="true"
        crossOrigin="anonymous"
      />

      {/* Canvas para a reprodução do ping-pong a 30fps */}
      {isPlayingCanvas && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Sombra escura cinemática para dar contraste de alto padrão */}
      <div className="absolute inset-0 bg-gradient-to-t from-void via-void/40 to-void/70 pointer-events-none z-10" />
      <div className="absolute inset-0 bg-radial-gradient from-transparent via-void/50 to-void pointer-events-none z-10" />
    </div>
  );
}
