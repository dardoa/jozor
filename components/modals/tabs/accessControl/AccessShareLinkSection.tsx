import React from 'react';
import { Check, Copy, Globe } from 'lucide-react';
import type { AccessSectionText, AccessText } from './accessControlTypes';
import { accessDescriptionClassName, accessSectionClassName, activeChipClass, inactiveChipClass } from './accessControlUtils';

export const AccessShareLinkSection: React.FC<{
  t: AccessText;
  sectionText: AccessSectionText;
  shareLinkLabel: string;
  isCopied: boolean;
  onCopy: () => void;
}> = ({ t, sectionText, shareLinkLabel, isCopied, onCopy }) => (
  <section className={accessSectionClassName}>
    <p className={accessDescriptionClassName}>{sectionText.shareDescription}</p>
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/55 p-3">
      <div className="flex min-w-0 items-center gap-2">
        <Globe className="h-4 w-4 text-[#a67c37]" />
        <h4 className="truncate text-[15px] font-bold tracking-tight text-slate-800">
          {t.treeManager.shareViaLink}
        </h4>
      </div>
      <div className="flex-1 overflow-hidden">
        <p className="truncate font-mono text-[12px] text-slate-600">{shareLinkLabel}</p>
      </div>
      <button type="button" onClick={onCopy} className={isCopied ? activeChipClass : inactiveChipClass}>
        {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {isCopied ? t.copied : t.copyLink}
      </button>
    </div>
  </section>
);
