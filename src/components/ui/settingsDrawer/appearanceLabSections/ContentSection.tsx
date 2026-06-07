import React from 'react';
import { Eye } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../../../store/useAppStore';
import { Checkbox, type SettingsTextOptions, type SettingsTranslator } from '../shared';
import { SectionShell } from './sectionStyles';
import type { SectionId } from './types';

export const ContentSection = React.memo(({ open, onToggle, settingsText, t }: { open: boolean; onToggle: (id: SectionId) => void; settingsText: SettingsTextOptions; t: SettingsTranslator }) => {
  // READ: from appearanceSlice
  const contentVisibility = useAppStore(useShallow((state) => state.appearance.contentVisibility));
  // WRITE: directly to appearanceSlice
  const updateField = useAppStore((state) => state.updateAppearanceField);
  const showPlaces = contentVisibility.places.enabled;
  const namesLabel = settingsText.names || t.names || settingsText.nameFields || 'Names';
  const middleNameLabel = t.showMiddleName || 'Middle Name';
  const nicknameLabel = 'Nickname';
  const suffixLabel = t.suffix || 'Suffix';

  return (
    <SectionShell
      id="content"
      icon={Eye}
      title={settingsText.visibleContent || 'Visible Content'}
      caption={`${settingsText.photos || 'Photos'} • ${namesLabel} • ${settingsText.dates || 'Dates'} • ${settingsText.places || 'Places'}`}
      open={open}
      onToggle={onToggle}
    >
      <div className="space-y-5">
        <div className="space-y-3">
          <Checkbox label={settingsText.photos || t.photos} value={contentVisibility.photos} onChange={(value) => updateField('contentVisibility.photos', value)} />
        </div>
        <div className="space-y-3">
          <Checkbox label={namesLabel} value={contentVisibility.names.showBaseName} onChange={(value) => updateField('contentVisibility.names.showBaseName', value)} />
          <div className="ms-3 flex flex-wrap gap-2.5">
            <Checkbox label={middleNameLabel} value={contentVisibility.names.showMiddleName} onChange={(value) => updateField('contentVisibility.names.showMiddleName', value)} />
            <Checkbox label={nicknameLabel} value={contentVisibility.names.showNickname} onChange={(value) => updateField('contentVisibility.names.showNickname', value)} />
            <Checkbox label={suffixLabel} value={contentVisibility.names.showSuffix} onChange={(value) => updateField('contentVisibility.names.showSuffix', value)} />
          </div>
        </div>
        <div className="space-y-3">
          <Checkbox
            label={settingsText.dates || t.dates}
            value={contentVisibility.dates.enabled}
            onChange={(value) => {
              updateField('contentVisibility.dates.enabled', value);
              updateField('contentVisibility.dates.birth', value);
              updateField('contentVisibility.dates.death', value);
              updateField('contentVisibility.dates.marriage', value);
            }}
          />
          {contentVisibility.dates.enabled ? (
            <div className="ms-3 flex flex-wrap gap-2.5">
              <Checkbox label={t.birthDate || 'Birth'} value={contentVisibility.dates.birth} onChange={(value) => updateField('contentVisibility.dates.birth', value)} />
              <Checkbox label={t.deathDate || 'Death'} value={contentVisibility.dates.death} onChange={(value) => updateField('contentVisibility.dates.death', value)} />
              <Checkbox label={t.marriageDate || 'Marriage'} value={contentVisibility.dates.marriage} onChange={(value) => updateField('contentVisibility.dates.marriage', value)} />
            </div>
          ) : null}
        </div>
        <div className="space-y-3">
          <Checkbox
            label={settingsText.places || settingsText.placeFields || 'Places'}
            value={showPlaces}
            onChange={(value) => {
              updateField('contentVisibility.places.enabled', value);
              updateField('contentVisibility.places.birthPlace', value);
              updateField('contentVisibility.places.marriagePlace', value);
              updateField('contentVisibility.places.burialPlace', value);
            }}
          />
          {showPlaces ? (
            <div className="ms-3 flex flex-wrap gap-2.5">
              <Checkbox label={t.birthPlace || 'Birth Place'} value={contentVisibility.places.birthPlace} onChange={(value) => updateField('contentVisibility.places.birthPlace', value)} />
              <Checkbox label={t.marriagePlace || 'Marriage Place'} value={contentVisibility.places.marriagePlace} onChange={(value) => updateField('contentVisibility.places.marriagePlace', value)} />
              <Checkbox label={t.burialPlace || 'Burial Place'} value={contentVisibility.places.burialPlace} onChange={(value) => updateField('contentVisibility.places.burialPlace', value)} />
            </div>
          ) : null}
        </div>
      </div>
    </SectionShell>
  );
});
