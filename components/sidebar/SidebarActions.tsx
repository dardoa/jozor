import React, { memo } from 'react';
import { FamilyActionsProps } from '../../types';
import { Heart, Baby, ArrowUp } from 'lucide-react';
import { useTranslation } from '../../context/TranslationContext';
import { QuickAddSpeedDial } from '../ui/QuickAddSpeedDial';

interface SidebarActionsProps {
    familyActions: FamilyActionsProps;
}

export const SidebarActions: React.FC<SidebarActionsProps> = memo(({ familyActions }) => {
    const { t } = useTranslation();

    const quickAddActions = [
        {
            onClick: () => familyActions.onAddParent('male'),
            icon: <ArrowUp className="w-3 h-3"/>,
            colorClasses: "bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400",
            label: t.addFather
        },
        {
            onClick: () => familyActions.onAddParent('female'),
            icon: <ArrowUp className="w-3 h-3"/>,
            colorClasses: "bg-pink-50 text-pink-600 hover:bg-pink-100 dark:bg-pink-900/30 dark:text-pink-400",
            label: t.addMother
        },
        {
            onClick: () => familyActions.onAddSpouse('male'),
            icon: <Heart className="w-3 h-3"/>,
            colorClasses: "bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400",
            label: t.addHusband
        },
        {
            onClick: () => familyActions.onAddSpouse('female'),
            icon: <Heart className="w-3 h-3"/>,
            colorClasses: "bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400",
            label: t.addWife
        },
        {
            onClick: () => familyActions.onAddChild('male'),
            icon: <Baby className="w-3 h-3"/>,
            colorClasses: "bg-teal-50 text-teal-600 hover:bg-teal-100 dark:bg-teal-900/30 dark:text-teal-400",
            label: t.addSon
        },
        {
            onClick: () => familyActions.onAddChild('female'),
            icon: <Baby className="w-3 h-3"/>,
            colorClasses: "bg-orange-50 text-orange-600 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400",
            label: t.addDaughter
        },
    ];

    return (
        <div className="flex justify-center p-3 bg-white dark:bg-stone-900 border-t border-stone-200/50 dark:border-stone-800/50 relative z-10">
            <QuickAddSpeedDial actions={quickAddActions} />
        </div>
    );
});