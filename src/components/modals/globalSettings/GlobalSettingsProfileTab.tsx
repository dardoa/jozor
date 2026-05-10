import { Camera, Loader2, User } from 'lucide-react';
import { Button } from '../../ui/Button';
import { FormField } from '../../ui/FormField';
import type { GlobalSettingsModalState } from '../useGlobalSettingsModalState';

type GlobalSettingsProfileTabProps = Pick<
  GlobalSettingsModalState,
  | 't'
  | 'user'
  | 'displayName'
  | 'setDisplayName'
  | 'isUploading'
  | 'isSaving'
  | 'fileInputRef'
  | 'handleAvatarClick'
  | 'onFileChange'
  | 'handleSaveProfile'
>;

export const GlobalSettingsProfileTab = ({
  t,
  user,
  displayName,
  setDisplayName,
  isUploading,
  isSaving,
  fileInputRef,
  handleAvatarClick,
  onFileChange,
  handleSaveProfile,
}: GlobalSettingsProfileTabProps) => (
  <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
    <div className="flex flex-col items-center gap-4">
      <div
        className="relative group cursor-pointer"
        onClick={handleAvatarClick}
      >
        <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border-soft)] bg-[var(--surface-panel-subtle)] shadow-[var(--shadow-md)]">
          {user?.photoURL ? (
            <img src={user.photoURL} alt={t.avatarAlt} className="w-full h-full object-cover" />
          ) : (
            <User className="w-12 h-12 text-[var(--text-dim)]" />
          )}

          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[var(--surface-panel)]/92 text-[var(--text-main)] text-xs font-bold opacity-0 transition-opacity group-hover:opacity-100">
            <Camera className="w-6 h-6" />
            <span>{t.globalSettings.profile.changePhoto}</span>
          </div>

          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[var(--surface-panel)]/92">
              <Loader2 className="w-8 h-8 text-[var(--primary-600)] animate-spin" />
            </div>
          )}
        </div>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={onFileChange}
        />
      </div>
      <div className="text-center">
        <h3 className="font-bold text-[var(--text-main)]">{user?.displayName}</h3>
        <p className="text-xs text-[var(--text-dim)]">{user?.email}</p>
      </div>
    </div>

    <div className="space-y-4 pt-4">
      <FormField
        label={t.globalSettings.profile.displayName}
        value={displayName}
        onCommit={(v) => setDisplayName(v as string)}
      />
      <Button
        className="w-full h-12 rounded-2xl font-bold"
        onClick={handleSaveProfile}
        isLoading={isSaving}
      >
        {t.globalSettings.profile.saveChanges}
      </Button>
    </div>
  </div>
);
