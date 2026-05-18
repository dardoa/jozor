import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import App from './App';
import { TranslationProvider } from './context/TranslationContext';
import { OverlayProvider } from './context/OverlayContext';
import { useAppStore } from './store/useAppStore';

import './global.css';

type WindowWithReactRoot = Window & { _reactRoot?: ReactDOM.Root };

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

import { BrowserRouter } from 'react-router-dom';

const RootComponent: React.FC = () => {
  return (
    <React.StrictMode>
      <BrowserRouter>
        <OverlayProvider>
          <TranslationProvider>
            <ThemeDomSync />
            <LanguageDomSync />
            <App />
          </TranslationProvider>
        </OverlayProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
};

import { THEME_COLOR_VARIABLE_KEYS } from './domain/appearance/appearanceEngine';

const ThemeDomSync: React.FC = () => {
  const darkMode = useAppStore((state) => state.darkMode);
  // READ: appearance.theme.themeStyle drives the legacy DOM class (theme-heritage/modernPure/etc)
  const themeStyle = useAppStore((state) => state.appearance.theme.themeStyle);
  const themeCssVariables = useAppStore((state) => state.appearance.cssVariables);

  React.useLayoutEffect(() => {
    const root = document.documentElement;
    
    // 1. Dark Mode
    root.classList.toggle('dark', darkMode);

    // 2. Theme Classes
    root.classList.remove('theme-modern', 'theme-vintage', 'theme-blueprint', 'theme-heritage', 'theme-modernPure', 'theme-artistic', 'theme-custom');
    root.classList.add(`theme-${themeStyle}`);

    // 3. CSS Variables (Appearance Lab)
    const isDarkActive = darkMode || root.classList.contains('dark');

    if (isDarkActive) {
      // Dark Mode Authority — Strip light overrides
      THEME_COLOR_VARIABLE_KEYS.forEach((variable) => root.style.removeProperty(variable));

      // Metrics (non-colors) are always safe to apply
      Object.entries(themeCssVariables).forEach(([variable, value]) => {
        const isColorVariable = (THEME_COLOR_VARIABLE_KEYS as readonly string[]).includes(variable);
        if (!isColorVariable) {
          root.style.setProperty(variable, value);
        }
      });
    } else {
      // Light Mode — Apply theme colors
      Object.entries(themeCssVariables).forEach(([variable, value]) => {
        root.style.setProperty(variable, value);
      });
    }
  }, [darkMode, themeStyle, themeCssVariables]);

  return null;
};

const LanguageDomSync: React.FC = () => {
  const language = useAppStore((state) => state.language);
  React.useLayoutEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);
  return null;
};

const appWindow = window as WindowWithReactRoot;
let root = appWindow._reactRoot;
if (!root) {
  root = ReactDOM.createRoot(rootElement);
  appWindow._reactRoot = root;
}
root.render(<RootComponent />);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Service-worker registration must fail quietly so the app still boots normally.
    void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  });
}
