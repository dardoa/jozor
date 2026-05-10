import { RotateCcw } from 'lucide-react';
import { Button } from '../../ui/Button';
import type { GlobalSettingsModalState } from '../useGlobalSettingsModalState';

type GlobalSettingsTourConfirmOverlayProps = Pick<
  GlobalSettingsModalState,
  't' | 'setShowTourConfirm' | 'handleResetTour'
>;

export const GlobalSettingsTourConfirmOverlay = ({
  t,
  setShowTourConfirm,
  handleResetTour,
}: GlobalSettingsTourConfirmOverlayProps) => (
  <div className="absolute inset-0 z-20 flex items-center justify-center bg-[color:rgba(66,66,66,0.2)] p-6 backdrop-blur-md animate-in fade-in duration-200">
    <div className="ds-overlay-card max-w-sm space-y-6 rounded-3xl p-8 text-center shadow-[var(--shadow-lg)]">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[var(--border-soft)] bg-[var(--surface-subtle)] text-[var(--color-info-500)]">
        <RotateCcw className="w-8 h-8" />
      </div>
      <div className="space-y-2">
        <h4 className="text-lg font-bold text-[var(--text-main)]">
          {t.globalSettings.restartTourModal.title}
        </h4>
        <p className="text-sm text-[var(--text-dim)] leading-relaxed">
          {t.tourRestartBody}
        </p>
      </div>
      <div className="flex gap-3">
        <Button
          variant="secondary"
          className="flex-1 rounded-xl font-bold"
          onClick={() => setShowTourConfirm(false)}
        >
          {t.cancel}
        </Button>
        <Button className="flex-1 rounded-xl font-bold" onClick={handleResetTour}>
          {t.globalSettings.restartTourModal.yes}
        </Button>
      </div>
    </div>
  </div>
);
