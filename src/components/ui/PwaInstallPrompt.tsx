import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Share2, MoreVertical, Smartphone } from 'lucide-react';
import NeonButton from '@/components/ui/NeonButton';

export function PwaInstallPrompt() {
  const [isOpen, setIsOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      (window as any).deferredPrompt = e;
    };

    const handleShowPromptEvent = () => {
      // Abre o diálogo sempre para permitir que o usuário veja e teste a funcionalidade,
      // mesmo em ambientes de sandbox/iframe onde o evento nativo pode ser bloqueado.
      if ((window as any).deferredPrompt) {
        setDeferredPrompt((window as any).deferredPrompt);
      }
      setShowInstructions(false);
      setIsOpen(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('showPwaPrompt', handleShowPromptEvent);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('showPwaPrompt', handleShowPromptEvent);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
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
    } else {
      // Caso não haja prompt diferido nativo (ex: iOS Safari ou Sandbox IFrame),
      // guia o usuário de forma premium sobre como adicionar manualmente.
      setShowInstructions(true);
    }
  };

  const handleDismiss = () => {
    setIsOpen(false);
    setShowInstructions(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[110] w-[92%] max-w-sm"
        >
          {/* Glass background */}
          <div className="absolute inset-0 bg-[#080814]/90 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.6)] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-60" />
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50" />
          </div>

          <div className="relative p-5">
            {/* Close Button */}
            <button 
              onClick={handleDismiss}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors duration-200 p-1 rounded-lg hover:bg-white/5"
              aria-label="Ignorar por enquanto"
            >
              <X className="w-4 h-4" />
            </button>

            {!showInstructions ? (
              <>
                {/* Header */}
                <div className="flex items-start gap-4 pr-6">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-primary shrink-0 shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]">
                    <Download className="w-5 h-5" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h4 className="font-display font-medium text-sm tracking-widest text-white uppercase">
                      INSTALAR KYVRA
                    </h4>
                    <p className="font-sans text-white/60 text-xs leading-relaxed py-1 font-light">
                      Adicione o Kyvra à tela inicial do seu dispositivo para desfrutar de áudio em segundo plano e imersão total.
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 mt-5">
                  <button
                    onClick={handleDismiss}
                    className="px-4 py-2 text-xs font-mono tracking-widest uppercase text-white/50 hover:text-white transition-colors cursor-pointer"
                  >
                    AGORA NÃO
                  </button>
                  <NeonButton
                    onClick={handleInstall}
                    variant="square"
                    size="sm"
                    className="font-mono tracking-widest uppercase text-white"
                  >
                    <span className="text-xs font-mono tracking-widest uppercase text-white">
                      INSTALAR
                    </span>
                  </NeonButton>
                </div>
              </>
            ) : (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                {/* Manual guide title */}
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-primary" />
                  <h4 className="font-display font-medium text-xs tracking-widest text-white uppercase">
                    COMO ADICIONAR
                  </h4>
                </div>

                <p className="font-sans text-white/70 text-xs leading-relaxed font-light">
                  Seu navegador não suporta a instalação automática direta. Siga estas instruções rápidas:
                </p>

                <div className="space-y-3 bg-white/5 p-3 rounded-xl border border-white/5 text-[11px] font-sans text-white/80 leading-relaxed font-light">
                  <div className="flex items-start gap-2.5">
                    <div className="p-1 rounded bg-white/5 mt-0.5 text-primary">
                      <Share2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <strong className="text-white font-medium">No iOS (Safari):</strong> Toque no botão de <span className="text-primary font-medium">Compartilhar</span> na barra do navegador e selecione <span className="text-primary font-medium">"Adicionar à Tela de Início"</span>.
                    </div>
                  </div>

                  <div className="h-[1px] bg-white/5 my-1" />

                  <div className="flex items-start gap-2.5">
                    <div className="p-1 rounded bg-white/5 mt-0.5 text-primary">
                      <MoreVertical className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <strong className="text-white font-medium">No Android (Chrome):</strong> Toque nos <span className="text-primary font-medium">três pontos</span> no canto superior direito e selecione <span className="text-primary font-medium">"Instalar aplicativo"</span> ou <span className="text-primary font-medium">"Adicionar à tela inicial"</span>.
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={handleDismiss}
                    className="px-5 py-2 rounded-lg bg-white/5 border border-white/10 hover:border-primary/30 transition-all duration-300 text-xs font-mono tracking-widest uppercase text-white cursor-pointer"
                  >
                    ENTENDI
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
