import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useSpring } from 'motion/react';
import { useStore, Theme } from '@/store/useStore';
import { Menu, X, Moon, Sun, Droplet, Leaf, Waves, Sunset, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

const themes: { id: Theme; icon: React.ReactNode; label: string }[] = [
  { id: 'abissal', icon: <Moon size={14} />, label: 'Abissal' },
  { id: 'sangue-de-drago', icon: <Droplet size={14} />, label: 'Sangue de Drago' },
  { id: 'floresta-negra', icon: <Leaf size={14} />, label: 'Floresta Negra' },
  { id: 'mar-profundo', icon: <Waves size={14} />, label: 'Mar Profundo' },
  { id: 'crepusculo', icon: <Sunset size={14} />, label: 'Crepúsculo' },
  { id: 'monolito', icon: <Square size={14} />, label: 'Monolito' },
];

const navLinks = [
  { path: '/', label: 'Home' },
  { path: '/arquivo', label: 'Músicas' },
  { path: '/reliquias', label: 'Álbuns' },
  { path: '/cosmogonia', label: 'Lore' },
];

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const { theme, setTheme } = useStore();
  const location = useLocation();

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 80);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <>
      <header
        className={cn(
          'fixed top-0 left-0 w-full z-50 transition-all duration-500',
          isScrolled ? 'py-3 glass' : 'py-6 bg-transparent'
        )}
      >
        {/* Reading Progress Bar */}
        <motion.div
          className="absolute top-0 left-0 right-0 h-[2px] bg-primary origin-left z-50"
          style={{ scaleX }}
        />
        
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between mt-[2px]">
          <Link to="/" className="font-display text-xl md:text-2xl tracking-[0.1em] text-text-high z-50 relative">
            KYVRA
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="relative text-sm font-sans font-medium text-text-mid hover:text-text-high transition-colors group"
              >
                {link.label}
                <span className="absolute -bottom-1 left-1/2 w-0 h-[1px] bg-primary transition-all duration-300 group-hover:w-full group-hover:left-0" />
                {location.pathname === link.path && (
                  <span className="absolute -bottom-1 left-0 w-full h-[1px] bg-primary" />
                )}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-4 z-50 relative">
            <div className="relative">
              <button
                onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-overlay transition-colors text-text-mid hover:text-primary"
              >
                {themes.find(t => t.id === theme)?.icon || <Moon size={16} />}
              </button>
              
              {isThemeMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-void/80 backdrop-blur-2xl border border-border r-md py-2 flex flex-col gap-1 shadow-2xl">
                  {themes.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setTheme(t.id);
                        setIsThemeMenuOpen(false);
                      }}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors",
                        theme === t.id ? "text-primary bg-primary/10" : "text-text-mid hover:text-text-high hover:bg-overlay"
                      )}
                    >
                      {t.icon}
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Link
              to="/arquivista"
              className="hidden md:flex text-xs font-sc tracking-widest text-text-low hover:text-primary transition-colors"
            >
              O ARQUIVISTA
            </Link>

            <button
              className="md:hidden text-text-high"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-void/98 backdrop-blur-xl flex flex-col items-center justify-center p-6"
          >
            <nav className="flex flex-col items-center gap-6 w-full max-w-xs">
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.path}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="w-full"
                >
                  <Link
                    to={link.path}
                    className={cn(
                      "block w-full text-center py-4 font-display text-3xl transition-colors r-md",
                      location.pathname === link.path ? "text-primary bg-primary/5" : "text-text-high hover:text-primary"
                    )}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: navLinks.length * 0.05 }}
                className="mt-4 w-full"
              >
                <Link
                  to="/arquivista"
                  className="block w-full text-center py-3 font-sc tracking-[0.2em] text-xs text-text-low hover:text-primary transition-colors border border-border/50 r-md"
                >
                  O ARQUIVISTA
                </Link>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
