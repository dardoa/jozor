import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { TranslationProvider } from './context/TranslationContext';
import ToastProvider from './components/ToastProvider'; // Import ToastProvider

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const RootComponent: React.FC = () => {
  return (
    <React.StrictMode>
      <TranslationProvider>
        <ToastProvider /> {/* Add ToastProvider here */}
        <App />
      </TranslationProvider>
    </React.StrictMode>
  );
};

const root = ReactDOM.createRoot(rootElement);
root.render(<RootComponent />);