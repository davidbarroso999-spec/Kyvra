import { useEffect } from 'react';

export function usePassiveEventListener(
  target: EventTarget | null | undefined,
  event: string,
  handler: EventListenerOrEventListenerObject,
  options?: AddEventListenerOptions
) {
  useEffect(() => {
    const activeTarget = target ?? window;
    if (!activeTarget) return;

    const listenerOptions: AddEventListenerOptions = {
      passive: true,
      ...options,
    };

    activeTarget.addEventListener(event, handler, listenerOptions);
    return () => {
      activeTarget.removeEventListener(event, handler, listenerOptions);
    };
  }, [target, event, handler, options]);
}
