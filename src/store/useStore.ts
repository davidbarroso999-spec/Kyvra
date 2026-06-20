import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'abissal' | 'sangue-de-drago' | 'floresta-negra' | 'monolito';

export interface Track {
  id: string;
  title: string;
  artist: string;
  duration: string;
  coverUrl: string;
  vibe: string;
  audioUrl?: string;
  lyrics?: string;
  albumTitle?: string;
}

interface AppState {
  theme: Theme;
  setTheme: (theme: Theme) => void;

  // Player State
  currentTrack: Track | null;
  isPlaying: boolean;
  queue: Track[];           // Fila original (ordem real das músicas)
  shuffledQueue: Track[];   // Fila embaralhada — usada quando isShuffle = true
  playHistory: Track[];     // Histórico das últimas 50 músicas tocadas (para o botão anterior no shuffle)
  volume: number;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';

  setCurrentTrack: (track: Track) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setQueue: (queue: Track[]) => void;
  setVolume: (volume: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  playNext: () => void;
  playPrevious: () => void;

  // Novas ações de gerenciamento de fila
  playTrackNow: (track: Track) => void;          // Toca imediatamente, insere na posição atual da fila
  addToQueue: (track: Track) => void;            // Adiciona ao final da fila sem interromper
  playNext_track: (track: Track) => void;        // Insere logo após a música atual
  removeFromQueue: (trackId: string) => void;    // Remove uma faixa específica da fila
  updateQueueOrder: (newOrder: Track[]) => void; // Reordena arrastando
  clearQueue: () => void;                        // Limpa a fila (mantém a música atual)
  isPlayerHidden: boolean;
  setPlayerHidden: (hidden: boolean) => void;
}

// Função auxiliar: embaralha um array sem modificar o original
// Usa o algoritmo Fisher-Yates para distribuição uniforme
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: 'abissal',
      setTheme: (theme) => set({ theme }),

      isPlayerHidden: false,
      setPlayerHidden: (isPlayerHidden) => set({ isPlayerHidden }),

      currentTrack: null,
      isPlaying: false,
      queue: [],
      shuffledQueue: [],
      playHistory: [],
      volume: 0.8,
      isShuffle: false,
      repeatMode: 'off',

      setCurrentTrack: (track) => {
        const { playHistory, currentTrack } = get();
        // Salva a música atual no histórico antes de trocar
        if (currentTrack) {
          const newHistory = [currentTrack, ...playHistory].slice(0, 50);
          set({ currentTrack: track, isPlaying: true, playHistory: newHistory });
        } else {
          set({ currentTrack: track, isPlaying: true });
        }
      },

      setIsPlaying: (isPlaying) => set({ isPlaying }),

      setQueue: (newQueue) => {
        const { isShuffle, currentTrack } = get();
        if (isShuffle) {
          const withoutCurrent = newQueue.filter(t => t.id !== currentTrack?.id);
          const shuffled = shuffleArray(withoutCurrent);
          const newShuffledQueue = currentTrack && newQueue.find(t => t.id === currentTrack.id)
            ? [currentTrack, ...shuffled]
            : shuffled;
          set({ queue: newQueue, shuffledQueue: newShuffledQueue });
        } else {
          // Quando shuffle está OFF, não precisa recalcular a shuffledQueue
          // Ela só será gerada quando o usuário ativar o shuffle
          set({ queue: newQueue });
        }
      },

      setVolume: (volume) => set({ volume }),

      toggleShuffle: () => {
        const { isShuffle, queue, currentTrack } = get();
        if (!isShuffle) {
          // Ativando shuffle: gera nova fila embaralhada colocando a música atual PRIMEIRO
          // Isso evita que a música atual seja sorteada novamente como "próxima"
          const withoutCurrent = queue.filter(t => t.id !== currentTrack?.id);
          const shuffled = shuffleArray(withoutCurrent);
          const newShuffledQueue = currentTrack ? [currentTrack, ...shuffled] : shuffled;
          set({ isShuffle: true, shuffledQueue: newShuffledQueue });
        } else {
          // Desativando shuffle: volta para a fila original
          set({ isShuffle: false });
        }
      },

      toggleRepeat: () => set((state) => {
        const order: Array<'off' | 'all' | 'one'> = ['off', 'all', 'one'];
        const currentIndex = order.indexOf(state.repeatMode);
        const nextMode = order[(currentIndex + 1) % order.length];
        return { repeatMode: nextMode };
      }),

      playNext: () => {
        const { currentTrack, queue, shuffledQueue, isShuffle, repeatMode, playHistory } = get();
        if (!currentTrack) return;

        const activeQueue = isShuffle ? shuffledQueue : queue;
        if (activeQueue.length === 0) return;

        // Salva no histórico antes de avançar
        const newHistory = [currentTrack, ...playHistory].slice(0, 50);

        const currentIndex = activeQueue.findIndex(t => t.id === currentTrack.id);

        // Música não está na fila (foi adicionada via playTrackNow fora da fila)
        if (currentIndex === -1) {
          set({ currentTrack: activeQueue[0], isPlaying: true, playHistory: newHistory });
          return;
        }

        const isLastTrack = currentIndex === activeQueue.length - 1;

        if (isLastTrack) {
          if (repeatMode === 'all') {
            // Repeat All: volta ao início da fila
            // Se shuffle estiver ativo, reembaralha para variar a ordem no próximo loop
            if (isShuffle) {
              const reshuffled = shuffleArray(activeQueue);
              set({ shuffledQueue: reshuffled, currentTrack: reshuffled[0], isPlaying: true, playHistory: newHistory });
            } else {
              set({ currentTrack: activeQueue[0], isPlaying: true, playHistory: newHistory });
            }
          } else {
            // repeatMode 'off': para no final da fila
            set({ isPlaying: false, playHistory: newHistory });
          }
          return;
        }

        // Avança normalmente
        set({ currentTrack: activeQueue[currentIndex + 1], isPlaying: true, playHistory: newHistory });
      },

      playPrevious: () => {
        const { currentTrack, queue, shuffledQueue, isShuffle, playHistory } = get();
        if (!currentTrack) return;

        // Se houver histórico, volta para a última música tocada
        // Isso funciona em QUALQUER modo (shuffle ou não)
        if (playHistory.length > 0) {
          const [lastTrack, ...remainingHistory] = playHistory;
          set({ currentTrack: lastTrack, isPlaying: true, playHistory: remainingHistory });
          return;
        }

        // Sem histórico: vai para a música anterior na fila
        const activeQueue = isShuffle ? shuffledQueue : queue;
        const currentIndex = activeQueue.findIndex(t => t.id === currentTrack.id);

        if (currentIndex > 0) {
          set({ currentTrack: activeQueue[currentIndex - 1], isPlaying: true });
        }
        // Se for a primeira da fila e sem histórico, não faz nada
        // (o MiniPlayer já cuida de resetar o currentTime para 0 nesse caso)
      },

      // --- Novas ações de gerenciamento de fila ---

      playTrackNow: (track) => {
        const { currentTrack, queue, playHistory } = get();
        // Insere a faixa logo após a posição atual na fila
        const currentIndex = queue.findIndex(t => t.id === currentTrack?.id);
        const insertAt = currentIndex === -1 ? 0 : currentIndex + 1;
        const newQueue = [...queue];
        newQueue.splice(insertAt, 0, track);

        // Salva histórico e toca imediatamente
        const newHistory = currentTrack ? [currentTrack, ...playHistory].slice(0, 50) : playHistory;
        set({
          queue: newQueue,
          shuffledQueue: shuffleArray(newQueue),
          currentTrack: track,
          isPlaying: true,
          playHistory: newHistory
        });
      },

      addToQueue: (track) => {
        const { queue } = get();
        // Verifica se a música já está na fila para não duplicar
        if (queue.find(t => t.id === track.id)) return;
        const newQueue = [...queue, track];
        set({ queue: newQueue, shuffledQueue: shuffleArray(newQueue) });
      },

      playNext_track: (track) => {
        const { currentTrack, queue } = get();
        // Remove se já existir na fila (evita duplicata)
        const filteredQueue = queue.filter(t => t.id !== track.id);
        const currentIndex = filteredQueue.findIndex(t => t.id === currentTrack?.id);
        const insertAt = currentIndex === -1 ? filteredQueue.length : currentIndex + 1;
        const newQueue = [...filteredQueue];
        newQueue.splice(insertAt, 0, track);
        set({ queue: newQueue, shuffledQueue: shuffleArray(newQueue) });
      },

      removeFromQueue: (trackId) => {
        const { queue, currentTrack } = get();
        // Não permite remover a música que está tocando
        if (currentTrack?.id === trackId) return;
        const newQueue = queue.filter(t => t.id !== trackId);
        set({ queue: newQueue, shuffledQueue: shuffleArray(newQueue) });
      },

      updateQueueOrder: (newOrder) => {
        const { isShuffle } = get();
        if (isShuffle) {
          set({ shuffledQueue: newOrder });
        } else {
          set({ queue: newOrder });
        }
      },

      clearQueue: () => {
        const { currentTrack } = get();
        // Mantém apenas a música atual na fila
        const newQueue = currentTrack ? [currentTrack] : [];
        set({ queue: newQueue, shuffledQueue: newQueue });
      },
    }),
    {
      name: 'kyvra-storage',
      // Persiste somente preferências do usuário, nunca o estado de reprodução
      partialize: (state) => ({
        theme: state.theme,
        volume: state.volume,
        isShuffle: state.isShuffle,
        repeatMode: state.repeatMode,
        isPlayerHidden: state.isPlayerHidden,
      }),
    }
  )
);
