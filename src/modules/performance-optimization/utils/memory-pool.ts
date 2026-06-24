/**
 * High-performance Object Pool to recycle memory allocations,
 * reducing CPU garbage collection cycles during frequent item rendering or animation frames.
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private create: () => T;
  private reset?: (obj: T) => void;

  constructor(creator: () => T, initialSize = 50, reset?: (obj: T) => void) {
    this.create = creator;
    this.reset = reset;
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(creator());
    }
  }

  /**
   * Aquires a pooled object or instantiates a new one if pool is depleted.
   */
  get(): T {
    const obj = this.pool.pop() || this.create();
    return obj;
  }

  /**
   * Returns an object to the pool, resetting it if applicable.
   */
  return(obj: T): void {
    if (this.reset) {
      this.reset(obj);
    }
    this.pool.push(obj);
  }

  /**
   * Clear all references inside pool.
   */
  clear(): void {
    this.pool = [];
  }
}
