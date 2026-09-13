import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

type ConnectionLike = {
  downlink?: number;
  effectiveType?: string;
  rtt?: number;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
};

/**
 * Estima a força do sinal (0–4) como nas interfaces de smartphones:
 * 0 = sem sinal, 1–3 = qualidade crescente, 4 = sinal pleno.
 * Usa a Network Information API quando disponível e cai para um
 * estado "ok" quando o navegador não expõe métricas.
 */
function computeSignalLevel(): number {
  if (typeof navigator === 'undefined') return 0;
  if (!navigator.onLine) return 0;

  const conn = (navigator as unknown as { connection?: ConnectionLike }).connection;
  if (!conn) return 4;

  const downlink = typeof conn.downlink === 'number' ? conn.downlink : null;
  const rtt = typeof conn.rtt === 'number' ? conn.rtt : null;

  if (downlink !== null) {
    if (downlink >= 5) return 4;
    if (downlink >= 2) return 3;
    if (downlink >= 0.7) return 2;
    return 1;
  }

  switch (conn.effectiveType) {
    case 'slow-2g':
      return 1;
    case '2g':
      return 2;
    case '3g':
      return 3;
    case '4g':
      return rtt !== null && rtt > 400 ? 3 : 4;
    default:
      return 4;
  }
}

/**
 * Faixa de status na parede superior: 4 linhas horizontais finas, lado a
 * lado, ocupando toda a largura da tela. As linhas ativas acendem na cor do
 * tema conforme a força do sinal; sem sinal, ficam neutras/apagadas.
 */
export function SignalBars() {
  const [level, setLevel] = useState(4);

  useEffect(() => {
    const update = () => setLevel(computeSignalLevel());
    update();

    const conn = (navigator as unknown as { connection?: ConnectionLike }).connection;

    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    conn?.addEventListener?.('change', update);

    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      conn?.removeEventListener?.('change', update);
    };
  }, []);

  const isOffline = level === 0;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100000] flex items-stretch gap-[2px] px-[2px] pt-0 h-[3px] pointer-events-none select-none"
      aria-hidden="true"
    >
      {[0, 1, 2, 3].map((index) => {
        const active = level > index;
        return (
          <span
            key={index}
            className={cn(
              'block flex-1 h-full rounded-b-[2px] transition-colors duration-500',
              isOffline
                ? 'bg-white/10'
                : active
                  ? 'bg-primary shadow-[0_0_6px_rgba(var(--primary-rgb),0.6)]'
                  : 'bg-white/15'
            )}
          />
        );
      })}
    </div>
  );
}
