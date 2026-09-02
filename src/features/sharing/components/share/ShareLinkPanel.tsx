import { Check, Copy, LockKeyhole } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import type { ShareModalState } from './useShareModalState';

type ShareLinkPanelProps = Pick<ShareModalState, 't' | 'shareLink' | 'isCopied' | 'copyLink'>;

export const ShareLinkPanel = ({
  t,
  shareLink,
  isCopied,
  copyLink,
}: ShareLinkPanelProps) => (
  <div className="ds-panel ds-panel-subtle p-3 border-dashed flex items-center justify-between gap-3">
    <div className="min-w-0 text-sm text-[var(--text-dim)]">
      <div className="flex items-center gap-2 overflow-hidden">
        <LockKeyhole className="w-4 h-4 shrink-0" />
        <span className="truncate">{shareLink}</span>
      </div>
      <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">{t.treeManager.linkNote}</p>
    </div>
    <Button
      onClick={copyLink}
      disabled={!shareLink}
      variant="ghost"
      size="sm"
      className="shrink-0"
      leftIcon={isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
    >
      {isCopied ? t.copied : t.copyLink}
    </Button>
  </div>
);
