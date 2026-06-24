import { useTransition } from 'react';

export function useConcurrentUpdate() {
  const [isPending, startTransition] = useTransition();

  const updateWithConcurrency = (callback: () => void) => {
    startTransition(() => {
      callback();
    });
  };

  return { isPending, updateWithConcurrency };
}
