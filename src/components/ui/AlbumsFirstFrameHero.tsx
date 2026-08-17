import { motion } from 'motion/react';

interface AlbumsFirstFrameHeroProps {
  progress: number;
}

export function AlbumsFirstFrameHero({ progress }: AlbumsFirstFrameHeroProps) {
  // Visível exclusivamente no início da descida (até ~12% do scroll)
  const isVisible = progress < 0.12;
  const opacity = Math.max(0, 1 - progress / 0.08);
  const translateY = -progress * 120;
  const letterSpacingProgress = Math.min(0.6, 0.35 + progress * 2);

  if (!isVisible && opacity <= 0.005) return null;

  return (
    <div
      className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-6 sm:p-10 md:p-14 lg:p-16 select-none transition-opacity duration-300"
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      {/* 1. Top Bar: Totalmente desobstruída */}
      <div className="w-full h-4" />

      {/* 2. Centro: Tipografia Monumental & Pura */}
      <div className="w-full my-auto flex flex-col items-center justify-center text-center px-4">
        {/* Subtle accent index */}
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.3, scale: 1 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="font-serif text-3xl sm:text-5xl md:text-6xl text-white/30 italic tracking-widest mb-2"
        >
          I
        </motion.span>

        {/* Master Title */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-display font-light text-white tracking-tight uppercase leading-[0.95]"
        >
          O Vazio Ganha <span className="font-serif italic text-primary">Forma.</span>
        </motion.h1>

        {/* Minimal Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.4, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="mt-4 sm:mt-6 font-mono text-[10px] sm:text-xs text-white/50 uppercase"
          style={{ letterSpacing: `${letterSpacingProgress}em` }}
        >
          Desça para despertar as relíquias
        </motion.p>
      </div>

      {/* 3. Base: Indutor Hipnótico de Scroll (Fio condutor vertical + Luz guia) */}
      <div className="w-full flex flex-col items-center justify-center pb-2">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center gap-3"
        >
          <span className="font-mono text-[8px] sm:text-[9px] text-white/30 tracking-[0.4em] uppercase">
            Scroll <span className="mx-2 opacity-50">ou</span> <span className="inline-flex gap-1 items-center -translate-y-px"><span className="border border-white/20 rounded px-1.5 py-0.5 leading-none">↓</span><span className="border border-white/20 rounded px-1.5 py-0.5 leading-none">↑</span></span>
          </span>

          {/* Luxury Vertical Beacon Line */}
          <div className="relative w-[1px] h-14 sm:h-20 bg-gradient-to-b from-white/20 via-white/10 to-transparent overflow-hidden">
            <motion.div
              animate={{
                y: [-20, 80],
                opacity: [0, 1, 0],
              }}
              transition={{
                repeat: Infinity,
                duration: 2.2,
                ease: 'easeInOut',
              }}
              className="w-full h-8 bg-gradient-to-b from-transparent via-primary to-transparent shadow-[0_0_12px_var(--primary)]"
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
