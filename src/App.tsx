import React from 'react';
import { TranslationProvider } from './context/TranslationContext';
import { Header } from './components/header/Header';
import { Sidebar } from './components/sidebar/Sidebar';
import { FamilyTree } from './components/FamilyTree';

function App() {
  return (
    <TranslationProvider>
      <div className="min-h-screen bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-auto">
            <FamilyTree />
          </main>
        </div>
      </div>
    </TranslationProvider>
  );
}

export default App;