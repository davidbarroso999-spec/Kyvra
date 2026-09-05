import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Cookie, X } from 'lucide-react';
import NeonButton from '@/components/ui/NeonButton';

export function CookieBanner() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if user has already accepted cookies
    const cookieConsent = localStorage.getItem('kyvra_cookie_consent');
    if (!cookieConsent) {
      // SNAPPY: Show shortly after preloader finishes (1.8s instead of 5.5s delay)
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('kyvra_cookie_consent', 'accepted');
    setIsOpen(false);
    
    // Suggest PWA installation after closing the cookie banner
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('showPwaPrompt'));
    }, 1200);
  };

  const handleDecline = () => {
    localStorage.setItem('kyvra_cookie_consent', 'declined');
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-6 left-6 right-6 md:left-[auto] md:right-8 md:max-w-[450px] z-50 overflow-hidden"
          id="cookie-consent-container"
        >
          {/* Main glass card */}
          <div className="relative p-6 rounded-2xl border border-white/10 bg-black/80 backdrop-blur-xl shadow-[0_30px_60px_rgba(0,0,0,0.8)] overflow-hidden">
            {/* Background ambient dark red/purple glow depending on cosmic presence */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[40px] rounded-full pointer-events-none -z-10" />

            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-white/80">
                <Cookie className="w-5 h-5" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-display font-medium text-sm tracking-widest text-white uppercase">
                    CRÔNICAS DE COOKIES
                  </h4>
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="text-white/40 hover:text-white transition-colors duration-200 p-1"
                    aria-label="Ignorar por enquanto"
                    id="cookie-btn-close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="font-sans text-white/60 text-xs leading-relaxed py-1 font-light">
                  Nossa fortaleza digital armazena pequenos pergaminhos (cookies) em sua máquina para garantir que o áudio, os temas cósmicos e os rituais visuais de Kyvra fluam com perfeição e de forma segura.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center gap-3 justify-end">
              <button
                onClick={handleDecline}
                className="w-full sm:w-auto px-4 py-2 text-[10px] sm:text-xs font-mono text-white/40 hover:text-white/80 transition-colors uppercase tracking-widest bg-transparent border border-white/5 hover:border-white/20 rounded-lg"
                id="cookie-btn-decline"
              >
                Declinar
              </button>
              <NeonButton
                onClick={handleAccept}
                variant="square"
                size="sm"
                className="w-full sm:w-auto px-5 py-2.5 text-[10px] sm:text-xs font-mono uppercase tracking-widest text-white flex items-center justify-center gap-2"
                id="cookie-btn-accept"
              >
                <Shield className="w-3.5 h-3.5 text-primary" />
                <span>Aceitar Ritual</span>
              </NeonButton>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
