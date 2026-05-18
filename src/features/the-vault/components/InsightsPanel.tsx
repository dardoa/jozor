import React from 'react';
import { Infinity as InfinityIcon, Mars, Users, Venus } from 'lucide-react';

import type { ModalType } from '../../../types';
import type { TranslationSchema } from '../../../utils/translationLoader';
import { TOOLS_REGISTRY } from '../../../utils/toolsRegistry';

interface InsightsPanelProps {
  treeName: string;
  healthScore: number;
  stats: {
    total: number;
    male: number;
    female: number;
    unknown: number;
  } | null;
  t: TranslationSchema;
  onOpenTool: (modalType: ModalType) => void;
}

const TOOL_TONE_CLASSES: Record<string, { iconBg: string; iconText: string }> = {
  green: { iconBg: 'bg-[var(--color-success-500)]/10', iconText: 'text-[var(--color-success-500)]' },
  blue: { iconBg: 'bg-[var(--color-info-500)]/10', iconText: 'text-[var(--color-info-500)]' },
  emerald: { iconBg: 'bg-[var(--color-success-500)]/10', iconText: 'text-[var(--color-success-500)]' },
  orange: { iconBg: 'bg-[var(--color-warning-500)]/10', iconText: 'text-[var(--color-warning-500)]' },
  indigo: { iconBg: 'bg-[var(--primary-600)]/10', iconText: 'text-[var(--primary-600)]' },
  slate: { iconBg: 'bg-[var(--surface-subtle)]', iconText: 'text-[var(--text-secondary)]' },
};

export const InsightsPanel: React.FC<InsightsPanelProps> = ({
  treeName,
  healthScore,
  stats,
  t,
  onOpenTool,
}) => {
  return (
    <div className="space-y-3">
      {!stats ? (
        <div className="rounded-[14px] border border-[var(--border-soft)] bg-[var(--surface-panel)] p-4 shadow-none">
          <p className="text-[12px] text-[var(--text-muted)]">{t.vaultStatsEmpty}</p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 rounded-[14px] border border-[var(--border-soft)] bg-[var(--surface-panel)] p-4 shadow-none min-[390px]:grid-cols-[1.4fr_0.8fr]">
            <div className="flex-1 ps-0.5">
              <p className="truncate text-[16px] font-bold tracking-tight text-[var(--text-main)]">
                {treeName || '-'}
              </p>
            </div>
            <div className="flex flex-col items-end justify-center gap-0.5 pe-0.5 text-end">
              <p className="text-[10px] font-medium uppercase tracking-[0.04em] text-[var(--text-muted)]">
                {t.vaultStatsHealthScore}
              </p>
              <p
                className={`text-[15px] font-medium leading-none ${
                  healthScore >= 80
                     ? 'text-[var(--color-success-500)]'
                     : healthScore >= 50
                       ? 'text-[var(--color-warning-500)]'
                       : 'text-[var(--danger-600)]'
                }`}
              >
                {healthScore}%
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex min-h-[52px] items-center gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 py-2">
              <div className="rounded-xl bg-[var(--surface-subtle)] p-1.5 text-[var(--primary-600)]">
                <Users className="h-3.5 w-3.5 stroke-[1.8]" />
              </div>
              <div className="min-w-0">
                <p className="text-base font-medium leading-none text-[var(--primary-600)]">{stats.total}</p>
                <p className="mt-1 truncate text-[10px] font-medium uppercase tracking-[0.03em] text-[var(--text-muted)]">
                  {t.vaultStatsTotalPeople}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'male', label: t.vaultStatsMale, value: stats.male, color: 'text-[var(--color-info-500)]', icon: Mars },
                { id: 'female', label: t.vaultStatsFemale, value: stats.female, color: 'text-[var(--color-accent-500)]', icon: Venus },
                { id: 'unknown', label: t.vaultStatsUnknown, value: stats.unknown, color: 'text-[var(--text-muted)]', icon: InfinityIcon },
              ].map((stat) => (
                <div
                  key={stat.id}
                  className="flex min-h-[48px] items-center gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel)] px-2.5 py-2"
                >
                  <div className="rounded-lg bg-[var(--surface-subtle)] p-1.5 text-[var(--primary-600)]">
                    <stat.icon className="h-3.5 w-3.5 stroke-[1.8]" />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium leading-none ${stat.color}`}>{stat.value}</p>
                    <p className="mt-1 truncate text-[9px] font-medium uppercase tracking-[0.03em] text-[var(--text-muted)]">
                      {stat.label}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <section className="rounded-[14px] border border-[var(--border-soft)] bg-[var(--surface-panel)] p-4 shadow-none">
        <div className="grid grid-cols-2 gap-4">
          {TOOLS_REGISTRY.map((tool) => {
            const Icon = tool.icon;
            const tone = TOOL_TONE_CLASSES[tool.color] ?? TOOL_TONE_CLASSES.blue;
            const translatedLabel = t[tool.labelKey as keyof TranslationSchema];
            const label = typeof translatedLabel === 'string' ? translatedLabel : tool.labelKey;

            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => onOpenTool(tool.id)}
                className="flex min-h-[116px] flex-col items-start justify-center gap-4 rounded-2xl border border-[var(--border-soft)] bg-transparent px-4 py-4 text-start transition-all duration-200 ease-in-out hover:bg-[var(--surface-hover)]"
              >
                <div className={`rounded-2xl p-3 ${tone.iconBg} ${tone.iconText}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-sm font-semibold text-[var(--text-main)]">{label}</div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
