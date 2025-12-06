import React, { memo } from 'react';
import { 
  Calculator, Activity, ShieldCheck, Calendar, BookOpen, Map
} from 'lucide-react';
import { DropdownContent, DropdownMenuItem, DropdownMenuDivider, DropdownMenuHeader } from '../ui/DropdownMenu';
import { ToolsMenuProps } from '../../types';
import { useTranslation } from '../../context/TranslationContext';

export const ToolsMenu = memo(({
    onClose, onOpenModal
}: ToolsMenuProps) => {
    const { t } = useTranslation();

    return (
        <DropdownContent className="w-64" onClose={onClose}>
            <DropdownMenuItem 
                onClick={() => onOpenModal('story')}
                icon={<BookOpen className="w-3.5 h-3.5"/>}
                colorClass="mb-1 !bg-amber-50 dark:!bg-amber-900/10 hover:!bg-amber-100 dark:hover:!bg-amber-900/30 !text-amber-800 dark:!text-amber-200"
                iconBgClass="bg-amber-100 dark:bg-amber-900/50"
                iconTextColorClass="text-amber-600 dark:text-amber-400"
            >
                {t.familyStory}
            </DropdownMenuItem>
            
            <DropdownMenuDivider />
            
            <DropdownMenuItem onClick={() => onOpenModal('map')} icon={<Map className="w-3.5 h-3.5"/>} iconBgClass="!bg-green-50 dark:!bg-green-900/20" iconTextColorClass="!text-green-600">
                {t.viewOnMap}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onOpenModal('timeline')} icon={<Calendar className="w-3.5 h-3.5"/>} iconBgClass="!bg-blue-50 dark:!bg-blue-900/20" iconTextColorClass="!text-blue-500">
                {t.familyTimelineHeader}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onOpenModal('stats')} icon={<Activity className="w-3.5 h-3.5"/>} iconBgClass="!bg-emerald-50 dark:!bg-emerald-900/20" iconTextColorClass="!text-emerald-500">
                {t.familyStatistics}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onOpenModal('consistency')} icon={<ShieldCheck className="w-3.5 h-3.5"/>} iconBgClass="!bg-orange-50 dark:!bg-orange-900/20" iconTextColorClass="!text-orange-500">
                {t.consistencyChecker}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onOpenModal('calculator')} icon={<Calculator className="w-3.5 h-3.5"/>} iconBgClass="!bg-indigo-50 dark:!bg-indigo-900/20" iconTextColorClass="!text-indigo-500">
                {t.relationshipCalculator}
            </DropdownMenuItem>
        </DropdownContent>
    );
});