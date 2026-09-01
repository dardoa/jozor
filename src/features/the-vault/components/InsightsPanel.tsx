import React from 'react';
import {
  Activity,
  ArrowUpRight,
  CircleGauge,
  Infinity as InfinityIcon,
  Mars,
  Users,
  Venus,
} from 'lucide-react';

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

const getHealthTone = (score: number) => {
  if (score >= 80) {
    return {
      labelKey: 'vaultStatsHealthGood' as const,
      textClass: 'text-[var(--color-success-500)]',
      progressClass: '[&::-webkit-progress-value]:bg-[var(--color-success-500)]',
    };
  }
  if (score >= 50) {
    return {
      labelKey: 'vaultStatsHealthReview' as const,
      textClass: 'text-[var(--color-warning-500)]',
      progressClass: '[&::-webkit-progress-value]:bg-[var(--color-warning-500)]',
    };
  }
  return {
    labelKey: 'vaultStatsHealthPoor' as const,
    textClass: 'text-[var(--danger-600)]',
    progressClass: '[&::-webkit-progress-value]:bg-[var(--danger-600)]',
  };
};

export const InsightsPanel: React.FC<InsightsPanelProps> = ({
  treeName,
  healthScore,
  stats,
  t,
  onOpenTool,
}) => {
  const normalizedHealthScore = Number.isFinite(healthScore)
    ? Math.min(100, Math.max(0, Math.round(healthScore)))
    : 0;
  const healthTone = getHealthTone(normalizedHealthScore);
  const toolGroups = [
    { id: 'view', label: t.vaultInsightsExploreGroup },
    { id: 'analysis', label: t.vaultInsightsAnalysisGroup },
  ] as const;

  return (
    <div className="space-y-6">
      <section aria-label={t.vaultInsights} className="border-b border-[var(--border-soft)] pb-6">
        {stats ? (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium text-[var(--text-muted)]">{t.vaultStatsTreeName}</p>
                <h3 className="mt-1 truncate text-lg font-bold text-[var(--text-main)]">
                  {treeName || '-'}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => onOpenTool('consistency')}
                aria-label={`${t.vaultStatsOpenHealthCheck}: ${normalizedHealthScore}%`}
                className="flex min-h-12 w-full items-center gap-3 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 py-2 text-start transition-colors hover:bg-[var(--surface-hover)] sm:w-auto sm:min-w-[15rem]"
              >
                <CircleGauge className={`h-5 w-5 shrink-0 ${healthTone.textClass}`} />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium text-[var(--text-muted)]">{t.vaultStatsHealthScore}</span>
                  <span className={`mt-0.5 block text-sm font-semibold ${healthTone.textClass}`}>{t[healthTone.labelKey]}</span>
                </span>
                <span className={`text-lg font-bold tabular-nums ${healthTone.textClass}`}>{normalizedHealthScore}%</span>
              </button>
            </div>

            <progress
              className={`mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-subtle)] [&::-webkit-progress-bar]:bg-[var(--surface-subtle)] ${healthTone.progressClass}`}
              max={100}
              value={normalizedHealthScore}
              aria-label={t.vaultStatsHealthScore}
            />

            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4" role="list" aria-label={t.vaultStatsGenderDist}>
              {[
                { id: 'total', label: t.vaultStatsTotalPeople, value: stats.total, color: 'text-[var(--primary-600)]', icon: Users },
                { id: 'male', label: t.vaultStatsMale, value: stats.male, color: 'text-[var(--color-info-500)]', icon: Mars },
                { id: 'female', label: t.vaultStatsFemale, value: stats.female, color: 'text-[var(--color-accent-500)]', icon: Venus },
                { id: 'unknown', label: t.vaultStatsUnknown, value: stats.unknown, color: 'text-[var(--text-muted)]', icon: InfinityIcon },
              ].map((stat) => (
                <div
                  key={stat.id}
                  role="listitem"
                  className="flex min-h-16 min-w-0 items-center gap-2.5 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 py-2.5"
                >
                  <stat.icon className={`h-4 w-4 shrink-0 ${stat.color}`} />
                  <div className="min-w-0">
                    <p className={`text-base font-semibold leading-none tabular-nums ${stat.color}`}>{stat.value}</p>
                    <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div role="status" className="flex min-h-24 items-center gap-3 rounded-lg border border-dashed border-[var(--border-soft)] px-4 py-5 text-[var(--text-muted)]">
            <Activity className="h-5 w-5 shrink-0" />
            <p className="text-sm">{t.vaultStatsEmpty}</p>
          </div>
        )}
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {toolGroups.map((group) => {
          const tools = TOOLS_REGISTRY.filter((tool) => tool.category === group.id);
          return (
            <section key={group.id} aria-labelledby={`vault-tool-group-${group.id}`}>
              <h3 id={`vault-tool-group-${group.id}`} className="mb-2 text-sm font-bold text-[var(--text-main)]">
                {group.label}
              </h3>
              <div className="divide-y divide-[var(--border-soft)] border-y border-[var(--border-soft)]">
                {tools.map((tool) => {
                  const Icon = tool.icon;
                  const tone = TOOL_TONE_CLASSES[tool.color] ?? TOOL_TONE_CLASSES.blue;
                  const translatedLabel = t[tool.labelKey as keyof TranslationSchema];
                  const label = typeof translatedLabel === 'string' ? translatedLabel : tool.labelKey;

                  return (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => onOpenTool(tool.id)}
                      className="group flex min-h-[60px] w-full items-center gap-3 px-1 py-3 text-start transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-500)]"
                    >
                      <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone.iconBg} ${tone.iconText}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1 text-sm font-semibold text-[var(--text-main)]">{label}</span>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 rtl:-scale-x-100" aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
