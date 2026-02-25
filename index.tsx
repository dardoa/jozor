import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import App from './App';
import { TranslationProvider } from './context/TranslationContext';
import ToastProvider from './components/ToastProvider';
import './global.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const RootComponent: React.FC = () => {
  return (
    <React.StrictMode>
      <TranslationProvider>
        <ToastProvider />
        <App />
      </TranslationProvider>
    </React.StrictMode>
  );
};

const root = ReactDOM.createRoot(rootElement);
root.render(<RootComponent />);
