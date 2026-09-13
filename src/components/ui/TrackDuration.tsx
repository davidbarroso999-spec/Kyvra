import { memo, useState, useEffect } from 'react';

const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// Cache de durações já resolvidas: evita recriar elementos <audio> para a
// mesma faixa em re-renderizações de lista e entre páginas (Arquivo/Álbum).
const durationCache = new Map<string, string>();

// Deduplica requisições em voo: várias linhas com a mesma URL compartilham
// a mesma promise em vez de disparar downloads paralelos concorrentes.
const inFlightRequests = new Map<string, Promise<string>>();

function requestAudioDuration(audioUrl: string): Promise<string> {
  const cached = durationCache.get(audioUrl);
  if (cached) return Promise.resolve(cached);

  const inFlight = inFlightRequests.get(audioUrl);
  if (inFlight) return inFlight;

  const promise = new Promise<string>((resolve) => {
    // Um único elemento <audio> é suficiente para ler o cabeçalho do arquivo
    // (preload="metadata" evita baixar o áudio inteiro).
    const audio = new Audio();
    audio.preload = 'metadata';

    const cleanup = () => {
      audio.removeAttribute('src');
      try { audio.load(); } catch (_e) { /* noop */ }
      inFlightRequests.delete(audioUrl);
    };

    const timeout = window.setTimeout(() => {
      cleanup();
      resolve('0:00');
    }, 12000);

    audio.addEventListener('loadedmetadata', () => {
      window.clearTimeout(timeout);
      const duration = isFinite(audio.duration) && audio.duration > 0
        ? formatDuration(audio.duration)
        : '0:00';
      durationCache.set(audioUrl, duration);
      cleanup();
      resolve(duration);
    }, { once: true });

    audio.addEventListener('error', () => {
      window.clearTimeout(timeout);
      cleanup();
      resolve('0:00');
    }, { once: true });

    audio.src = audioUrl;
  });

  inFlightRequests.set(audioUrl, promise);
  return promise;
}

export const TrackDuration = memo(function TrackDuration({ audioUrl, defaultDuration }: { audioUrl?: string, defaultDuration?: string }) {
  const [duration, setDuration] = useState(() => {
    if (defaultDuration && defaultDuration !== '0:00') return defaultDuration;
    if (audioUrl) return durationCache.get(audioUrl) ?? '0:00';
    return '0:00';
  });

  useEffect(() => {
    if (defaultDuration && defaultDuration !== '0:00') {
      setDuration(defaultDuration);
      return;
    }

    if (!audioUrl) {
      setDuration('0:00');
      return;
    }

    // Serve instantaneamente do cache quando disponível.
    const cached = durationCache.get(audioUrl);
    if (cached) {
      setDuration(cached);
      return;
    }

    let isCurrent = true;
    requestAudioDuration(audioUrl).then((value) => {
      if (isCurrent && value !== '0:00') {
        setDuration(value);
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [audioUrl, defaultDuration]);

  return <span>{duration}</span>;
});
