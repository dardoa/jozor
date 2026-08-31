
export const VaultTabLoader = ({ label = 'Loading...' }: { label?: string }) => (
  <div
    role="status"
    aria-live="polite"
    className="min-h-[180px] rounded-[14px] border border-[var(--border-soft)] bg-[var(--surface-panel)] p-5"
  >
    <span className="sr-only">{label}</span>
    <div className="animate-pulse space-y-4" aria-hidden="true">
      <div className="h-4 w-36 rounded bg-[var(--surface-subtle)]" />
      <div className="h-12 rounded-xl bg-[var(--surface-subtle)]" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-16 rounded-xl bg-[var(--surface-subtle)]" />
        <div className="h-16 rounded-xl bg-[var(--surface-subtle)]" />
      </div>
    </div>
  </div>
);
