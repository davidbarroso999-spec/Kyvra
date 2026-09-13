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

const BAR_HEIGHTS = ['h-[6px]', 'h-[9px]', 'h-[12px]', 'h-[15px]'];

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
      className="fixed top-0 left-1/2 -translate-x-1/2 z-[100000] pointer-events-none select-none"
      aria-hidden="true"
    >
      <div className="flex items-end gap-[3px] px-[7px] py-[5px]">
        {BAR_HEIGHTS.map((height, index) => {
          const active = level > index;
          return (
            <span
              key={index}
              className={cn(
                'block w-[13px] rounded-[2px] transition-colors duration-500',
                height,
                isOffline
                  ? 'bg-white/10'
                  : active
                    ? 'bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.55)]'
                    : 'bg-white/15'
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
