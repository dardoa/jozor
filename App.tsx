import * as React from 'react';
import './global.css';

import { AppStateManager } from './components/AppStateManager';
import { ErrorBoundary } from './components/ErrorBoundary';

const App: React.FC = () => {
  const [sharedTreeParams, setSharedTreeParams] = React.useState<{
    ownerUid: string;
    fileId: string;
  } | null>(null);

  React.useEffect(() => {
    // ... paths check ...
    const path = window.location.pathname;
    const match = path.match(/^\/tree\/([^/]+)\/([^/]+)$/);
    if (match) {
      setSharedTreeParams({ ownerUid: match[1], fileId: match[2] });
    }
  }, []);

  return (
    <ErrorBoundary>
      <div
        className="flex flex-col h-screen font-sans transition-colors duration-300 text-[var(--card-text)] overflow-hidden bg-[var(--theme-bg)]"
      >
        <AppStateManager
          sharedTreeParams={sharedTreeParams}
          setSharedTreeParams={setSharedTreeParams}
        />
      </div>
    </ErrorBoundary>
  );
};

export default App;
