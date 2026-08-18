import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStore, Theme } from '@/store/useStore';
import { Moon, Droplet, Leaf, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThemeConfig {
  id: Theme;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
}

const THEMES: ThemeConfig[] = [
  {
    id: 'abissal',
    label: 'Abissal',
    icon: Moon,
    color: '#a78bfa',
  },
  {
    id: 'sangue-de-drago',
    label: 'Sangue de Drago',
    icon: Droplet,
    color: '#ef4444',
  },
  {
    id: 'floresta-negra',
    label: 'Floresta Negra',
    icon: Leaf,
    color: '#10b981',
  },
  {
    id: 'monolito',
    label: 'Monólito',
    icon: Square,
    color: '#f5f5f5',
  },
];

export function ThemeDock() {
  const currentTheme = useStore((state) => state.theme);
  const setTheme = useStore((state) => state.setTheme);
  const isMenuOpen = useStore((state) => state.isMenuOpen);

  // Estado único para o texto ativo com timeout estrito de 1 segundo (1000ms)
  const [activeLabelTheme, setActiveLabelTheme] = useState<Theme | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const triggerLabel = useCallback((themeId: Theme) => {
    clearTimer();
    setActiveLabelTheme(themeId);

    // Auto-dismiss garantido após exatamente 1 segundo (1000ms)
    timerRef.current = setTimeout(() => {
      setActiveLabelTheme(null);
      timerRef.current = null;
    }, 1000);
  }, [clearTimer]);

  const handleSelectTheme = (themeId: Theme) => {
    React.startTransition(() => {
      setTheme(themeId);
    });
    triggerLabel(themeId);
  };

  const handleMouseEnter = (themeId: Theme) => {
    triggerLabel(themeId);
  };

  const handleMouseLeave = () => {
    // Ao retirar o cursor, garante o dismiss
    clearTimer();
    setActiveLabelTheme(null);
  };

  // Dismiss imediato em qualquer interação do usuário (scroll, toque, roda, clique fora)
  useEffect(() => {
    const handleDismiss = () => {
      clearTimer();
      setActiveLabelTheme(null);
    };

    window.addEventListener('scroll', handleDismiss, { passive: true });
    window.addEventListener('touchmove', handleDismiss, { passive: true });
    window.addEventListener('wheel', handleDismiss, { passive: true });
    window.addEventListener('pointerdown', handleDismiss, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleDismiss);
      window.removeEventListener('touchmove', handleDismiss);
      window.removeEventListener('wheel', handleDismiss);
      window.removeEventListener('pointerdown', handleDismiss);
      clearTimer();
    };
  }, [clearTimer]);

  const displayedTheme = THEMES.find((t) => t.id === activeLabelTheme);
  const isVisible = !!displayedTheme;

  return (
    <aside
      aria-label="Seleção de Tema Visual"
      className={cn(
        "fixed right-3.5 sm:right-6 top-1/2 -translate-y-1/2 z-[6000] flex items-center select-none transition-all duration-500 ease-out",
        isMenuOpen ? "opacity-100 translate-x-0 pointer-events-auto" : "opacity-0 translate-x-8 pointer-events-none"
      )}
    >
      {/* 
        Âncora de Centro Absoluto:
        Fixo no centro vertical exato da barra de temas
      */}
      <div
        className={cn(
          'absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 flex items-center justify-center mr-3 pointer-events-none z-50 transition-all duration-150 ease-out',
          isVisible
            ? 'opacity-100 translate-x-0 scale-100'
            : 'opacity-0 translate-x-1 scale-95 pointer-events-none'
        )}
      >
        {displayedTheme && (
          <span
            className="text-[9px] sm:text-[10px] font-display tracking-[0.22em] font-semibold uppercase whitespace-nowrap -rotate-90 origin-center inline-block"
            style={{
              color: displayedTheme.color,
              textShadow: `0 0 10px ${displayedTheme.color}, 0 1px 4px rgba(0,0,0,0.9)`,
            }}
          >
            {displayedTheme.label}
          </span>
        )}
      </div>

      {/* Coluna Vertical com os 4 Ícones */}
      <div className="flex flex-col items-center gap-3 sm:gap-4">
        {THEMES.map((t) => {
          const isActive = currentTheme === t.id;
          const Icon = t.icon;

          return (
            <div 
              key={t.id} 
              className="relative w-8 h-8 sm:w-8.5 sm:h-8.5 flex items-center justify-center"
            >
              {/* Botão do Tema */}
              <button
                id={`theme-btn-${t.id}`}
                onClick={() => handleSelectTheme(t.id)}
                onMouseEnter={() => handleMouseEnter(t.id)}
                onMouseLeave={handleMouseLeave}
                aria-label={`Mudar para o tema ${t.label}`}
                aria-pressed={isActive}
                className={cn(
                  'w-full h-full flex items-center justify-center transition-all duration-300 group cursor-pointer',
                  isActive
                    ? 'scale-110'
                    : 'text-white/25 hover:text-white/80 hover:scale-105'
                )}
                style={{
                  color: isActive ? t.color : undefined,
                }}
              >
                <Icon
                  size={18}
                  className={cn(
                    'transition-all duration-300 group-hover:rotate-6',
                    isActive 
                      ? 'drop-shadow-[0_0_10px_currentColor] stroke-[2.4]' 
                      : 'stroke-[1.8]'
                  )}
                />
              </button>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
