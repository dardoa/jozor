/**
 * Dismisses the native HTML splash screen (#jozor-splash) defined in index.html.
 * Safe to call multiple times — it checks for existence before acting.
 */
export const dismissNativeSplash = () => {
  const splash = document.getElementById('jozor-splash');
  if (!splash) return;
  splash.style.opacity = '0';
  setTimeout(() => {
    splash.style.display = 'none';
  }, 400);
};
