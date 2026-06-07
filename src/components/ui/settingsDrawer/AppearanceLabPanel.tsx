/**
 * Appearance Lab control panel.
 *
 * Phase 5 (final): All reads/writes go through useAppStore().appearance.
 * Types and constants live in src/domain/appearance/appearanceEngine.ts.
 */
import React, { useCallback, useMemo } from 'react';
import { SettingsTextOptions, SettingsTranslator } from './shared';
import { CoreEngineSection } from './appearanceLabSections/CoreEngineSection';
import { buildPalettePreviewById } from './appearanceLabSections/themeOptions';
import type { AdvancedTabId, AppearanceLabPerson, SectionId } from './appearanceLabSections/types';

const ThemeStyleSection = React.lazy(() =>
    import('./appearanceLabSections/ThemeStyleSection').then((module) => ({ default: module.ThemeStyleSection }))
);

const AppearanceSection = React.lazy(() =>
    import('./appearanceLabSections/AppearanceSection').then((module) => ({ default: module.AppearanceSection }))
);

const LayoutSection = React.lazy(() =>
    import('./appearanceLabSections/LayoutSection').then((module) => ({ default: module.LayoutSection }))
);

const ContentSection = React.lazy(() =>
    import('./appearanceLabSections/ContentSection').then((module) => ({ default: module.ContentSection }))
);

const AdvancedSection = React.lazy(() =>
    import('./appearanceLabSections/AdvancedSection').then((module) => ({ default: module.AdvancedSection }))
);

interface AppearanceLabPanelProps {
    t: SettingsTranslator;
    people: Record<string, AppearanceLabPerson>;
    unnamedPersonLabel: string;
    onSectionOpen?: (section: SectionId) => void;
}

export const AppearanceLabPanel = ({
    t,
    people,
    unnamedPersonLabel,
    onSectionOpen,
}: AppearanceLabPanelProps) => {
    const settingsText: SettingsTextOptions = t.settings;
    const [openSection, setOpenSection] = React.useState<SectionId | null>('theme');
    const [advancedTab, setAdvancedTab] = React.useState<AdvancedTabId>('details');

    const toggleSection = useCallback((id: SectionId) => {
        setOpenSection((previous) => {
            const next = previous === id ? null : id;
            if (next) onSectionOpen?.(next);
            return next;
        });
    }, [onSectionOpen]);

    const sortedPeople = useMemo(() => {
        return Object.values(people || {}).sort((a, b) => {
            const nameA = a.firstName || a.lastName || '';
            const nameB = b.firstName || b.lastName || '';
            return nameA.localeCompare(nameB);
        });
    }, [people]);

    const palettePreviewById = useMemo(() => buildPalettePreviewById(), []);
    const sectionFallback = (
        <div className="rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface-panel)] p-4 shadow-[var(--shadow-sm)]">
            <div className="h-4 w-36 rounded-full bg-[var(--surface-subtle)]" />
            <div className="mt-3 h-16 rounded-[18px] bg-[var(--surface-subtle)]" />
        </div>
    );

    // Phase 5: All CSS tokens and visual toggles are managed by useAppStore().appearance.

    return (
        <div className="space-y-4">
            <CoreEngineSection settingsText={settingsText} t={t} />
            <React.Suspense fallback={sectionFallback}>
                <ThemeStyleSection
                    open={openSection === 'theme'}
                    onToggle={toggleSection}
                    settingsText={settingsText}
                    palettePreviewById={palettePreviewById}
                />
                <AppearanceSection
                    open={openSection === 'appearance'}
                    onToggle={toggleSection}
                    settingsText={settingsText}
                    t={t}
                />
                <LayoutSection
                    open={openSection === 'layout'}
                    onToggle={toggleSection}
                    settingsText={settingsText}
                    t={t}
                />
                <ContentSection
                    open={openSection === 'content'}
                    onToggle={toggleSection}
                    settingsText={settingsText}
                    t={t}
                />
                <AdvancedSection
                    open={openSection === 'advanced'}
                    onToggle={toggleSection}
                    advancedTab={advancedTab}
                    setAdvancedTab={setAdvancedTab}
                    settingsText={settingsText}
                    t={t}
                    sortedPeople={sortedPeople}
                    unnamedPersonLabel={unnamedPersonLabel}
                />
            </React.Suspense>
        </div>
    );
};
