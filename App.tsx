import * as React from 'react';
import './global.css';

import { AppStateManager } from './components/AppStateManager';
import { ErrorBoundary } from './components/ErrorBoundary';

const App: React.FC = () => {

  return (
    <ErrorBoundary>
      <div
        className="flex flex-col h-screen font-sans transition-colors duration-300 text-[var(--card-text)] overflow-hidden bg-[var(--theme-bg)]"
      >
        <AppStateManager />
      </div>
    </ErrorBoundary>
  );
};

export default App;
