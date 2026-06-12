import { useState, useEffect, useRef, useMemo } from 'react';

/**
 * Custom hook for debouncing a value.
 * Returns the debounced value after the specified delay.
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds
 * @returns The debounced value
 */
export const useDebouncedValue = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up the timeout
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timeout if value changes before delay expires
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Custom hook for debouncing a callback function.
 * Returns a debounced version of the callback.
 *
 * @param callback - The function to debounce
 * @param delay - Delay in milliseconds
 * @returns The debounced callback
 */
export const useDebouncedCallback = <T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  };
};

export interface ThrottledFunction<Args extends unknown[]> {
  (...args: Args): void;
  cancel: () => void;
  flush: (...args: Args) => void;
}

/**
 * Custom hook for throttling a callback while preserving the latest trailing call.
 * The returned function also exposes cancel/flush helpers for lifecycle and final-state sync.
 *
 * @param callback - The function to throttle
 * @param delay - Minimum delay between callback executions in milliseconds
 * @returns The throttled callback with cancel and flush helpers
 */
export const useThrottledCallback = <Args extends unknown[]>(
  callback: (...args: Args) => void,
  delay: number
): ThrottledFunction<Args> => {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRunRef = useRef(0);
  const hasRunRef = useRef(false);
  const pendingArgsRef = useRef<Args | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const throttled = useMemo<ThrottledFunction<Args>>(() => {
    const cancel = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      pendingArgsRef.current = null;
    };

    const invoke = (args: Args) => {
      lastRunRef.current = Date.now();
      hasRunRef.current = true;
      pendingArgsRef.current = null;
      callbackRef.current(...args);
    };

    const fn = ((...args: Args) => {
      // This runs only when the returned event callback is invoked, never during render.
      // eslint-disable-next-line react-hooks/purity
      const now = Date.now();
      const elapsed = now - lastRunRef.current;

      pendingArgsRef.current = args;

      if (!hasRunRef.current || elapsed >= delay || elapsed < 0) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        invoke(args);
        return;
      }

      if (!timeoutRef.current) {
        timeoutRef.current = setTimeout(() => {
          timeoutRef.current = null;
          const pendingArgs = pendingArgsRef.current;
          if (pendingArgs) {
            invoke(pendingArgs);
          }
        }, delay - elapsed);
      }
    }) as ThrottledFunction<Args>;

    fn.cancel = cancel;
    fn.flush = (...args: Args) => {
      cancel();
      invoke(args);
    };

    return fn;
  }, [delay]);

  useEffect(() => {
    return () => throttled.cancel();
  }, [throttled]);

  return throttled;
};
