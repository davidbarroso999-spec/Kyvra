import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useSpring } from 'motion/react';
import { useStore, Theme } from '@/store/useStore';
import { Menu, X, Moon, Sun, Droplet, Leaf, Square, DownloadCloud, RefreshCw, CheckCircle, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { syncEverythingForOffline, OfflineProgress } from '@/lib/offlineManager';

const themes: { id: Theme; icon: React.ReactNode; label: string }[] = [
  { id: 'abissal', icon: <Moon size={14} />, label: 'Abissal' },
  { id: 'sangue-de-drago', icon: <Droplet size={14} />, label: 'Sangue de Drago' },
  { id: 'floresta-negra', icon: <Leaf size={14} />, label: 'Floresta Negra' },
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
  const [syncProgress, setSyncProgress] = useState<OfflineProgress | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle');
  const theme = useStore((state) => state.theme);
  const setTheme = useStore((state) => state.setTheme);
  const location = useLocation();

  const handleOfflineSync = async () => {
    setSyncStatus('syncing');
    const success = await syncEverythingForOffline((progress) => {
      setSyncProgress(progress);
    });
    
    if (success) {
      setSyncStatus('done');
      setTimeout(() => {
        setSyncStatus('idle');
        setSyncProgress(null);
      }, 3000);
    } else {
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  useEffect(() => {
    let prevScrolled = window.scrollY > 80;
    setIsScrolled(prevScrolled);
    
    const handleScroll = () => {
      const currentScrolled = window.scrollY > 80;
      if (currentScrolled !== prevScrolled) {
        setIsScrolled(currentScrolled);
        prevScrolled = currentScrolled;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
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
          isScrolled ? 'py-3 glass-premium m-4 w-[calc(100%-2rem)] r-md' : 'py-6 bg-transparent'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between mt-[2px]">
          <Link to="/" className="font-display text-xl md:text-2xl tracking-[0.1em] text-text-high z-50 relative">
            KYVRA
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-4 z-50 relative">
            {/* Sync Offline Button */}
            <div className="relative flex items-center">
              <button
                onClick={handleOfflineSync}
                disabled={syncStatus === 'syncing'}
                className={cn(
                  "p-2 rounded-full transition-all duration-300 flex items-center gap-2",
                  syncStatus === 'syncing' ? "bg-primary/20 text-primary px-3" : "hover:bg-overlay text-text-mid hover:text-primary"
                )}
                title="Salvar App para uso Offline"
              >
                {syncStatus === 'syncing' ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span className="text-[10px] font-mono font-bold">
                      {syncProgress ? Math.round((syncProgress.current / syncProgress.total) * 100) : 0}%
                    </span>
                  </>
                ) : syncStatus === 'done' ? (
                  <CheckCircle size={16} className="text-accent" />
                ) : (
                  <DownloadCloud size={18} />
                )}
              </button>
            </div>

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
              className="md:flex text-xs font-sc tracking-widest text-text-low hover:text-primary transition-colors"
            >
              O ARQUIVISTA
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}
