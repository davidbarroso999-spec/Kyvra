import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useLocation } from 'react-router-dom';
import { X, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';

// Glassmorphism otimizado: Usar blur apenas no backdrop global e não nas camadas sobrepostas
const menuItems = [
  { path: '/cosmogonia', label: 'lore', size: 560, zIndex: 20, bg: 'bg-surface/20 backdrop-blur-xl border border-primary/40 shadow-2xl', textColor: 'fill-text-high' },
  { path: '/reliquias', label: 'álbuns', size: 440, zIndex: 30, bg: 'bg-transparent hover:bg-primary/5 border border-primary/30 hover:border-primary/50 transition-colors duration-500', textColor: 'fill-text-high' },
  { path: '/arquivo', label: 'músicas', size: 320, zIndex: 40, bg: 'bg-transparent hover:bg-primary/10 border border-primary/40 hover:border-primary/60 transition-colors duration-500', textColor: 'fill-text-high' },
  { path: '/', label: 'home', size: 200, zIndex: 50, bg: 'bg-transparent hover:bg-primary/15 border border-primary/50 hover:border-primary/70 transition-colors duration-500', textColor: 'fill-text-high' },
];

export function CircularMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { isPlayerHidden, setPlayerHidden, currentTrack } = useStore();

  const toggleMenu = () => setIsOpen(!isOpen);

  // Fecha o menu após rota
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-void/40 z-[3000] transition-opacity"
          />
        )}
      </AnimatePresence>

      {/* Origin perfectly at bottom-right, spaced a bit from edges to align with MiniPlayer */}
      <div className="fixed bottom-[6rem] right-[1.5rem] sm:bottom-[3.625rem] sm:right-[3rem] z-[5000] flex items-center justify-center pointer-events-none">
        
        {/* Origin Center Point */}
        <div className="relative w-0 h-0 flex justify-center items-center pointer-events-auto">
          
          {/* Sub-container responsivo para reduzir dimensões e evitar transbordos de SVG no mobile */}
          <div className="absolute w-0 h-0 flex justify-center items-center scale-[0.68] sm:scale-100 origin-center pointer-events-none">
            <AnimatePresence>
              {isOpen && menuItems.map((item, index) => {
                const R = item.size / 2; // Radius
                const innerR = index === menuItems.length - 1 ? 40 : menuItems[index + 1].size / 2;
                const textR = (R + innerR) / 2; 
                
                // Top-Left quadrant arc em SVG (O centro do círculo é no item.size/2)
                // Começa em (cx - textR, cy) -> extremidade esquerda
                // E vai para (cx, cy - textR) -> extremidade topo
                const pathId = `text-path-${index}`;
                const cx = R;
                const cy = R;
                const d = `M ${cx - textR} ${cy} A ${textR} ${textR} 0 0 1 ${cx} ${cy - textR}`;

                return (
                  <motion.div
                    key={item.path}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{
                      type: 'spring',
                      damping: 30,
                      stiffness: 250,
                      delay: (menuItems.length - index) * 0.05,
                    }}
                    className={cn(
                      "absolute rounded-full transition-colors group flex justify-center items-center shadow-lg pointer-events-auto",
                      item.bg
                    )}
                    style={{
                      width: item.size,
                      height: item.size,
                      zIndex: item.zIndex,
                      willChange: 'transform, opacity',
                    }}
                  >
                    <Link
                      to={item.path}
                      onClick={() => setIsOpen(false)}
                      className="absolute w-full h-full rounded-full focus:outline-none"
                    >
                      <svg 
                        className="absolute inset-0 pointer-events-none" 
                        width="100%" 
                        height="100%" 
                        viewBox={`0 0 ${item.size} ${item.size}`}
                      >
                        <path 
                          id={pathId} 
                          d={d} 
                          fill="none" 
                          stroke="none" 
                        />
                        <text 
                          className={cn(
                            "font-display font-medium transition-opacity duration-300 opacity-80 group-hover:opacity-100",
                            item.textColor,
                            index === 0 ? "text-[20px] sm:text-[22px] tracking-[0.3em]" : "text-[16px] sm:text-[18px] tracking-[0.25em]"
                          )}
                          dominantBaseline="middle"
                        >
                          <textPath 
                            href={`#${pathId}`} 
                            startOffset="50%" 
                            textAnchor="middle"
                          >
                            {item.label}
                          </textPath>
                        </text>
                      </svg>
                    </Link>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Botão de revelar player se oculto (aparece acima do menu) */}
          <AnimatePresence>
            {isOpen && isPlayerHidden && currentTrack && (
              <motion.button
                initial={{ opacity: 0, scale: 0, y: 0 }}
                animate={{ opacity: 1, scale: 1, y: -75 }}
                exit={{ opacity: 0, scale: 0, y: 0 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                onClick={() => {
                  setPlayerHidden(false);
                  setIsOpen(false);
                }}
                className="absolute w-12 h-12 rounded-full bg-surface/90 hover:bg-surface border border-primary/50 hover:border-primary text-primary flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-95 z-[5030] pointer-events-auto cursor-pointer"
                title="Mostrar Player de Áudio"
              >
                <Eye size={20} strokeWidth={2} />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Botão Principal Toggle */}
          <motion.button
            onClick={toggleMenu}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
               "absolute rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl z-[5020]",
               isOpen 
                ? "bg-surface/90 backdrop-blur-md text-text-high w-[70px] h-[70px] border border-white/5" 
                : "bg-surface/30 backdrop-blur-lg border border-white/10 text-text-high w-[60px] h-[60px] hover:bg-surface/50"
            )}
          >
            <AnimatePresence mode="wait">
              {isOpen ? (
                <motion.div
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                >
                  <X size={28} strokeWidth={1.5} />
                </motion.div>
              ) : (
                <motion.div
                  key="open"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="w-full h-full rounded-full flex items-center justify-center group"
                >
                  <span className="font-display font-medium text-[12px] tracking-[0.15em] text-text-high/90 group-hover:text-text-high transition-colors ml-[0.15em]">
                    MENU
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
          
        </div>
      </div>
    </>
  );
}
