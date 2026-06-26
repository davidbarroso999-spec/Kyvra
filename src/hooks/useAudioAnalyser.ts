import { useEffect, useState } from 'react';

// Registro global de conexões para evitar erros de duplicidade de MediaElementAudioSourceNode
const audioConnections = new WeakMap<HTMLAudioElement, {
  audioContext: AudioContext;
  analyser: AnalyserNode;
  source: MediaElementAudioSourceNode;
}>();

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

    const isAndroid = typeof window !== 'undefined' && /android/i.test(navigator.userAgent);
    if (isAndroid) {
      // No Android APK, o Web Audio API é evitado para manter os controles de mídia nativos operacionais
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
        } else {
          // Atualiza o fftSize caso tenha mudado
          if (connection.analyser.fftSize !== fftSize) {
            connection.analyser.fftSize = fftSize;
          }
        }

        setAnalyser(connection.analyser);
        setAudioContext(connection.audioContext);

        if (connection.audioContext.state === 'suspended') {
          const resumeCtx = () => {
            connection?.audioContext.resume();
            audioElement.removeEventListener('play', resumeCtx);
            audioElement.removeEventListener('playing', resumeCtx);
          };
          audioElement.addEventListener('play', resumeCtx);
          audioElement.addEventListener('playing', resumeCtx);
        }
      } catch (error) {
        console.warn('Kyvra [useAudioAnalyser]: Falha ao conectar Web Audio API:', error);
      }
    };

    // Ativa quando o áudio começar a tocar, ou imediatamente se já estiver ativo
    if (!audioElement.paused) {
      initAudioContext();
    } else {
      audioElement.addEventListener('play', initAudioContext, { once: true });
    }

    return () => {
      // A conexão permanece em cache no WeakMap global para reuso posterior
    };
  }, [audioElement, fftSize]);

  return {
    analyser,
    audioContext,
    audioElement,
    isActive: !!analyser
  };
}
