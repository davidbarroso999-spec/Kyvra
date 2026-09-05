import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { WifiOff, Wifi, X, RefreshCw } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export const NetworkStatusBanner: React.FC = () => {
  const { isOnline, wasOffline } = useNetworkStatus();
  const [dismissed, setDismissed] = useState(false);
  const [showRestored, setShowRestored] = useState(false);

  // Reseta o estado de dispensa quando a conexão muda
  useEffect(() => {
    if (!isOnline) {
      setDismissed(false);
      setShowRestored(false);
    } else if (wasOffline) {
      setShowRestored(true);
      setDismissed(false);

      const timer = setTimeout(() => {
        setShowRestored(false);
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  const handleRetry = () => {
    if (typeof window !== 'undefined' && navigator.onLine) {
      window.location.reload();
    }
  };

  const isVisible = (!isOnline || showRestored) && !dismissed;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -15, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-md pointer-events-auto"
        >
          <div
            className={`relative flex items-center justify-between gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md transition-colors duration-300 ${
              !isOnline
                ? 'bg-neutral-950/90 border-amber-500/40 text-amber-200 shadow-amber-950/30'
                : 'bg-neutral-950/90 border-emerald-500/40 text-emerald-200 shadow-emerald-950/30'
            }`}
          >
            {/* Indicador pulsante + Ícone */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative flex items-center justify-center shrink-0">
                <span
                  className={`absolute inline-flex h-3 w-3 rounded-full opacity-75 animate-ping ${
                    !isOnline ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    !isOnline ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                />
                <div className="ml-2">
                  {!isOnline ? (
                    <WifiOff className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Wifi className="w-4 h-4 text-emerald-400" />
                  )}
                </div>
              </div>

              {/* Mensagem principal */}
              <div className="min-w-0 text-left">
                <p className="text-xs font-semibold tracking-wide uppercase opacity-90 leading-none">
                  {!isOnline ? 'Conexão Ausente' : 'Conexão Restabelecida'}
                </p>
                <p className="text-xs text-neutral-300 truncate mt-0.5">
                  {!isOnline
                    ? 'Modo Offline ativo — Reproduzindo dados em cache'
                    : 'Sincronizando biblioteca de Kyvra...'}
                </p>
              </div>
            </div>

            {/* Ações */}
            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              {!isOnline && (
                <button
                  onClick={handleRetry}
                  title="Testar Conexão"
                  className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={() => setDismissed(true)}
                title="Fechar Notificação"
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
