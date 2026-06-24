import { useEffect, useRef } from 'react';

export function useIdleCallback(callback: () => void, timeout = 5000) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const runTask = () => {
      callbackRef.current();
    };

    if ('requestIdleCallback' in window) {
      const id = (window as any).requestIdleCallback(runTask, { timeout });
      return () => (window as any).cancelIdleCallback(id);
    } else {
      const id = setTimeout(runTask, timeout);
      return () => clearTimeout(id);
    }
  }, [timeout]);
}
