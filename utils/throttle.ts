// Simple throttle utility to limit how often a function is called.
// Ensures the wrapped function is executed at most once every `delay` ms,
// with a trailing call to capture the latest arguments.

export function throttle<T extends (...args: any[]) => void>(fn: T, delay: number): T {
  let lastCall = 0;
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: any[] | null = null;

  const invoke = () => {
    lastCall = Date.now();
    timeout = null;
    if (lastArgs) {
      fn(...lastArgs);
      lastArgs = null;
    }
  };

  return ((...args: any[]) => {
    const now = Date.now();
    lastArgs = args;

    if (!lastCall || now - lastCall >= delay) {
      invoke();
    } else if (!timeout) {
      const remaining = delay - (now - lastCall);
      timeout = setTimeout(invoke, remaining);
    }
  }) as T;
}





