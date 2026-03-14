import { memo } from 'react';
import { Calculator, Activity, ShieldCheck, Calendar, BookOpen, Map } from 'lucide-react';
import { DropdownContent, DropdownMenuItem, DropdownMenuDivider, DropdownMenuHeader } from '../ui/DropdownMenu';
import { ToolsMenuProps } from '../../types';
import { useTranslation } from '../../context/TranslationContext';

export const ToolsMenu = memo(({ onClose, onOpenModal }: ToolsMenuProps) => {
  const { t } = useTranslation();

  return (
    <DropdownContent className='w-64' onClose={onClose} aria-label={t.header.toolsMenuAria}>

      {/* Category 1: Content & Visualization */}
      <DropdownMenuHeader label={t.header.categories.viewAndStory} />

      <DropdownMenuItem
        onClick={() => onOpenModal('story')}
        icon={<BookOpen className='w-3.5 h-3.5' />}
        label={t.header.familyStory}
        colorClass='mb-1 !bg-amber-500/5 hover:!bg-amber-500/10 !text-amber-600 dark:!text-amber-400'
        iconBgClass='bg-amber-500/10'
        iconTextColorClass='text-amber-600'
      />
      <DropdownMenuItem
        id="geomap-tool-item"
        onClick={() => onOpenModal('map')}
        icon={<Map className='w-3.5 h-3.5' />}
        label={t.header.viewOnMap}
        iconBgClass='!bg-green-500/10'
        iconTextColorClass='!text-green-600'
      />
      <DropdownMenuItem
        onClick={() => onOpenModal('timeline')}
        icon={<Calendar className='w-3.5 h-3.5' />}
        label={t.header.familyTimelineHeader}
        iconBgClass='!bg-blue-500/10'
        iconTextColorClass='!text-blue-500'
      />

      <DropdownMenuDivider />

      {/* Category 2: Analysis & Insights */}
      <DropdownMenuHeader label={t.header.categories.analysisAndInsights} />

      <DropdownMenuItem
        onClick={() => onOpenModal('stats')}
        icon={<Activity className='w-3.5 h-3.5' />}
        label={t.familyStatistics}
        iconBgClass='!bg-emerald-500/10'
        iconTextColorClass='!text-emerald-500'
      />
      <DropdownMenuItem
        onClick={() => onOpenModal('consistency')}
        icon={<ShieldCheck className='w-3.5 h-3.5' />}
        label={t.consistencyChecker}
        iconBgClass='!bg-orange-500/10'
        iconTextColorClass='!text-orange-500'
      />
      <DropdownMenuItem
        onClick={() => onOpenModal('calculator')}
        icon={<Calculator className='w-3.5 h-3.5' />}
        label={t.relationshipCalculator}
        iconBgClass='!bg-indigo-500/10'
        iconTextColorClass='!text-indigo-500'
      />
    </DropdownContent>
  );
});
