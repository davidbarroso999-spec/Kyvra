import { useState } from 'react';
import { motion } from 'motion/react';
import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Volume2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

export function MiniPlayer() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { currentTrack, isPlaying, setIsPlaying, playNext, playPrevious } = useStore();

  if (!currentTrack) return null;

  return (
    <>
      {/* Compact Player */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: isExpanded ? 100 : 0, opacity: isExpanded ? 0 : 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed bottom-6 right-6 z-[1000] glass rounded-xl p-3 flex items-center gap-4 w-[320px] shadow-2xl cursor-pointer"
        onClick={() => setIsExpanded(true)}
      >
        <img src={currentTrack.coverUrl} alt="Cover" className="w-12 h-12 rounded object-cover" referrerPolicy="no-referrer" />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-text-high truncate">{currentTrack.title}</h4>
          <p className="text-xs text-text-low truncate">{currentTrack.artist}</p>
        </div>
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <button onClick={playPrevious} className="text-text-mid hover:text-text-high transition-colors">
            <SkipBack size={16} />
          </button>
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-8 h-8 flex items-center justify-center bg-primary text-void rounded-full hover:scale-105 transition-transform"
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
          </button>
          <button onClick={playNext} className="text-text-mid hover:text-text-high transition-colors">
            <SkipForward size={16} />
          </button>
        </div>
        {/* Progress Bar (Visual only for compact) */}
        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-border rounded-b-xl overflow-hidden">
          <div className="h-full bg-primary w-1/3" />
        </div>
      </motion.div>

      {/* Expanded Player Overlay */}
      {isExpanded && (
        <motion.div
          initial={{ y: '100vh' }}
          animate={{ y: 0 }}
          exit={{ y: '100vh' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed inset-0 z-[2000] bg-void/95 flex flex-col"
        >
          {/* Blurred Background */}
          <div 
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              backgroundImage: `url(${currentTrack.coverUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(80px) saturate(1.5) brightness(0.4)'
            }}
          />

          <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full">
            <button 
              onClick={() => setIsExpanded(false)}
              className="absolute top-6 right-6 text-text-mid hover:text-text-high"
            >
              <span className="text-2xl">↓</span>
            </button>

            <motion.img 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              src={currentTrack.coverUrl} 
              alt="Cover" 
              className="w-64 h-64 sm:w-80 sm:h-80 rounded-xl object-cover shadow-[0_40px_120px_rgba(0,0,0,0.8),0_0_60px_var(--glow-purple)] mb-12"
              referrerPolicy="no-referrer"
            />

            <div className="w-full text-center mb-8">
              <h2 className="text-3xl font-display text-text-high mb-2">{currentTrack.title}</h2>
              <p className="text-lg text-text-mid">{currentTrack.artist}</p>
            </div>

            {/* Progress */}
            <div className="w-full mb-8 group cursor-pointer">
              <div className="h-1.5 bg-border rounded-full relative">
                <div className="absolute top-0 left-0 h-full bg-primary rounded-full w-1/3" />
                <div className="absolute top-1/2 -translate-y-1/2 left-1/3 w-3 h-3 bg-text-high rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_10px_var(--primary)]" />
              </div>
              <div className="flex justify-between mt-2 font-mono text-xs text-text-low">
                <span>1:24</span>
                <span>{currentTrack.duration}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between w-full mb-8">
              <button className="text-text-mid hover:text-primary transition-colors"><Shuffle size={20} /></button>
              <button onClick={playPrevious} className="text-text-high hover:text-primary transition-colors"><SkipBack size={32} /></button>
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-16 h-16 flex items-center justify-center bg-primary text-void rounded-full hover:scale-105 transition-transform shadow-[0_0_30px_var(--glow-purple)]"
              >
                {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
              </button>
              <button onClick={playNext} className="text-text-high hover:text-primary transition-colors"><SkipForward size={32} /></button>
              <button className="text-text-mid hover:text-primary transition-colors"><Repeat size={20} /></button>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-3 w-full max-w-[200px] text-text-mid">
              <Volume2 size={16} />
              <div className="h-1 flex-1 bg-border rounded-full relative cursor-pointer">
                <div className="absolute top-0 left-0 h-full bg-text-high rounded-full w-4/5" />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
}
