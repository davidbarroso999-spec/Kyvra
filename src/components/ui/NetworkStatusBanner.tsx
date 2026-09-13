import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowDownToLine, CheckCircle2, RefreshCw } from 'lucide-react';
import { syncEverythingForOffline } from '@/lib/offlineManager';
import { isAppSyncedOffline } from '@/lib/utils';

const STORAGE_KEY = 'kyvra_offline_download_prompt';
const COOKIES_KEY = 'kyvra_cookie_consent';
const INSTALL_FLAG_KEY = 'kyvra_install_prompt_open';
const DISMISS_COOLDOWN_MS = 1000 * 60 * 60 * 24 * 3; // 3 dias
const CHAIN_DELAY_MS = 1600; // Aguarda o prompt de instalação abrir (aceite de cookies → 1.2s → prompt)

function wasRecentlyDismissed(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const dismissedAt = Number(raw);
    return Number.isFinite(dismissedAt) && Date.now() - dismissedAt < DISMISS_COOLDOWN_MS;
  } catch (_e) {
    return false;
  }
}

function markDismissed(): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch (_e) {
    // Ignorado
  }
}

function areCookiesResolved(): boolean {
  try {
    return Boolean(localStorage.getItem(COOKIES_KEY));
  } catch (_e) {
    return true; // Sem storage disponível: não bloqueia a fila
  }
}

function isInstallPromptOpen(): boolean {
  try {
    return sessionStorage.getItem(INSTALL_FLAG_KEY) === '1';
  } catch (_e) {
    return false;
  }
}

/**
 * Notificação de salvar recursos offline — terceira e última da fila de
 * onboarding. Só surge depois que o banner de cookies e o prompt de
 * instalação do PWA foram resolvidos (ou já estavam resolvidos de visitas
 * anteriores), evitando sobreposição de notificações.
 */
export const NetworkStatusBanner: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle');
  const [isAppSynced, setIsAppSynced] = useState(() => isAppSyncedOffline());
  const openTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isAppSyncedOffline() || wasRecentlyDismissed()) return;

    const tryOpen = (delayMs: number) => {
      if (openTimerRef.current !== null) window.clearTimeout(openTimerRef.current);
      openTimerRef.current = window.setTimeout(() => {
        openTimerRef.current = null;
        // Só abre se a fila inteira já foi resolvida.
        if (!areCookiesResolved()) return;
        if (isInstallPromptOpen()) return; // Aguarda o evento de liberação do prompt
        setIsOpen(true);
      }, delayMs);
    };

    const handleCookiesResolved = () => tryOpen(CHAIN_DELAY_MS);
    const handleInstallResolved = () => tryOpen(600);
    const handleStorage = (e: StorageEvent) => {
      if (e.key === COOKIES_KEY) handleCookiesResolved();
    };

    window.addEventListener('kyvraCookieConsentResolved', handleCookiesResolved);
    window.addEventListener('kyvraOfflinePromptReady', handleInstallResolved);
    window.addEventListener('storage', handleStorage);

    // Primeira checagem: se cookies e instalação já estão resolvidos, agenda a abertura.
    if (areCookiesResolved() && !isInstallPromptOpen()) {
      tryOpen(CHAIN_DELAY_MS);
    }

    return () => {
      if (openTimerRef.current !== null) window.clearTimeout(openTimerRef.current);
      window.removeEventListener('kyvraCookieConsentResolved', handleCookiesResolved);
      window.removeEventListener('kyvraOfflinePromptReady', handleInstallResolved);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const handleDismiss = () => {
    setIsOpen(false);
    markDismissed();
  };

  const handleOfflineSync = async () => {
    if (syncStatus === 'syncing') return;

    setSyncStatus('syncing');
    const success = await syncEverythingForOffline();
    setSyncStatus(success ? 'done' : 'error');
    setIsAppSynced(success || isAppSyncedOffline());

    window.setTimeout(() => {
      setSyncStatus('idle');
      if (success) {
        setIsOpen(false);
        markDismissed();
      }
    }, success ? 2200 : 5000);
  };

  const showDownloadAction = !isAppSynced || syncStatus === 'syncing';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.95 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="fixed top-6 left-6 right-6 md:left-auto md:right-8 md:max-w-[450px] z-[10010] overflow-hidden pointer-events-auto"
        >
          <div className="relative p-6 rounded-2xl border border-white/10 bg-black/80 backdrop-blur-xl shadow-[0_30px_60px_rgba(0,0,0,0.8)] overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[40px] rounded-full pointer-events-none -z-10" />

            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-primary shrink-0 shadow-[0_0_15px_rgba(var(--primary-rgb),0.15)]">
                {syncStatus === 'syncing' ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : syncStatus === 'done' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <ArrowDownToLine className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1 space-y-1 min-w-0">
                <h4 className="font-display font-medium text-sm tracking-widest text-white uppercase pr-6">
                  ACERVO OFFLINE
                </h4>
                <p className="font-sans text-white/60 text-xs leading-relaxed py-1 font-light">
                  Baixe as músicas, imagens e visuais de Kyvra para continuar navegando e ouvindo
                  tudo mesmo sem conexão.
                </p>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center gap-3 justify-end">
              <button
                onClick={handleDismiss}
                className="w-full sm:w-auto px-4 py-2 text-[10px] sm:text-xs font-mono text-white/40 hover:text-white/80 transition-colors uppercase tracking-widest bg-transparent border border-white/5 hover:border-white/20 rounded-lg"
              >
                Agora não
              </button>
              {showDownloadAction && (
                <button
                  onClick={handleOfflineSync}
                  disabled={syncStatus === 'syncing'}
                  className="w-full sm:w-auto px-5 py-2.5 text-[10px] sm:text-xs font-mono uppercase tracking-widest text-white flex items-center justify-center gap-2 bg-primary/20 border border-primary/40 hover:bg-primary/30 transition-colors rounded-lg disabled:opacity-60"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                  <span>Baixar acervo</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
