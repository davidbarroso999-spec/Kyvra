import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

export function Home() {
  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative h-[100dvh] flex items-center justify-center px-6 overflow-hidden">
        <div className="relative z-10 flex flex-col items-center text-center max-w-4xl mx-auto mt-16">
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="text-[80px] md:text-[120px] leading-[0.95] tracking-[-0.02em] text-gradient mb-6"
          >
            KYVRA
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="font-sc text-lg md:text-xl tracking-[0.2em] text-text-high mb-8"
          >
            FRAGMENTOS DE UM UNIVERSO SOMBRIO
          </motion.p>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="font-sans font-light text-text-mid text-base md:text-lg max-w-[320px] leading-[1.75] mb-12"
          >
            Uma jornada sonora através de camadas esquecidas do tempo e do espaço.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="flex flex-col sm:flex-row items-center gap-6"
          >
            <Link to="/arquivo" className="px-8 py-4 bg-primary text-void font-sans font-medium rounded-[4px] shadow-[0_0_40px_var(--glow-purple)] hover:scale-105 transition-transform duration-300">
              Explorar o Arquivo
            </Link>
            <Link to="/reliquias" className="px-8 py-4 border border-border text-text-high font-sans font-medium rounded-[4px] hover:bg-overlay transition-colors duration-300">
              Último Lançamento
            </Link>
            <Link to="/cosmogonia" className="flex items-center gap-2 text-text-mid hover:text-primary transition-colors font-sans font-medium group">
              A Cosmogonia 
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </motion.div>
        </div>
        
        {/* Scroll Indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4"
        >
          <div className="w-[1px] h-12 bg-gradient-to-b from-primary to-transparent animate-pulse" />
        </motion.div>
      </section>

      {/* Citação Poética */}
      <section className="py-32 px-6 relative flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--glow-purple)_0%,transparent_50%)] opacity-30" />
        <div className="flex items-center gap-8 max-w-5xl mx-auto relative z-10">
          <div className="hidden md:block w-20 h-[1px] bg-primary/30" />
          <blockquote className="text-center">
            <p className="font-display italic text-3xl md:text-4xl text-text-high leading-relaxed">
              "Em cada fragmento, uma história. Em cada nota, um suspiro da alma perdida nas névoas do tempo."
            </p>
          </blockquote>
          <div className="hidden md:block w-20 h-[1px] bg-primary/30" />
        </div>
      </section>
    </div>
  );
}
