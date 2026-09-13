import { attachScrollResonanceToMedia } from "@/lib/scrollAudioResonance";
import { useEffect, useState } from 'react';

// Registro global de conexões para evitar erros de duplicidade de MediaElementAudioSourceNode
const audioConnections = new WeakMap<HTMLAudioElement, {
  audioContext: AudioContext;
  analyser: AnalyserNode;
  source: MediaElementAudioSourceNode;
}>();

// Global set of active AudioContexts to resume them on user interaction
const activeAudioContexts = new Set<AudioContext>();

if (typeof window !== 'undefined') {
  const resumeAll = () => {
    activeAudioContexts.forEach(ctx => {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    });
  };
  window.addEventListener('click', resumeAll, { passive: true });
  window.addEventListener('touchstart', resumeAll, { passive: true });
}

let globalAudioElement: HTMLAudioElement | null = null;
const registryListeners = new Set<(el: HTMLAudioElement | null) => void>();

/**
 * Registra o elemento <audio> principal para que toda a aplicação possa consumi-lo.
 */
export const registerAudioElement = (el: HTMLAudioElement | null) => {
  globalAudioElement = el;
  registryListeners.forEach(listener => listener(el));
};

/**
 * Retorna o elemento de áudio ativo no momento.
 */
export const getAudioElement = () => globalAudioElement;

/**
 * Inscreve-se nas atualizações do elemento de áudio ativo.
 */
export const subscribeAudioElement = (listener: (el: HTMLAudioElement | null) => void) => {
  registryListeners.add(listener);
  listener(globalAudioElement);
  return () => {
    registryListeners.delete(listener);
  };
};

/**
 * Garante que o elemento de áudio já esteja roteado pelo grafo Web Audio
 * (AnalyserNode + FX de ressonância) ANTES de começar a tocar.
 *
 * Conectar o elemento no meio da reprodução rerroteia o som por um caminho de
 * renderização diferente e causa a queda perceptível de volume relatada quando
 * o player em tela cheia monta o visualizador. Aquecendo o grafo no primeiro
 * gesto do usuário, o play nasce já pelo caminho final — sem salto de volume.
 * Chamadas repetidas são no-op (a conexão é única por elemento).
 */
export function ensureAudioGraph(): void {
  if (typeof window === 'undefined') return;
  const element = globalAudioElement ?? document.querySelector('audio');
  if (!element) return;

  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return;

  try {
    let connection = audioConnections.get(element);

    if (!connection) {
      const context = new AudioCtx();
      const analyserNode = context.createAnalyser();
      analyserNode.fftSize = 256;

      const sourceNode = context.createMediaElementSource(element);
      sourceNode.connect(analyserNode);
      attachScrollResonanceToMedia(context, sourceNode, context.destination);

      connection = {
        audioContext: context,
        analyser: analyserNode,
        source: sourceNode,
      };
      audioConnections.set(element, connection);
      activeAudioContexts.add(context);
    }

    if (connection.audioContext.state === 'suspended') {
      connection.audioContext.resume().catch(() => {});
    }
  } catch (error) {
    console.warn('Kyvra [useAudioAnalyser]: Falha ao preparar o grafo de áudio:', error);
  }
}

// Aquece o grafo no primeiro gesto do usuário (clique/tecla), antes de qualquer play.
if (typeof window !== 'undefined') {
  const warmUpOnFirstGesture = () => {
    const element = globalAudioElement ?? document.querySelector('audio');
    if (!element) return; // Player ainda não montado; tenta no próximo gesto
    ensureAudioGraph();
    window.removeEventListener('pointerdown', warmUpOnFirstGesture);
    window.removeEventListener('keydown', warmUpOnFirstGesture);
  };
  window.addEventListener('pointerdown', warmUpOnFirstGesture, { passive: true });
  window.addEventListener('keydown', warmUpOnFirstGesture);
}

export interface UseAudioAnalyserOptions {
  fftSize?: number;
}

/**
 * Hook reutilizável que captura o fluxo de áudio ativo e disponibiliza o AnalyserNode.
 * Totalmente seguro contra re-renders e desmontagens de componentes.
 */
export function useAudioAnalyser(options: UseAudioAnalyserOptions = {}) {
  const { fftSize = 256 } = options;
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(globalAudioElement);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  // Escuta atualizações do elemento de áudio global
  useEffect(() => {
    const unsubscribe = subscribeAudioElement((el) => {
      setAudioElement(el);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!audioElement) {
      setAnalyser(null);
      setAudioContext(null);
      return;
    }

    const initAudioContext = () => {
      try {
        let connection = audioConnections.get(audioElement);

        if (!connection) {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (!AudioCtx) return;
          const context = new AudioCtx();
          const analyserNode = context.createAnalyser();
          analyserNode.fftSize = fftSize;

          const sourceNode = context.createMediaElementSource(audioElement);
          sourceNode.connect(analyserNode);
          attachScrollResonanceToMedia(context, sourceNode, context.destination);

          connection = {
            audioContext: context,
            analyser: analyserNode,
            source: sourceNode
          };
          audioConnections.set(audioElement, connection);
          activeAudioContexts.add(context);
        } else {
          // Atualiza o fftSize caso tenha mudado
          if (connection.analyser.fftSize !== fftSize) {
            connection.analyser.fftSize = fftSize;
          }
        }

        setAnalyser(connection.analyser);
        setAudioContext(connection.audioContext);

        if (connection.audioContext.state === 'suspended') {
          connection.audioContext.resume().catch(() => {});
        }
      } catch (error) {
        console.warn('Kyvra [useAudioAnalyser]: Falha ao conectar Web Audio API:', error);
      }
    };

    // Ativa quando o áudio começar a tocar, ou imediatamente se já estiver ativo
    if (!audioElement.paused) {
      initAudioContext();
    }

    // Set up play and playing listeners to ensure we initialize or resume immediately
    const handlePlay = () => {
      initAudioContext();
    };

    audioElement.addEventListener('play', handlePlay);
    audioElement.addEventListener('playing', handlePlay);

    return () => {
      if (audioElement) {
        audioElement.removeEventListener('play', handlePlay);
        audioElement.removeEventListener('playing', handlePlay);
      }
    };
  }, [audioElement, fftSize]);

  return {
    analyser,
    audioContext,
    audioElement,
    isActive: !!analyser
  };
}
