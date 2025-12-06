import React, { memo } from 'react';
import { Person } from '../../types';
import { Trash2, Check, Edit2 } from 'lucide-react';
import { useTranslation } from '../../context/TranslationContext';

interface SidebarFooterProps {
    person: Person;
    isEditing: boolean;
    setIsEditing: (v: boolean) => void;
    onDelete: (id: string) => void;
}

export const SidebarFooter: React.FC<SidebarFooterProps> = memo(({
    person, isEditing, setIsEditing, onDelete
}) => {
    const { t } = useTranslation();

    const handleDelete = () => {
        if (window.confirm(t.personDeleteConfirm)) {
            onDelete(person.id);
        }
    };

    return (
        <div className="bg-white dark:bg-stone-900 border-t border-stone-200/50 dark:border-stone-800/50 flex flex-col shadow-sm relative z-10 p-3">

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