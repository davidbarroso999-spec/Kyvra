import { useEffect } from 'react';
import { PERFORMANCE_CONFIG } from '../config';

/**
 * Direct utility to schedule and run tasks over multiple animation frames.
 */
export function scheduleFrameTasks(
  tasks: (() => void)[],
  onComplete?: () => void,
  budgetMs = PERFORMANCE_CONFIG.frameBudgetMs
): () => void {
  let currentTask = 0;
  let animationFrameId: number;

  const processNextTask = () => {
    const startTime = performance.now();

    while (currentTask < tasks.length) {
      tasks[currentTask]();
      currentTask++;

      if (performance.now() - startTime > budgetMs) {
        animationFrameId = requestAnimationFrame(processNextTask);
        return;
      }
    }

    if (onComplete) {
      onComplete();
    }
  };

  animationFrameId = requestAnimationFrame(processNextTask);

  return () => {
    cancelAnimationFrame(animationFrameId);
  };
}

/**
 * React hook wrapper for the frame scheduler.
 */
export function useFrameScheduler(tasks: (() => void)[], budgetMs = PERFORMANCE_CONFIG.frameBudgetMs) {
  useEffect(() => {
    if (tasks.length === 0) return;
    const cleanup = scheduleFrameTasks(tasks, undefined, budgetMs);
    return cleanup;
  }, [tasks, budgetMs]);
}
