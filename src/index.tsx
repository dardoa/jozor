import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { TranslationProvider } from './context/TranslationContext'; // Corrected import path
import '../index.css'; // Corrected path to index.css

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const RootComponent: React.FC = () => {
  return (
    <React.StrictMode>
      <TranslationProvider>
        <App />
      </TranslationProvider>
    </React.StrictMode>
  );
};

const root = ReactDOM.createRoot(rootElement);
root.render(<RootComponent />);