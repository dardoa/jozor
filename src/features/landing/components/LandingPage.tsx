import React, { memo, useState, useCallback } from 'react';
import { LandingHeader } from './LandingHeader';
import { LandingHero } from './LandingHero';
import { LandingFeatures } from './LandingFeatures';
import { LandingFooter } from './LandingFooter';
import { GuestModeModal } from './GuestModeModal';
import { LandingPricing } from './LandingPricing';

interface LandingPageProps {
  onStartNew: () => void;
  onImport: () => void;
  onLogin: () => Promise<void>;
}

export const LandingPage: React.FC<LandingPageProps> = memo(({ onStartNew, onImport, onLogin }) => {
  const [showGuestModal, setShowGuestModal] = useState(false);

  const handleLogin = useCallback(() => {
    void onLogin();
  }, [onLogin]);

  const handleBrowseGuest = useCallback(() => {
    setShowGuestModal(true);
  }, []);

  const handleGuestNewTree = useCallback(() => {
    setShowGuestModal(false);
    onStartNew();
  }, [onStartNew]);

  const handleGuestImport = useCallback(() => {
    setShowGuestModal(false);
    onImport();
  }, [onImport]);

  return (
    <div className="relative min-h-screen bg-[var(--theme-bg)] text-[var(--text-main)] font-sans selection:bg-[var(--color-primary-200)] selection:text-[var(--color-primary-900)] overflow-x-hidden">
      
      {/* Subtle Geometric/Tree Branches Background Pattern (5% Opacity) */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '120px 120px'
        }}
      />

      <LandingHeader onLogin={handleLogin} />
      
      <main className="relative z-10 pt-16 flex flex-col gap-0">
        <LandingHero onLogin={handleLogin} onBrowseGuest={handleBrowseGuest} />
        <div className="-mt-12 md:-mt-20">
          <LandingFeatures />
        </div>
        <LandingPricing onLogin={handleLogin} />
      </main>

      <div className="relative z-10">
        <LandingFooter />
      </div>

      {/* Guest Mode Modal */}
      {showGuestModal && (
        <GuestModeModal
          onStartNew={handleGuestNewTree}
          onImport={handleGuestImport}
          onClose={() => setShowGuestModal(false)}
        />
      )}
    </div>
  );
});

LandingPage.displayName = 'LandingPage';
export default LandingPage;
