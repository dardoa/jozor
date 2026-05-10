import React from 'react';

export const TreeSettingsFlashMessages: React.FC<{ error: string | null; success: string | null }> = ({
  error,
  success,
}) => (
  <>
    {error ? (
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 p-3">
        <p className="text-sm text-[var(--color-danger)]">{error}</p>
      </div>
    ) : null}

    {success ? (
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 p-3">
        <p className="text-sm text-[var(--color-primary)]">{success}</p>
      </div>
    ) : null}
  </>
);
