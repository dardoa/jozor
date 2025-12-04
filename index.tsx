import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { TranslationProvider } from './context/TranslationContext'; // Corrected import path
import { useLanguageSync } from './hooks/useLanguageSync'; // Import useLanguageSync to get language for the key

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const RootComponent: React.FC = () => {
  const { language } = useLanguageSync(); // Get the current language to use as a key

  return (
    <React.StrictMode>
      <TranslationProvider key={language}> {/* Add key prop here */}
        <App />
      </TranslationProvider>
    </React.StrictMode>
  );
};

const root = ReactDOM.createRoot(rootElement);
root.render(<RootComponent />);