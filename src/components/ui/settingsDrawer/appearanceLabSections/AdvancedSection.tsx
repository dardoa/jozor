import React from 'react';
import { SlidersHorizontal, Type, Waypoints } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useTreeAppearanceStore } from '../../../../store/useTreeAppearanceStore';
import {
  Checkbox,
  formatBranchPersonLabel,
  LINE_STYLE_OPTIONS,
  NODE_COLOR_LOGIC_OPTIONS,
  SliderField,
  type SettingsTextOptions,
  type SettingsTranslator,
} from '../shared';
import { activeStyle, inactiveStyle, SectionShell, valueTone } from './sectionStyles';
import type { AdvancedTabId, AppearanceLabPerson, SectionId } from './types';

export const AdvancedSection = React.memo(({
  open,
  onToggle,
  advancedTab,
  setAdvancedTab,
  settingsText,
  t,
  sortedPeople,
  unnamedPersonLabel,
}: {
  open: boolean;
  onToggle: (id: SectionId) => void;
  advancedTab: AdvancedTabId;
  setAdvancedTab: React.Dispatch<React.SetStateAction<AdvancedTabId>>;
  settingsText: SettingsTextOptions & Record<string, string>;
  t: SettingsTranslator;
  sortedPeople: AppearanceLabPerson[];
  unnamedPersonLabel: string;
}) => {
  const { treeMode, advanced } = useTreeAppearanceStore(
    useShallow((state) => ({ treeMode: state.coreEngine.treeMode, advanced: state.advanced }))
  );
  const updateField = useTreeAppearanceStore((state) => state.updateField);

  return (
    <SectionShell
      id="advanced"
      icon={SlidersHorizontal}
      title={settingsText.advancedSettings || 'Advanced Settings'}
      caption={`${settingsText.engine || 'Engine'} • ${settingsText.details || 'Details'} • ${settingsText.performance || 'Performance'}`}
      open={open}
      onToggle={onToggle}
    >
      <div className="flex overflow-x-auto rounded-2xl bg-white/35 p-1 whitespace-nowrap scrollbar-hide">
        {(['engine', 'details', 'performance'] as const).map((tab) => (
          <button key={tab} type="button" onClick={() => setAdvancedTab(tab)} className="min-h-11 flex-1 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200" style={advancedTab === tab ? activeStyle : inactiveStyle}>
            {settingsText[tab] || tab}
          </button>
        ))}
      </div>
      {advancedTab === 'engine' ? (
        <div className="space-y-4">
          <div className="rounded-[20px] bg-white/28 p-4 text-[12px] leading-relaxed text-[var(--text-muted)] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
            {settingsText.layoutEngine || 'Layout Engine'}
          </div>
        </div>
      ) : null}
      {advancedTab === 'details' ? (
        <div className="space-y-4">
          <div className="grid gap-3 rounded-[20px] bg-white/28 p-3 shadow-[0_2px_10px_rgba(0,0,0,0.02)] sm:grid-cols-2">
            <SliderField label={t.settings.textSize} value={advanced.nodeDetails.textSize} onChange={(value) => updateField('advanced.nodeDetails.textSize', value)} min={8} max={20} step={1} unit="px" icon={Type} valueLabel={valueTone(advanced.nodeDetails.textSize, 8, 20)} />
            <SliderField label={t.settings.visibleGenerations} value={advanced.nodeDetails.generationLimit} onChange={(value) => updateField('advanced.nodeDetails.generationLimit', value)} min={1} max={10} step={1} unit="" icon={Waypoints} valueLabel={`${advanced.nodeDetails.generationLimit}`} />
            <Checkbox label={settingsText.compactNodes || 'Compact Nodes'} value={advanced.nodeDetails.compactNodes} onChange={(value) => updateField('advanced.nodeDetails.compactNodes', value)} />
          </div>
          {treeMode !== 'radial' ? (
            <>
              <div className="grid grid-cols-3 gap-2">
                {LINE_STYLE_OPTIONS.map((styleOption) => (
                  <button key={styleOption} type="button" onClick={() => updateField('advanced.nodeDetails.lineStyle', styleOption)} className="min-h-11 rounded-xl px-3 py-2 text-[11px] font-semibold transition-all duration-200" style={advanced.nodeDetails.lineStyle === styleOption ? activeStyle : inactiveStyle}>
                    {(settingsText.lineStyleOptions?.[styleOption] ?? styleOption) as string}
                  </button>
                ))}
              </div>
              <SliderField label={t.settings.lineThickness} value={advanced.nodeDetails.lineThickness} onChange={(value) => updateField('advanced.nodeDetails.lineThickness', value)} min={1} max={6} step={1} unit="px" icon={SlidersHorizontal} valueLabel={valueTone(advanced.nodeDetails.lineThickness, 1, 6)} />
            </>
          ) : null}
          <div className="grid grid-cols-3 gap-2">
            {NODE_COLOR_LOGIC_OPTIONS.map((logic) => (
              <button key={logic} type="button" onClick={() => updateField('advanced.nodeDetails.boxColorLogic', logic)} className="min-h-11 rounded-xl px-3 py-2 text-[11px] font-semibold transition-all duration-200" style={advanced.nodeDetails.boxColorLogic === logic ? activeStyle : inactiveStyle}>
                {(settingsText.nodeColorLogicOptions?.[logic] || logic) as string}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {advancedTab === 'performance' ? (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
              {settingsText.focusOptions || 'Focus Options'}
            </div>
            <Checkbox label={t.settings.highlightFocus} value={advanced.layoutEngine.highlightBranch} onChange={(value) => updateField('advanced.layoutEngine.highlightBranch', value)} />
            {advanced.layoutEngine.highlightBranch ? (
              <select value={advanced.layoutEngine.highlightedBranchRootId || '__focus__'} onChange={(event) => updateField('advanced.layoutEngine.highlightedBranchRootId', event.target.value === '__focus__' ? null : event.target.value)} className="ds-input w-full">
                <option value="__focus__">{settingsText.currentFocusRoot || 'Current focus person'}</option>
                {sortedPeople.map((person) => (
                  <option key={person.id} value={person.id}>
                    {formatBranchPersonLabel(person, unnamedPersonLabel)}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        </div>
      ) : null}
    </SectionShell>
  );
});
