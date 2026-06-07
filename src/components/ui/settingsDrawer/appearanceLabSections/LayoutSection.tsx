import React from 'react';
import { Grid3X3, LayoutTemplate, MoveHorizontal, MoveVertical, Waypoints } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../../../store/useAppStore';
import { SectionHeader, SliderField, type SettingsTextOptions, type SettingsTranslator } from '../shared';
import { SectionShell, valueTone } from './sectionStyles';
import type { SectionId } from './types';

export const LayoutSection = React.memo(({ open, onToggle, settingsText, t }: { open: boolean; onToggle: (id: SectionId) => void; settingsText: SettingsTextOptions; t: SettingsTranslator }) => {
  // READ: from appearanceSlice
  const { zoom, horizontalSpread, verticalSpread } = useAppStore(
    useShallow((state) => ({ zoom: state.appearance.layout.zoom, horizontalSpread: state.appearance.layout.horizontalSpread, verticalSpread: state.appearance.layout.verticalSpread }))
  );
  // WRITE: directly to appearanceSlice
  const updateField = useAppStore((state) => state.updateAppearanceField);

  return (
    <SectionShell
      id="layout"
      icon={LayoutTemplate}
      title={settingsText.layout || 'Layout & Spacing'}
      caption={`${settingsText.zoomLevel || 'Zoom'} • ${settingsText.spacing || 'Spacing'}`}
      open={open}
      onToggle={onToggle}
    >
      <div className="space-y-6">
        <SectionHeader icon={Grid3X3} label={settingsText.zoomLevel || 'Zoom'} t={t} />
        <div className="rounded-[20px] bg-white/28 p-3 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <SliderField label={settingsText.zoomLevel || 'Zoom'} value={zoom} onChange={(value) => updateField('layout.zoom', value)} min={120} max={300} step={10} unit="px" icon={Grid3X3} valueLabel={`${settingsText.zoomLevel || 'Zoom'}: ${valueTone(zoom, 120, 300)}`} />
        </div>
      </div>
      <div className="space-y-6">
        <SectionHeader icon={Waypoints} label={settingsText.spacing || 'Spacing'} t={t} />
        <div className="grid gap-3 rounded-[20px] bg-white/28 p-3 shadow-[0_2px_10px_rgba(0,0,0,0.02)] sm:grid-cols-2">
          <SliderField label={settingsText.horizontalSpread || 'Horizontal Spread'} value={horizontalSpread} onChange={(value) => updateField('layout.horizontalSpread', value)} min={40} max={400} step={10} unit="px" icon={MoveHorizontal} valueLabel={`${settingsText.horizontalSpread || 'Horizontal Spread'}: ${valueTone(horizontalSpread, 40, 400)}`} />
          <SliderField label={settingsText.verticalSpread || 'Vertical Spread'} value={verticalSpread} onChange={(value) => updateField('layout.verticalSpread', value)} min={40} max={400} step={10} unit="px" icon={MoveVertical} valueLabel={`${settingsText.verticalSpread || 'Vertical Spread'}: ${valueTone(verticalSpread, 40, 400)}`} />
        </div>
      </div>
    </SectionShell>
  );
});
