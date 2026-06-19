import { memo, useEffect, useMemo, useRef } from 'react';
import {
  Activity,
  AlertTriangle,
  Calendar,
  Check,
  ChevronRight,
  Layout,
  MapPin,
  Mars,
  ShieldCheck,
  Users,
  Venus,
  X,
} from 'lucide-react';

import { calculateCanonicalTreeAnalytics } from '../../../services/CanonicalTreeAnalytics';
import { useTranslation } from '../../../context/TranslationContext';
import { OverlayPrimitive } from '../../../context/OverlayContext';
import { formatDate } from '../../../utils/familyLogic';
import { useAppStore } from '../../../store/useAppStore';
import type { Person } from '../../../types';
import type { StatsData } from '../../../services/StatsEngine';

interface StatisticsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  people: Record<string, Person>;
  onNavigateToPerson?: (id: string) => void;
  initialView?: 'stats' | 'consistency';
}

export const buildStatisticsDashboardDisplayStats = (
  canonicalStats: StatsData,
  visibleStats: StatsData | null = null,
  useVisibleKpis: boolean = false
): StatsData => {
  if (!useVisibleKpis || !visibleStats) {
    return canonicalStats;
  }

  return {
    ...canonicalStats,
    kpis: {
      ...canonicalStats.kpis,
      totalMembers: visibleStats.kpis.totalMembers,
      maxGeneration: visibleStats.kpis.maxGeneration,
      genderRatio: visibleStats.kpis.genderRatio,
    },
    vitality: visibleStats.vitality,
  };
};

type MiniStat = {
  id: string;
  label: string;
  value: string;
  icon: typeof Users;
};

type ChartSegment = {
  id: string;
  label: string;
  value: number;
  color: string;
};

const ProgressBarGroup = ({
  title,
  segments,
}: {
  title: string;
  segments: ChartSegment[];
}) => {
  const total = Math.max(segments.reduce((sum, segment) => sum + segment.value, 0), 1);

  return (
    <div className="space-y-3">
      <div className="space-y-3">
        <h4 className="text-[14px] font-semibold tracking-[0.2px] text-slate-800">{title}</h4>
        <div className="space-y-3">
          {segments.map((segment) => {
            const percentage = Math.round((segment.value / total) * 100);
            return (
              <div
                key={segment.id}
                className="grid grid-cols-[minmax(64px,auto)_36px_minmax(0,1fr)_44px] items-center gap-3 text-[12px] text-slate-600"
              >
                <span className="truncate font-medium text-slate-700">{segment.label}</span>
                <span className="text-right font-medium tabular-nums text-slate-800">{segment.value}</span>
                <div className="flex h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
                  <div style={{ width: `${percentage}%`, backgroundColor: segment.color }} />
                </div>
                <span className="text-right font-medium tabular-nums text-slate-700">{percentage}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const StatisticsDashboard = memo(({
  isOpen,
  onClose,
  people,
  onNavigateToPerson,
  initialView = 'stats',
}: StatisticsDashboardProps) => {
  const { t } = useTranslation();
  const validationErrors = useAppStore((state) => state.validationErrors);
  const treeName = useAppStore((state) => state.treeName);
  const healthSectionRef = useRef<HTMLElement | null>(null);

  const canonicalStats = useMemo(
    () => calculateCanonicalTreeAnalytics(people, validationErrors).stats,
    [people, validationErrors]
  );

  const stats = useMemo(
    () => buildStatisticsDashboardDisplayStats(canonicalStats),
    [canonicalStats]
  );

  const totalMembers = stats.kpis.totalMembers;
  const maleCount = stats.kpis.genderRatio.male;
  const femaleCount = stats.kpis.genderRatio.female;
  const otherCount = stats.kpis.genderRatio.other;
  const issueEntries = Object.entries(validationErrors);
  const issuesCount = issueEntries.length;

  const infoStats: MiniStat[] = [
    {
      id: 'total',
      label: t.statistics.total,
      value: totalMembers.toLocaleString(),
      icon: Users,
    },
    {
      id: 'depth',
      label: t.statistics.depth,
      value: String(stats.kpis.maxGeneration),
      icon: Layout,
    },
    {
      id: 'health',
      label: t.statistics.health,
      value: `${stats.kpis.healthScore}%`,
      icon: ShieldCheck,
    },
    {
      id: 'issues',
      label: t.statistics.issues,
      value: String(issuesCount),
      icon: AlertTriangle,
    },
    {
      id: 'places',
      label: t.statistics.places,
      value: String(stats.topPlaces.length),
      icon: MapPin,
    },
  ];

  const birthdaysLabel = t.statistics.birthdays;
  const isConsistencyView = initialView === 'consistency';
  const overviewLabel = isConsistencyView
    ? `${t.consistencyChecker}: ${treeName?.trim() || t.untitledTree}`
    : `${t.statistics.title}: ${treeName?.trim() || t.untitledTree}`;
  const oldestLabel = t.oldestMember;
  const mostChildrenLabel = t.mostChildren;
  const topPlacesLabel = t.topPlaces;
  const topNamesLabel = t.statistics.topNames;
  const healthLabel = t.statistics.dataHealth;
  const noDataLabel = t.statistics.noDataAvailable;
  const noBirthdaysLabel = t.statistics.noUpcomingBirthdays;
  const noIssuesLabel = t.noIssuesFound;
  const visualSummaryLabel = t.statistics.visualSummary;
  const genderLabel = t.statistics.genderDistribution;
  const statusLabel = t.statistics.status;
  const topMaleNames = stats.topNames.male.slice(0, 5);
  const topFemaleNames = stats.topNames.female.slice(0, 5);

  const genderSegments: ChartSegment[] = [
    { id: 'male', label: t.statistics.male, value: maleCount, color: '#6E8CA6' },
    { id: 'female', label: t.statistics.female, value: femaleCount, color: '#B78A96' },
    { id: 'other', label: t.statistics.unknown, value: otherCount, color: '#9CA3AF' },
  ];

  const statusSegments: ChartSegment[] = stats.vitality.map((entry, index) => ({
    id: entry.status.toLowerCase(),
    label: index === 0 ? t.statistics.living : t.statistics.deceased,
    value: entry.count,
    color: index === 0 ? '#8A9B7A' : '#8E7E74',
  }));

  useEffect(() => {
    if (!isOpen || !isConsistencyView) return;

    const timer = window.setTimeout(() => {
      healthSectionRef.current?.scrollIntoView({ block: 'start' });
    }, 80);

    return () => window.clearTimeout(timer);
  }, [isConsistencyView, isOpen]);

  return (
    <OverlayPrimitive isOpen={isOpen} onClose={onClose} id="stats-dashboard">
      <div
        className="ds-overlay-card flex h-[92dvh] w-full flex-col overflow-hidden bg-[#FAF7F2] sm:h-[88vh] sm:max-w-4xl sm:rounded-[24px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ds-modal-header bg-[#F6F1E7]">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[#a67c37]/10 p-2 text-[#a67c37]">
              <Activity className="h-5 w-5" />
            </div>
            <h2 className="text-[16px] font-bold tracking-tight text-slate-800">{overviewLabel}</h2>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-muted)] transition-all hover:bg-white/80 hover:text-[var(--text-main)]"
            aria-label={t.close}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-7 overflow-y-auto bg-[#FAF7F2] p-4 sm:p-6">
          {isConsistencyView ? (
            <section ref={healthSectionRef} className="space-y-4 rounded-[24px] border border-red-100 bg-white/70 p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)] sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-[0.05em] text-red-400">
                    {t.consistencyChecker}
                  </p>
                  <h3 className="text-[15px] font-semibold tracking-tight text-slate-800 antialiased">
                    {issuesCount === 0 ? noIssuesLabel : t.issuesFound}
                  </h3>
                </div>
                <div className="flex gap-2">
                  <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-right text-emerald-700">
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em] opacity-80">{t.statistics.dataHealth}</p>
                    <p className="text-[15px] font-medium tabular-nums">{stats.kpis.healthScore}%</p>
                  </div>
                  <div className="rounded-2xl bg-red-50 px-3 py-2 text-right text-red-700">
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em] opacity-80">{t.statistics.issues}</p>
                    <p className="text-[15px] font-medium tabular-nums">{issuesCount}</p>
                  </div>
                </div>
              </div>

              {issuesCount === 0 ? (
                <div className="inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-[13px] font-medium text-emerald-700">
                  <Check className="h-4 w-4" />
                  <span>{noIssuesLabel}</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {issueEntries.map(([id, errors]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onNavigateToPerson?.(id)}
                      className="group flex w-full items-center justify-between gap-3 rounded-2xl bg-[#f3efe6] px-4 py-3 text-start transition-all duration-200 ease-in-out hover:bg-white"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {people[id]?.firstName} {people[id]?.lastName}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {errors.map((error, index) => (
                            <span
                              key={`${id}-${index}`}
                              className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600"
                            >
                              {error}
                            </span>
                          ))}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-colors group-hover:text-slate-600 rtl:rotate-180" />
                    </button>
                  ))}
                </div>
              )}
            </section>
          ) : null}

          <section className="space-y-5 rounded-[24px] bg-white/60 p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)] sm:space-y-6 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.05em] text-slate-400">
                  {t.statistics.snapshot}
                </p>
                <h3 className="text-[15px] font-semibold tracking-tight text-slate-800 antialiased">
                  {t.statistics.currentTree}
                </h3>
              </div>
              <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-right text-emerald-700">
                <p className="text-[12px] font-medium uppercase tracking-[0.08em] opacity-80">
                  {t.statistics.dataHealth}
                </p>
                <p className="text-[15px] font-medium tabular-nums text-emerald-700">{stats.kpis.healthScore}%</p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="mb-[10px] text-[15px] font-semibold tracking-[0.2px] text-slate-800 antialiased">{visualSummaryLabel}</h3>
              </div>

              <div className="space-y-3">
                <ProgressBarGroup title={genderLabel} segments={genderSegments} />
                <div className="space-y-3">
                  <h4 className="text-[14px] font-semibold tracking-tight text-slate-800">{statusLabel}</h4>
                  <div className="flex flex-wrap gap-3">
                    {statusSegments.map((segment) => (
                      <div
                        key={segment.id}
                        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white/65 px-3 py-2 text-slate-700"
                      >
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: segment.color }} />
                        <span className="text-[12px] font-medium">{segment.label}</span>
                        <span className="text-[12px] font-medium tabular-nums text-slate-800">{segment.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-[12px] text-slate-600 opacity-80">
                {infoStats.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.id} className="inline-flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 text-slate-400" />
                      <span className="font-medium tabular-nums text-slate-800">{stat.value}</span>
                      <span className="font-medium">{stat.label}</span>
                      {index < infoStats.length - 1 ? <span className="text-slate-300">•</span> : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <div className="h-px bg-black/[0.04]" />

          <section ref={isConsistencyView ? undefined : healthSectionRef} className="space-y-3">
            <h3 className="mb-[10px] text-[15px] font-semibold tracking-[0.2px] text-slate-800 antialiased">
              {t.statistics.coreRecords}
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-slate-400">
                  {t.statistics.members}
                </p>
                <p className="text-[15px] font-semibold tabular-nums text-slate-800">{totalMembers}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-slate-400">{oldestLabel}</p>
                <p className="text-[15px] font-semibold text-slate-800">{stats.records.oldestPerson?.name || noDataLabel}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-slate-400">{mostChildrenLabel}</p>
                <p className="text-[15px] font-semibold text-slate-800">{stats.records.mostChildren?.name || noDataLabel}</p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="mb-[10px] text-[15px] font-semibold tracking-[0.2px] text-slate-800 antialiased">{topPlacesLabel}</h3>
            {stats.topPlaces.length === 0 ? (
              <p className="text-sm italic text-slate-500">{noDataLabel}</p>
            ) : (
              <div className="max-h-[188px] space-y-0 overflow-y-auto">
                {stats.topPlaces.slice(0, 6).map((place, index) => (
                  <div
                    key={`${place.name}-${index}`}
                    className="flex items-center justify-between gap-3 border-b border-black/[0.05] py-3 last:border-b-0"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <p className="truncate text-[13px] font-medium text-slate-800">{place.name}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[#a67c37]/7 px-2 py-0.5 text-[11px] font-medium tabular-nums text-[#8b6b36]">
                      {place.count}
                    </span>
                  </div>
                  ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="mb-[10px] text-[15px] font-semibold tracking-[0.2px] text-slate-800 antialiased">{topNamesLabel}</h3>
            {topMaleNames.length === 0 && topFemaleNames.length === 0 ? (
              <p className="text-sm italic text-slate-500">{noDataLabel}</p>
            ) : (
              <div className="space-y-5">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[#526b82]">
                    <Mars className="h-3.5 w-3.5" />
                    <h4 className="text-[13px] font-semibold tracking-tight">
                      {t.statistics.topMaleNames}
                    </h4>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    {topMaleNames.map((entry, index) => (
                      <div
                        key={`${entry.name}-${index}`}
                        className="inline-flex min-h-11 items-center justify-between gap-2 rounded-2xl bg-transparent px-1 py-1 text-sm"
                      >
                        <span className="truncate font-semibold text-[#3f3528]">{entry.name}</span>
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#dfe8f0] px-1.5 text-[10px] font-medium tabular-nums text-[#61788d]">
                          {entry.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[#8f6671]">
                    <Venus className="h-3.5 w-3.5" />
                    <h4 className="text-[13px] font-semibold tracking-tight">
                      {t.statistics.topFemaleNames}
                    </h4>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    {topFemaleNames.map((entry, index) => (
                      <div
                        key={`${entry.name}-${index}`}
                        className="inline-flex min-h-11 items-center justify-between gap-2 rounded-2xl bg-transparent px-1 py-1 text-sm"
                      >
                        <span className="truncate font-semibold text-[#3f3528]">{entry.name}</span>
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f0dfe4] px-1.5 text-[10px] font-medium tabular-nums text-[#8f6671]">
                          {entry.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="mb-[10px] text-[15px] font-semibold tracking-[0.2px] text-slate-800 antialiased">{birthdaysLabel}</h3>
            {stats.upcomingBirthdays.length === 0 ? (
              <div className="inline-flex items-center gap-2 text-[12px] font-medium text-slate-500">
                <Check className="h-3.5 w-3.5 text-emerald-500/70" />
                <span>{noBirthdaysLabel}</span>
              </div>
            ) : (
              <div className="space-y-2">
                {stats.upcomingBirthdays.slice(0, 6).map((birthday) => (
                  <div
                    key={birthday.person.id}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-[#f3efe6] px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {birthday.person.firstName} {birthday.person.lastName}
                      </p>
                      <p className="text-[12px] leading-relaxed text-slate-500">
                        {t.statistics.turnsAgeOn
                          ?.replace('{age}', birthday.ageTurning.toString())
                          .replace('{date}', formatDate(birthday.nextBirthday))}
                      </p>
                    </div>
                    <div className="shrink-0 rounded-xl bg-white/80 px-3 py-2 text-center text-slate-600">
                      <Calendar className="mx-auto mb-1 h-3.5 w-3.5" />
                      <span className="text-[11px] font-medium tabular-nums">
                        {birthday.daysUntil === 0 ? t.statistics.today : `${birthday.daysUntil} ${t.statistics.days}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="mb-[10px] text-[15px] font-semibold tracking-[0.2px] text-slate-800 antialiased">{healthLabel}</h3>
            {issuesCount === 0 ? (
              <div className="inline-flex items-center gap-2 text-[12px] font-medium text-slate-500">
                <Check className="h-3.5 w-3.5 text-emerald-500/70" />
                <span>{noIssuesLabel}</span>
              </div>
            ) : (
              <div className="space-y-2">
                {issueEntries.map(([id, errors]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onNavigateToPerson?.(id)}
                    className="group flex w-full items-center justify-between gap-3 rounded-2xl bg-[#f3efe6] px-4 py-3 text-start transition-all duration-200 ease-in-out hover:bg-white"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {people[id]?.firstName} {people[id]?.lastName}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {errors.map((error, index) => (
                          <span
                            key={`${id}-${index}`}
                            className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600"
                          >
                            {error}
                          </span>
                        ))}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-colors group-hover:text-slate-600 rtl:rotate-180" />
                  </button>
                ))}
              </div>
            )}
          </section>

        </div>
      </div>
    </OverlayPrimitive>
  );
});

StatisticsDashboard.displayName = 'StatisticsDashboard';
