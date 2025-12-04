import React, { memo } from 'react';
import { Person, Gender, FamilyActionsProps } from '../../types';
import { Heart, Baby, Trash2, Check, Edit2, UserPlus, ArrowUp, ArrowDown } from 'lucide-react';
import { useTranslation } from '../../context/TranslationContext';
import { QuickAddSpeedDial } from '../ui/QuickAddSpeedDial'; // New import

interface SidebarFooterProps {
    person: Person;
    isEditing: boolean;
    setIsEditing: (v: boolean) => void;
    onDelete: (id: string) => void;
    familyActions: FamilyActionsProps;
}

export const SidebarFooter: React.FC<SidebarFooterProps> = memo(({ 
    person, isEditing, setIsEditing, onDelete,
    familyActions
}) => {
    const { t } = useTranslation();
    
    // Completely new delete handler
    const handleDelete = () => {
        if (window.confirm(t.personDeleteConfirm)) {
            onDelete(person.id);
        }
    };

    // Define quick add actions for the Speed Dial
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
        <div className="bg-white dark:bg-stone-900 border-t border-stone-200/50 dark:border-stone-800/50 flex flex-col shadow-sm relative z-10 p-3">
            
            {/* Quick Add Actions Bar replaced by SpeedDial */}
            <div className="flex justify-center mb-3">
                <QuickAddSpeedDial actions={quickAddActions} />
            </div>

            {/* Main Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-800">
                <button
                    type="button"
                    onClick={handleDelete}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm font-bold active:scale-95"
                >
                    <Trash2 className="w-4 h-4" />
                    <span>{t.deletePerson}</span>
                </button>

                {isEditing ? (
                    <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-full shadow-md hover:bg-emerald-700 transition-colors font-bold text-sm active:scale-95"
                    >
                        <Check className="w-4 h-4 stroke-[3]" />
                        {t.saveChanges}
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 px-5 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 rounded-full shadow-sm hover:border-teal-400 dark:hover:border-teal-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors font-bold text-sm active:scale-95"
                    >
                        <Edit2 className="w-4 h-4" />
                        {t.editDetails}
                    </button>
                )}
            </div>
        </div>
    );
});