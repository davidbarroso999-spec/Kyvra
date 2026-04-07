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
}

interface AppState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  
  // Player State
  currentTrack: Track | null;
  isPlaying: boolean;
  queue: Track[];
  volume: number;
  
  setCurrentTrack: (track: Track) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setQueue: (queue: Track[]) => void;
  setVolume: (volume: number) => void;
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
      
      setCurrentTrack: (track) => set({ currentTrack: track, isPlaying: true }),
      setIsPlaying: (isPlaying) => set({ isPlaying }),
      setQueue: (queue) => set({ queue }),
      setVolume: (volume) => set({ volume }),
      
      playNext: () => {
        const { currentTrack, queue } = get();
        if (!currentTrack || queue.length === 0) return;
        
        const currentIndex = queue.findIndex(t => t.id === currentTrack.id);
        if (currentIndex !== -1 && currentIndex < queue.length - 1) {
          set({ currentTrack: queue[currentIndex + 1], isPlaying: true });
        }
      },
      
      playPrevious: () => {
        const { currentTrack, queue } = get();
        if (!currentTrack || queue.length === 0) return;
        
        const currentIndex = queue.findIndex(t => t.id === currentTrack.id);
        if (currentIndex > 0) {
          set({ currentTrack: queue[currentIndex - 1], isPlaying: true });
        }
      }
    }),
    {
      name: 'kyvra-storage',
      partialize: (state) => ({ theme: state.theme, volume: state.volume }),
    }
  )
);
