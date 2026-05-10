import React from 'react';
import { Settings, X } from 'lucide-react';
import { OverlayPrimitive } from '../../context/OverlayContext';
import { GlobalSettingsTabs } from './globalSettings/GlobalSettingsTabs';
import { GlobalSettingsTourConfirmOverlay } from './globalSettings/GlobalSettingsTourConfirmOverlay';
import { useGlobalSettingsModalState } from './useGlobalSettingsModalState';

const GlobalSettingsProfileTab = React.lazy(() =>
  import('./globalSettings/GlobalSettingsProfileTab').then((module) => ({ default: module.GlobalSettingsProfileTab }))
);

const GlobalSettingsPreferencesTab = React.lazy(() =>
  import('./globalSettings/GlobalSettingsPreferencesTab').then((module) => ({ default: module.GlobalSettingsPreferencesTab }))
);

const GlobalSettingsSecurityTab = React.lazy(() =>
  import('./globalSettings/GlobalSettingsSecurityTab').then((module) => ({ default: module.GlobalSettingsSecurityTab }))
);

interface GlobalSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSettingsModal: React.FC<GlobalSettingsModalProps> = ({ isOpen, onClose }) => {
  const state = useGlobalSettingsModalState(onClose);
  const { t, user, activeTab, setActiveTab, showTourConfirm } = state;

  if (!user) return null;

  return (
    <OverlayPrimitive
      isOpen={isOpen}
      onClose={onClose}
      id="global-settings-modal"
    >
      <div className="ds-overlay-card relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[var(--radius-2xl)] shadow-[var(--shadow-lg)]">
        <div className="ds-modal-header flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-2 text-[var(--color-info-500)]">
              <Settings className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-main)]">
              {t.globalSettings.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-dim)] transition-all hover:bg-[var(--surface-subtle)] hover:text-[var(--text-main)]"
            aria-label={t.close}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <GlobalSettingsTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          labels={t.globalSettings.tabs}
        />

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[var(--surface-app)]/35">
          <React.Suspense
            fallback={
              <div className="space-y-4">
                <div className="h-5 w-40 rounded-full bg-[var(--surface-subtle)]" />
                <div className="h-24 rounded-[var(--radius-xl)] bg-[var(--surface-panel)]" />
                <div className="h-10 w-44 rounded-[var(--radius-lg)] bg-[var(--surface-subtle)]" />
              </div>
            }
          >
            {activeTab === 'profile' && (
              <GlobalSettingsProfileTab
                t={state.t}
                user={user}
                displayName={state.displayName}
                setDisplayName={state.setDisplayName}
                isUploading={state.isUploading}
                isSaving={state.isSaving}
                fileInputRef={state.fileInputRef}
                handleAvatarClick={state.handleAvatarClick}
                onFileChange={state.onFileChange}
                handleSaveProfile={state.handleSaveProfile}
              />
            )}

            {activeTab === 'preferences' && (
              <GlobalSettingsPreferencesTab
                t={state.t}
                language={state.language}
                setLanguage={state.setLanguage}
                darkMode={state.darkMode}
                handleToggleTheme={state.handleToggleTheme}
                isLowGraphicsMode={state.isLowGraphicsMode}
                setIsLowGraphicsMode={state.setIsLowGraphicsMode}
                setShowTourConfirm={state.setShowTourConfirm}
              />
            )}

            {activeTab === 'security' && (
              <GlobalSettingsSecurityTab
                t={state.t}
                deleteProgress={state.deleteProgress}
                setDeleteProgress={state.setDeleteProgress}
                isDeleting={state.isDeleting}
                showDeleteConfirm={state.showDeleteConfirm}
                setShowDeleteConfirm={state.setShowDeleteConfirm}
                startDeleteHold={state.startDeleteHold}
                cancelDeleteHold={state.cancelDeleteHold}
              />
            )}
          </React.Suspense>
        </div>

        <div className="ds-modal-footer flex items-center justify-between px-6 py-5 text-[10px] text-[var(--text-dim)]">
          <div>
            Jozor 1.1 Gold Standard • {user.uid.slice(0, 8)}
          </div>
          <div className="flex gap-4">
            <a href="#" className="transition-colors hover:text-[var(--color-info-500)]">{t.footer.privacyPolicy}</a>
            <a href="#" className="transition-colors hover:text-[var(--color-info-500)]">{t.footer.termsOfService}</a>
          </div>
        </div>
      </div>

      {showTourConfirm && (
        <GlobalSettingsTourConfirmOverlay
          t={state.t}
          setShowTourConfirm={state.setShowTourConfirm}
          handleResetTour={state.handleResetTour}
        />
      )}
    </OverlayPrimitive>
  );
};

export default GlobalSettingsModal;
