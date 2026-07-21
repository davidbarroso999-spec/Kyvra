import { registerPlugin, Capacitor } from '@capacitor/core';
import type { Track } from '@/store/useStore';

export interface KyvraAudioPlugin {
  setQueue(options: { tracks: Track[]; startIndex: number }): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  skipToNext(): Promise<void>;
  skipToPrevious(): Promise<void>;
  seekTo(options: { positionMs: number }): Promise<void>;
  getPosition(): Promise<{ positionMs: number; durationMs: number; isPlaying: boolean }>;
  addListener(
    eventName: 'playbackStateChanged' | 'trackChanged' | 'playbackError',
    listenerFunc: (data: any) => void
  ): Promise<{ remove: () => void }>;
}

export const KyvraAudio = registerPlugin<KyvraAudioPlugin>('KyvraAudio');

// Só existe player nativo no Android empacotado — no navegador continua tudo via <audio>
export const isNativeAudioAvailable = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
