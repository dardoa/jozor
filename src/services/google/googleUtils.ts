// services/google/googleUtils.ts

/**
 * Helper to dynamically inject a script into the document head.
 * Prevents re-injecting if the script already exists.
 */
export const loadScript = (src: string, id: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) {
      resolve();
      return;
    }

    // Check if GAPI or GSI are already loaded globally
    if (src.includes('api.js') && window.gapi) {
      resolve();
      return;
    }
    if (src.includes('gsi/client') && window.google?.accounts) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.id = id;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script ${src}`));
    document.head.appendChild(script);
  });
};

/**
 * Helper to wait for a global variable to be ready.
 * Useful for libraries that load asynchronously and attach to `window`.
 */
export const waitForGlobal = (key: string, timeout = 10000) =>
  new Promise<void>((resolve, reject) => {
    const win = window as unknown as Record<string, unknown>;
    if (win[key]) return resolve();

    const startTime = Date.now();
    const interval = setInterval(() => {
      if (win[key]) {
        clearInterval(interval);
        resolve();
      } else if (Date.now() - startTime > timeout) {
        clearInterval(interval);
        reject(new Error(`Timeout waiting for ${key} to load`));
      }
    }, 100);
  });
