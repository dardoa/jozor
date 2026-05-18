import { Check, Copy, Globe } from 'lucide-react';
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
    <div className="flex items-center gap-2 text-sm text-[var(--text-dim)] overflow-hidden">
      <Globe className="w-4 h-4 shrink-0" />
      <span className="truncate">{shareLink}</span>
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
