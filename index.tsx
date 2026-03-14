import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import App from './App';
import { TranslationProvider } from './context/TranslationContext';
import { OverlayProvider } from './context/OverlayContext';
import ToastProvider from './components/ToastProvider';
import './global.css';

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
            <ToastProvider />
            <App />
          </TranslationProvider>
        </OverlayProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
};

let root = (window as any)._reactRoot;
if (!root) {
  root = ReactDOM.createRoot(rootElement);
  (window as any)._reactRoot = root;
}
root.render(<RootComponent />);
