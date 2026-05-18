export const formatShareLinkLabel = (link: string) => {
  try {
    const url = new URL(link);
    const path = url.pathname.length > 18 ? `${url.pathname.slice(0, 18)}...` : url.pathname;
    return `${url.host}${path}`;
  } catch {
    return link.length > 28 ? `${link.slice(0, 28)}...` : link;
  }
};

export const chipBaseClass =
  'min-h-11 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 ease-in-out';

export const activeChipClass = `${chipBaseClass} bg-[var(--primary-600)] text-white shadow-sm`;

export const inactiveChipClass =
  `${chipBaseClass} border border-[var(--border-soft)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]`;

export const accessSectionClassName = 'rounded-[14px] border border-[var(--border-soft)] bg-[var(--surface-panel)] p-4 shadow-none';

export const accessDescriptionClassName = 'mb-3 text-xs leading-5 text-[var(--text-muted)]';
