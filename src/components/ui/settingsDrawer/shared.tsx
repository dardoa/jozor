import React from 'react';
import { Focus, Orbit } from 'lucide-react';
import { useTranslation } from '../../../context/TranslationContext';
import { AppTheme, TreeSettings } from '../../../types';

export type SettingsTranslator = ReturnType<typeof useTranslation>['t'];
export type IconComponent = React.ComponentType<{ className?: string }>;
export type PresetId = 'classic' | 'compact' | 'artistic';
export type LayoutMode = TreeSettings['layoutMode'];
export type LineStyle = NonNullable<TreeSettings['lineStyle']>;
export type BoxColorLogic = TreeSettings['boxColorLogic'];
export type DateFormat = NonNullable<TreeSettings['dateFormat']>;
export type ChartType = TreeSettings['chartType'];
export type VisibilitySettingKey =
    | 'showFirstName'
    | 'showMiddleName'
    | 'showLastName'
    | 'showNickname'
    | 'showMaidenName'
    | 'showPrefix'
    | 'showSuffix'
    | 'showDates'
    | 'showBirthDate'
    | 'showMarriageDate'
    | 'showDeathDate'
    | 'showBirthPlace'
    | 'showMarriagePlace'
    | 'showBurialPlace'
    | 'showResidence'
    | 'showPhotos'
    | 'showGender'
    | 'showOccupation'
    | 'showDeceased'
    | 'privacyMode';

export type SettingsTextOptions = {
    dateFormats?: Partial<Record<DateFormat, string>>;
    lineStyleOptions?: Partial<Record<LineStyle, string>>;
    nodeColorLogicOptions?: Partial<Record<BoxColorLogic, string>>;
    themeOptions?: Partial<Record<AppTheme, string>>;
} & Partial<Record<PresetId, string>>;

export interface BranchPerson {
    id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    title?: string;
    suffix?: string;
}

export const CHART_TYPE_OPTIONS: Array<{ id: ChartType; labelKey: 'focus' | 'radial'; icon: IconComponent }> = [
    { id: 'focus', labelKey: 'focus', icon: Focus },
    { id: 'radial', labelKey: 'radial', icon: Orbit },
];
export const LAYOUT_MODE_OPTIONS: Array<{ id: LayoutMode; labelKey: 'vertical' | 'horizontal' | 'radial' }> = [
    { id: 'vertical', labelKey: 'vertical' },
    { id: 'horizontal', labelKey: 'horizontal' },
    { id: 'radial', labelKey: 'radial' },
];
export const LINE_STYLE_OPTIONS: LineStyle[] = ['step', 'curved'];
export const NODE_COLOR_LOGIC_OPTIONS: BoxColorLogic[] = ['gender', 'lineage', 'none'];
export const THEME_OPTIONS: AppTheme[] = ['modern', 'vintage', 'blueprint', 'dark'];
export const VISIBILITY_SETTING_KEYS: VisibilitySettingKey[] = [
    'showFirstName',
    'showMiddleName',
    'showLastName',
    'showNickname',
    'showMaidenName',
    'showPrefix',
    'showSuffix',
    'showDates',
    'showBirthDate',
    'showMarriageDate',
    'showDeathDate',
    'showBirthPlace',
    'showMarriagePlace',
    'showBurialPlace',
    'showResidence',
    'showPhotos',
    'showGender',
    'showOccupation',
    'showDeceased',
    'privacyMode',
];
export const DATE_FORMAT_OPTIONS: DateFormat[] = ['iso', 'eu', 'us', 'long'];

interface SectionHeaderProps {
    icon: IconComponent;
    label: string;
    onReset?: () => void;
    t: SettingsTranslator;
}

interface SectionIntroProps {
    copy: string;
}

interface CheckboxProps {
    label: string;
    value: boolean;
    onChange: (v: boolean) => void;
    icon?: IconComponent;
}

interface SliderFieldProps {
    label: string;
    value: number;
    onChange: (v: number) => void;
    min: number;
    max: number;
    step: number;
    unit: string;
    icon?: IconComponent;
    valueLabel?: string;
}

export const SectionHeader = ({ icon: Icon, label, onReset, t }: SectionHeaderProps) => (
    <div className="mb-5 mt-10 flex items-center justify-between first:mt-0">
        <h3 className="flex items-center gap-2 text-[15px] font-bold tracking-[0.2px] antialiased" style={{ color: 'var(--text-main)' }}>
            <Icon className="h-4 w-4" />
            {label}
        </h3>
        {onReset && (
            <button
                type="button"
                onClick={onReset}
                className="rounded-xl px-2.5 py-1.5 text-[11px] font-medium transition-colors"
                style={{ color: 'var(--color-accent-500)' }}
            >
                {t.settings.resetSection}
            </button>
        )}
    </div>
);

export const Checkbox = ({ label, value, onChange, icon: Icon }: CheckboxProps) => (
    <label
        className="group inline-flex min-h-11 cursor-pointer select-none items-center gap-2 rounded-xl px-3 py-2 transition-colors"
        style={{
            backgroundColor: value ? 'var(--color-accent-500)' : 'rgba(255,255,255,0.5)',
            border: value ? '0.5px solid transparent' : '0.5px solid rgba(0,0,0,0.06)',
            boxShadow: value ? 'var(--shadow-sm)' : 'none',
            transform: value ? 'scale(1.02)' : 'scale(1)',
        }}
    >
        <div className="flex min-w-0 items-center gap-2">
            {Icon && (
                <div
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                    style={{
                        backgroundColor: value ? 'rgba(255,255,255,0.14)' : 'transparent',
                    }}
                >
                    <Icon {...{ className: "h-3.5 w-3.5", color: value ? '#FFFFFF' : 'var(--text-dim)' } as any} />
                </div>
            )}
            <span className="text-xs font-semibold leading-none" style={{ color: value ? '#FFFFFF' : 'var(--text-dim)' }}>{label}</span>
        </div>
        <input
            type="checkbox"
            className="sr-only"
            checked={value}
            onChange={(e) => onChange(e.target.checked)}
        />
    </label>
);

export const SliderField = ({ label, value, onChange, min, max, step, unit, icon: Icon, valueLabel }: SliderFieldProps) => (
    <div className="flex flex-col gap-2 px-3 py-2">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                {Icon && <Icon {...{ className: "h-3.5 w-3.5", color: "var(--color-accent-500)" } as any} />}
                <span className="text-sm font-medium" style={{ color: 'var(--text-dim)' }}>{label}</span>
            </div>
            <span className="text-xs font-bold" style={{ color: 'var(--color-accent-500)' }}>{valueLabel ?? `${value}${unit}`}</span>
        </div>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="h-1 w-full cursor-pointer appearance-none rounded-full"
            style={{ backgroundColor: 'var(--border-soft)', accentColor: 'var(--color-accent-500)' }}
        />
    </div>
);

export const SectionIntro = ({ copy }: SectionIntroProps) => (
    <div
        className="rounded-2xl px-3 py-3 text-[12px] leading-relaxed"
        style={{ backgroundColor: 'rgba(255,255,255,0.45)', color: 'var(--text-muted)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}
    >
        {copy}
    </div>
);

export const formatBranchPersonLabel = (person: BranchPerson, unnamedPersonLabel: string) => {
    const fullName = [person.title, person.firstName, person.middleName, person.lastName, person.suffix]
        .filter(Boolean)
        .join(' ')
        .trim();

    return fullName || unnamedPersonLabel;
};
