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
          analyserNode.connect(context.destination);

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
