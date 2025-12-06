import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { TranslationProvider } from './context/TranslationContext'; // Corrected import path
// Removed: import { useLanguageSync } from './hooks/useLanguageSync'; // Import useLanguageSync to get language for the key
import './index.css'; // Ensure index.css is imported

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const RootComponent: React.FC = () => {
  // Removed: const { language } = useLanguageSync(); // Get the current language to use as a key
  // The key will now be managed internally by TranslationProvider or derived from its internal state.
  // Forcing a re-mount of TranslationProvider is still desired, so we'll use its internal language state for the key.
  return (
    <React.StrictMode>
      <TranslationProvider> {/* Key will be managed internally by TranslationProvider */}
        <App />
      </TranslationProvider>
    </React.StrictMode>
  );
};

const root = ReactDOM.createRoot(rootElement);
root.render(<RootComponent />);