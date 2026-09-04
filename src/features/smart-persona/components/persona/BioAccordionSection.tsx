import React from 'react';
import { ChevronDown } from 'lucide-react';

interface BioAccordionSectionProps {
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  hasContent: boolean;
  isEditing: boolean;
  focusTarget?: string;
}

export const BioAccordionSection: React.FC<BioAccordionSectionProps> = ({
  title,
  icon,
  isOpen,
  onToggle,
  children,
  hasContent,
  isEditing,
  focusTarget,
}) => (
  <div
    data-smart-persona-field={focusTarget}
    data-smart-persona-expanded={isOpen ? 'true' : 'false'}
    tabIndex={focusTarget ? -1 : undefined}
    className="ds-persona-section scroll-mt-4 overflow-hidden transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]/50"
  >
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-4 hover:bg-[var(--theme-hover)] transition-colors group"
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg transition-colors ${hasContent ? 'bg-[var(--primary-600)]/10 text-[var(--primary-600)]' : 'bg-[var(--surface-subtle)] text-[var(--text-dim)]'}`}>
          {React.isValidElement(icon) && React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'w-4 h-4' })}
        </div>
        <span className={`text-sm font-bold ${hasContent ? 'text-[var(--text-main)]' : 'text-[var(--text-dim)]'}`}>
          {title}
        </span>
        {hasContent && !isEditing && (
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary-600)] animate-pulse" />
        )}
      </div>
      <ChevronDown
        className={`w-4 h-4 text-[var(--text-dim)] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
      />
    </button>

    <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
      <div className="p-4 pt-0 border-t border-[var(--border-soft)]">
        {children}
      </div>
    </div>
  </div>
);
