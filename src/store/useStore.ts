import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'abissal' | 'sangue-de-drago' | 'floresta-negra' | 'mar-profundo' | 'crepusculo' | 'monolito' | 'claro';

interface Track {
  id: string;
  title: string;
  artist: string;
  duration: string;
  coverUrl: string;
  vibe: string;
  audioUrl?: string;
  lyrics?: string;
}

interface AppState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  
  // Player State
  currentTrack: Track | null;
  isPlaying: boolean;
  queue: Track[];
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
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: 'abissal',
      setTheme: (theme) => {
        set({ theme });
        // Update html class
        document.documentElement.className = theme === 'abissal' ? '' : `theme-${theme}`;
      },
      
      currentTrack: null,
      isPlaying: false,
      queue: [],
      volume: 0.8,
      isShuffle: false,
      repeatMode: 'off',
      
      setCurrentTrack: (track) => set({ currentTrack: track, isPlaying: true }),
      setIsPlaying: (isPlaying) => set({ isPlaying }),
      setQueue: (queue) => set({ queue }),
      setVolume: (volume) => set({ volume }),
      toggleShuffle: () => set((state) => ({ isShuffle: !state.isShuffle })),
      toggleRepeat: () => set((state) => {
        const nextMode = state.repeatMode === 'off' ? 'all' : state.repeatMode === 'all' ? 'one' : 'off';
        return { repeatMode: nextMode };
      }),
      
      playNext: () => {
        const { currentTrack, queue, isShuffle, repeatMode } = get();
        if (!currentTrack || queue.length === 0) return;
        
        if (isShuffle) {
          const randomIndex = Math.floor(Math.random() * queue.length);
          set({ currentTrack: queue[randomIndex], isPlaying: true });
          return;
        }

        const currentIndex = queue.findIndex(t => t.id === currentTrack.id);
        if (currentIndex !== -1) {
          if (repeatMode === 'off' && currentIndex === queue.length - 1) {
            set({ isPlaying: false });
            return;
          }
          const nextIndex = (currentIndex + 1) % queue.length;
          set({ currentTrack: queue[nextIndex], isPlaying: true });
        }
      },
      
      playPrevious: () => {
        const { currentTrack, queue, isShuffle } = get();
        if (!currentTrack || queue.length === 0) return;
        
        if (isShuffle) {
          const randomIndex = Math.floor(Math.random() * queue.length);
          set({ currentTrack: queue[randomIndex], isPlaying: true });
          return;
        }

        const currentIndex = queue.findIndex(t => t.id === currentTrack.id);
        if (currentIndex !== -1) {
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : queue.length - 1;
          set({ currentTrack: queue[prevIndex], isPlaying: true });
        }
      }
    }),
    {
      name: 'kyvra-storage',
      partialize: (state) => ({ theme: state.theme, volume: state.volume }),
    }
  )
);
