import React from 'react';
import { Blocks } from 'lucide-react';

import type { AboutSectionCard, AboutSectionId } from '../../types';

interface AboutSectionPickerProps {
  activeSection: AboutSectionId;
  sections: AboutSectionCard[];
  title: string;
  description: string;
  onChange: (section: AboutSectionId) => void;
}

export const AboutSectionPicker: React.FC<AboutSectionPickerProps> = ({
  activeSection,
  sections,
  title,
  description,
  onChange,
}) => (
  <section className="rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface-panel)] p-4 shadow-[var(--shadow-sm)]">
    <div className="mb-4 flex items-start gap-3">
      <div className="rounded-2xl bg-[var(--surface-subtle)] p-2 text-[var(--primary-700)]">
        <Blocks className="h-5 w-5" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-[var(--text-main)]">{title}</h3>
        <p className="mt-1 text-xs text-[var(--text-muted)]">{description}</p>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3">
      {sections.map((section) => {
        const Icon = section.icon;
        const isActive = activeSection === section.id;
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onChange(section.id)}
            className={`min-h-[116px] rounded-[24px] border px-4 py-4 text-start transition ${
              isActive
                ? 'border-[var(--color-accent-500)] bg-[color:rgba(197,160,89,0.14)] shadow-[var(--shadow-sm)]'
                : 'border-[var(--border-soft)] bg-[var(--surface-app)]'
            }`}
          >
            <div className="mb-3 inline-flex rounded-2xl bg-[var(--surface-subtle)] p-2 text-[var(--primary-700)]">
              <Icon className="h-4 w-4" />
            </div>
            <div className="text-sm font-semibold text-[var(--text-main)]">{section.label}</div>
            <div className="mt-1 text-[11px] leading-relaxed text-[var(--text-dim)]">{section.blurb}</div>
          </button>
        );
      })}
    </div>
  </section>
);
