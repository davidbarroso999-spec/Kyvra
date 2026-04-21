import { Capacitor } from '@capacitor/core';

// Verifica se está rodando no Android nativo
const isNative = Capacitor.isNativePlatform();

// Declara o plugin globalmente (ele é injetado pelo Capacitor)
declare const MusicControls: any;

export interface MusicControlsOptions {
  title: string;
  artist: string;
  cover?: string;
  isPlaying: boolean;
  hasPrev?: boolean;
  hasNext?: boolean;
  hasClose?: boolean;
}

/**
 * Cria/atualiza a notificação do player na barra de notificações.
 * Chame isso sempre que a faixa atual mudar.
 */
export function createMusicControls(options: MusicControlsOptions) {
  if (!isNative || typeof MusicControls === 'undefined') return;

  MusicControls.create({
    track: options.title,
    artist: options.artist,
    cover: options.cover ?? '',
    isPlaying: options.isPlaying,
    dismissable: true,
    hasPrev: options.hasPrev ?? true,
    hasNext: options.hasNext ?? true,
    hasClose: options.hasClose ?? true,
    hasSkipForward: false,
    hasSkipBackward: false,
    elapsed: 0,
    duration: 0,
    ticker: `Tocando: ${options.title}`,
    playIcon: 'media_play',
    pauseIcon: 'media_pause',
    prevIcon: 'media_prev',
    nextIcon: 'media_next',
    closeIcon: 'media_close',
    notificationIcon: '',
  }, () => {}, () => {});
}

/**
 * Atualiza somente o estado de play/pause sem recriar a notificação.
 */
export function updateMusicControlsState(isPlaying: boolean) {
  if (!isNative || typeof MusicControls === 'undefined') return;
  if (isPlaying) {
    MusicControls.updateIsPlaying(true);
  } else {
    MusicControls.updateIsPlaying(false);
  }
}

/**
 * Registra os listeners dos botões da notificação
 * (anterior, próximo, play/pause, fechar).
 * Chame UMA VEZ só na inicialização do app.
 *
 * @param callbacks - Objeto com as funções de ação do player
 */
export function registerMusicControlsListeners(callbacks: {
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onStop: () => void;
}) {
  if (!isNative || typeof MusicControls === 'undefined') return;

  MusicControls.subscribe((action: string) => {
    const message = JSON.parse(action).message;
    switch (message) {
      case 'music-controls-play':
        callbacks.onPlay();
        break;
      case 'music-controls-pause':
        callbacks.onPause();
        break;
      case 'music-controls-next':
        callbacks.onNext();
        break;
      case 'music-controls-previous':
        callbacks.onPrevious();
        break;
      case 'music-controls-destroy':
      case 'music-controls-media-button-stop':
        callbacks.onStop();
        break;
      default:
        break;
    }
  });

  MusicControls.listen();
}

/**
 * Destrói a notificação do player.
 * Chame quando o usuário parar completamente a reprodução.
 */
export function destroyMusicControls() {
  if (!isNative || typeof MusicControls === 'undefined') return;
  MusicControls.destroy();
}
