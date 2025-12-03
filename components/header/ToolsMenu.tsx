import React, { memo } from 'react';
import { 
  Calculator, Hammer, Activity, ShieldCheck, Calendar, BookOpen, Map
} from 'lucide-react';
import { DropdownMenuContainer, DropdownMenuItem, DropdownMenuDivider } from '../ui/DropdownMenu';

export const ToolsMenu = memo(({
    onClose, onOpenModal, t
}: {
    onClose: () => void;
    onOpenModal: (modalType: 'calculator' | 'stats' | 'chat' | 'consistency' | 'timeline' | 'share' | 'story' | 'map') => void;
    t: any;
}) => (
    <>
        <div className="fixed inset-0 z-10" onClick={onClose}></div>
        <DropdownMenuContainer className="end-0 w-64">
            <DropdownMenuItem 
                onClick={() => { onOpenModal('story'); onClose(); }}
                icon={<BookOpen className="w-3.5 h-3.5"/>}
                label={t.familyStory}
                colorClass="mb-1 !bg-amber-50 dark:!bg-amber-900/10 hover:!bg-amber-100 dark:hover:!bg-amber-900/30 !text-amber-800 dark:!text-amber-200"
                iconBgClass="bg-amber-100 dark:bg-amber-900/50"
                iconTextColorClass="text-amber-600 dark:text-amber-400"
            />
            
            <DropdownMenuDivider />
            
            <DropdownMenuItem onClick={() => { onOpenModal('map'); onClose(); }} icon={<Map className="w-3.5 h-3.5"/>} iconBgClass="!bg-green-50 dark:!bg-green-900/20" iconTextColorClass="!text-green-600">
                {t.viewOnMap}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { onOpenModal('timeline'); onClose(); }} icon={<Calendar className="w-3.5 h-3.5"/>} iconBgClass="!bg-blue-50 dark:!bg-blue-900/20" iconTextColorClass="!text-blue-500">
                {t.familyTimeline}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { onOpenModal('stats'); onClose(); }} icon={<Activity className="w-3.5 h-3.5"/>} iconBgClass="!bg-emerald-50 dark:!bg-emerald-900/20" iconTextColorClass="!text-emerald-500">
                {t.familyStatistics}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { onOpenModal('consistency'); onClose(); }} icon={<ShieldCheck className="w-3.5 h-3.5"/>} iconBgClass="!bg-orange-50 dark:!bg-orange-900/20" iconTextColorClass="!text-orange-500">
                {t.consistencyChecker}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { onOpenModal('calculator'); onClose(); }} icon={<Calculator className="w-3.5 h-3.5"/>} iconBgClass="!bg-indigo-50 dark:!bg-indigo-900/20" iconTextColorClass="!text-indigo-500">
                {t.relationshipCalculator}
            </DropdownMenuItem>
        </DropdownMenuContainer>
    </>
));