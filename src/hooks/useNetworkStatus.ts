import { useState, useEffect } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean;
  offlineSince: Date | null;
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    wasOffline: false,
    offlineSince: null,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setStatus((prev) => ({
        isOnline: true,
        wasOffline: !prev.isOnline || prev.wasOffline,
        offlineSince: null,
      }));
    };

    const handleOffline = () => {
      setStatus({
        isOnline: false,
        wasOffline: false,
        offlineSince: new Date(),
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Capacitor Network Plugin Event Listener (para APK Android/iOS)
    const setupCapacitorNetwork = async () => {
      try {
        const capacitorNetwork = (window as any).Capacitor?.Plugins?.Network;
        if (capacitorNetwork) {
          const currentStatus = await capacitorNetwork.getStatus();
          if (currentStatus && typeof currentStatus.connected === 'boolean') {
            setStatus((prev) => ({
              ...prev,
              isOnline: currentStatus.connected,
            }));
          }

          capacitorNetwork.addListener('networkStatusChange', (netStatus: { connected: boolean }) => {
            if (netStatus.connected) {
              handleOnline();
            } else {
              handleOffline();
            }
          });
        }
      } catch (_e) {
        // Fallback para Web Standard event listeners
      }
    };

    setupCapacitorNetwork();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return status;
}
