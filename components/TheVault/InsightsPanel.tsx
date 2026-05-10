import React from 'react';
import { Infinity, Mars, Users, Venus } from 'lucide-react';

import type { ModalType } from '../../types';
import type { TranslationSchema } from '../../utils/translationLoader';
import { TOOLS_REGISTRY } from '../../utils/toolsRegistry';

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
  green: { iconBg: 'bg-emerald-50', iconText: 'text-emerald-700' },
  blue: { iconBg: 'bg-sky-50', iconText: 'text-sky-700' },
  emerald: { iconBg: 'bg-emerald-50', iconText: 'text-emerald-700' },
  orange: { iconBg: 'bg-amber-50', iconText: 'text-amber-700' },
  indigo: { iconBg: 'bg-indigo-50', iconText: 'text-indigo-700' },
  slate: { iconBg: 'bg-slate-100', iconText: 'text-slate-700' },
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
        <div className="rounded-[14px] bg-[#f9f7f3] p-4 shadow-none">
          <p className="text-[12px] text-slate-500">{t.vaultStatsEmpty}</p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 rounded-[14px] bg-[#f9f7f3] p-4 shadow-none min-[390px]:grid-cols-[1.4fr_0.8fr]">
            <div className="flex-1 ps-0.5">
              <p className="truncate text-[16px] font-bold tracking-tight text-slate-800">
                {treeName || '-'}
              </p>
            </div>
            <div className="flex flex-col items-end justify-center gap-0.5 pe-0.5 text-end">
              <p className="text-[10px] font-medium uppercase tracking-[0.04em] text-slate-500">
                {t.vaultStatsHealthScore}
              </p>
              <p
                className={`text-[15px] font-medium leading-none ${
                  healthScore >= 80
                    ? 'text-emerald-700'
                    : healthScore >= 50
                      ? 'text-amber-600'
                      : 'text-rose-600'
                }`}
              >
                {healthScore}%
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex min-h-[52px] items-center gap-2 rounded-xl bg-white/45 px-3 py-2">
              <div className="rounded-xl bg-white/70 p-1.5 text-[#a67c37]">
                <Users className="h-3.5 w-3.5 stroke-[1.8]" />
              </div>
              <div className="min-w-0">
                <p className="text-base font-medium leading-none text-[#a67c37]">{stats.total}</p>
                <p className="mt-1 truncate text-[10px] font-medium uppercase tracking-[0.03em] text-slate-500">
                  {t.vaultStatsTotalPeople}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: t.vaultStatsMale, value: stats.male, color: 'text-sky-500', icon: Mars },
                { label: t.vaultStatsFemale, value: stats.female, color: 'text-rose-400', icon: Venus },
                { label: t.vaultStatsUnknown, value: stats.unknown, color: 'text-slate-500', icon: Infinity },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex min-h-[48px] items-center gap-2 rounded-xl bg-white/45 px-2.5 py-2"
                >
                  <div className="rounded-lg bg-white/70 p-1.5 text-[#a67c37]">
                    <stat.icon className="h-3.5 w-3.5 stroke-[1.8]" />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium leading-none ${stat.color}`}>{stat.value}</p>
                    <p className="mt-1 truncate text-[9px] font-medium uppercase tracking-[0.03em] text-slate-500">
                      {stat.label}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <section className="rounded-[14px] bg-[#f9f7f3] p-4 shadow-none">
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
                className="flex min-h-[116px] flex-col items-start justify-center gap-4 rounded-2xl bg-transparent px-4 py-4 text-start transition-all duration-200 ease-in-out hover:bg-white/60"
                style={{ border: '1px solid rgb(241 245 249)' }}
              >
                <div className={`rounded-2xl p-3 ${tone.iconBg} ${tone.iconText}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-sm font-semibold text-slate-800">{label}</div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
