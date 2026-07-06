export type ScreenStateApi<T> = {
  get(): T;
  set(next: T): void;
  subscribe(listener: (value: T) => void): () => void;
};

/**
 * Minimal observable holder for the current screen (or any value). `set` only
 * notifies subscribers when the value actually changes.
 */
export function createScreenState<T>(initial: T): ScreenStateApi<T> {
  let value = initial;
  const listeners = new Set<(value: T) => void>();

  return {
    get: () => value,
    set: (next: T) => {
      if (next === value) return;
      value = next;
      for (const listener of listeners) listener(value);
    },
    subscribe: (listener: (value: T) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
