import React from 'react';
import { motion } from 'motion/react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative w-full overflow-hidden border-t border-white/5 bg-[#030303] py-12 px-6 mt-auto">
      <div className="relative z-10 max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
        {/* Brand section */}
        <div className="flex flex-col gap-1 items-center md:items-start">
          <span className="font-display text-lg tracking-[0.2em] font-semibold text-text-high">
            KYVRA
          </span>
          <span className="text-[9px] font-mono text-text-low uppercase tracking-widest">
            Metal Sinfônico Melancólico
          </span>
        </div>

        {/* Poetical subtitle - hidden on small viewports */}
        <div className="hidden lg:block text-xs text-text-low/60 font-sans italic font-light">
          "Onde as estrelas morrem, a poesia ecoa."
        </div>

        {/* Copyright section */}
        <div className="flex flex-col gap-1 items-center md:items-end">
          <p className="font-sans text-xs text-text-mid/80 leading-relaxed font-light">
            © {currentYear} KYVRA. Todos os direitos reservados.
          </p>
          <p className="font-mono text-[10px] text-text-low leading-relaxed uppercase tracking-wider">
            Desenvolvido por <span className="text-primary font-medium">David Nascimento</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
