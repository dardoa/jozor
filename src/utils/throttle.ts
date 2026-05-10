// Simple throttle utility to limit how often a function is called.
// Ensures the wrapped function is executed at most once every `delay` ms,
// with a trailing call to capture the latest arguments.

export function throttle<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  delay: number
): (...args: TArgs) => void {
  let lastCall = 0;
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: TArgs | null = null;

  const invoke = () => {
    lastCall = Date.now();
    timeout = null;
    if (lastArgs) {
      fn(...lastArgs);
      lastArgs = null;
    }
  };

  return (...args: TArgs) => {
    const now = Date.now();
    lastArgs = args;

    if (!lastCall || now - lastCall >= delay) {
      invoke();
    } else if (!timeout) {
      const remaining = delay - (now - lastCall);
      timeout = setTimeout(invoke, remaining);
    }
  };
}
