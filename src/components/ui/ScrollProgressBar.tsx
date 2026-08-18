import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface ScrollProgressBarProps {
  progress: number;
}

export function ScrollProgressBar({ progress }: ScrollProgressBarProps) {
  // Esconde o indicador suavemente se já tiver chegado ao final
  const isComplete = progress > 0.98;

  return (
    <div 
      className={cn(
        "absolute left-3 sm:left-8 top-1/2 -translate-y-1/2 h-[40vh] sm:h-[50vh] w-[2px] bg-white/10 z-[4000] rounded-full flex flex-col justify-start transition-opacity duration-1000 pointer-events-none mix-blend-screen",
        isComplete ? "opacity-0" : "opacity-100"
      )}
    >
      <motion.div 
        className="w-full bg-primary relative rounded-full"
        style={{ 
          height: `${progress * 100}%`,
          boxShadow: '0 0 15px var(--primary), 0 0 30px var(--primary)'
        }}
      >
        {/* Fagulha incandescente na ponta */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[4px] h-[12px] bg-white rounded-full shadow-[0_0_12px_white] blur-[1px]" />
      </motion.div>
      
      {/* Label flutuante do lado da fagulha */}
      <motion.div 
        className="absolute left-4 sm:left-6 font-mono text-[9px] sm:text-[10px] text-white/70 tracking-[0.3em] uppercase flex flex-col items-start whitespace-nowrap"
        style={{ top: `${progress * 100}%`, y: '-50%' }}
      >
        <span className="text-primary font-bold drop-shadow-[0_0_8px_var(--primary)]">{Math.round(progress * 100)}%</span>
        <span className="text-[7px] sm:text-[8px] opacity-50 mt-0.5">Sincronizando</span>
      </motion.div>
    </div>
  );
}
