import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X } from 'lucide-react';

export function PwaInstallPrompt() {
  const [isOpen, setIsOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      (window as any).deferredPrompt = e;
    };

    const handleShowPromptEvent = () => {
      if ((window as any).deferredPrompt) {
        setDeferredPrompt((window as any).deferredPrompt);
        setIsOpen(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('showPwaPrompt', handleShowPromptEvent);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('showPwaPrompt', handleShowPromptEvent);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the A2HS prompt');
    } else {
      console.log('User dismissed the A2HS prompt');
    }
    
    setDeferredPrompt(null);
    (window as any).deferredPrompt = null;
    setIsOpen(false);
  };

  const handleDismiss = () => {
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[110] w-[90%] max-w-sm"
        >
          {/* Glass background */}
          <div className="absolute inset-0 bg-[#080814]/80 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50" />
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50" />
          </div>

          <div className="relative p-5">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-primary">
                <Download className="w-5 h-5" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-display font-medium text-sm tracking-widest text-white uppercase">
                    INSTALAR KYVRA
                  </h4>
                  <button 
                    onClick={handleDismiss}
                    className="text-white/40 hover:text-white transition-colors duration-200 p-1"
                    aria-label="Ignorar por enquanto"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="font-sans text-white/60 text-xs leading-relaxed py-1 font-light">
                  Adicione o Kyvra à tela inicial do seu dispositivo para uma experiência mais profunda e imersiva.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 mt-5">
              <button
                onClick={handleDismiss}
                className="px-4 py-2 text-xs font-mono tracking-widest uppercase text-white/50 hover:text-white transition-colors"
              >
                AGORA NÃO
              </button>
              <button
                onClick={handleInstall}
                className="relative overflow-hidden group px-5 py-2 rounded-lg bg-white/5 border border-white/10 hover:border-primary/50 transition-all duration-300"
              >
                <div className="absolute inset-0 bg-primary/10 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <span className="relative z-10 text-xs font-mono tracking-widest uppercase text-white group-hover:text-primary transition-colors duration-300">
                  INSTALAR
                </span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
