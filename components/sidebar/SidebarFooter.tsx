import React, { memo } from 'react';
import { Person } from '../../types';
import { Trash2, Check, Edit2, FileX } from 'lucide-react'; // Import FileX icon
import { useTranslation } from '../../context/TranslationContext';

interface SidebarFooterProps {
    person: Person;
    isEditing: boolean;
    setIsEditing: (v: boolean) => void;
    onDelete: (id: string) => void;
    onOpenCleanTreeOptions: () => void; // Changed from onStartNewTree
}

export const SidebarFooter: React.FC<SidebarFooterProps> = memo(({
    person, isEditing, setIsEditing, onDelete, onOpenCleanTreeOptions
}) => {
    const { t } = useTranslation();

    const handleDelete = () => {
        if (window.confirm(t.personDeleteConfirm)) {
            onDelete(person.id);
        }
    };

    const handleCleanTree = () => {
        console.log('Clean Tree button clicked!'); // Debug log
        onOpenCleanTreeOptions(); // Open the new modal
    };

    return (
        <div className="bg-white dark:bg-stone-900 border-t border-stone-200/50 dark:border-stone-800/50 flex items-center justify-between shadow-sm relative z-10 p-3">

            {/* Delete Person Button */}
            <button
                type="button"
                onClick={handleDelete}
                className="w-10 h-10 flex items-center justify-center rounded-full text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors active:scale-95"
                title={t.deletePerson}
                aria-label={t.deletePerson}
            >
                <Trash2 className="w-5 h-5" />
            </button>

            {/* Clean Tree Button */}
            <button
                type="button"
                onClick={handleCleanTree}
                className="w-10 h-10 flex items-center justify-center rounded-full text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors active:scale-95"
                title={t.cleanTree}
                aria-label={t.cleanTree}
            >
                <FileX className="w-5 h-5" />
            </button>

            {/* Edit / Save Buttons */}
            {isEditing ? (
                <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="w-10 h-10 flex items-center justify-center bg-emerald-600  text-white rounded-full shadow-md hover:bg-emerald-700 transition-colors active:scale-95"
                    title={t.saveChanges}
                    aria-label={t.saveChanges}
                >
                    <Check className="w-5 h-5 stroke-[3]" />
                </button>
            ) : (
                <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="w-10 h-10 flex items-center justify-center bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 rounded-full shadow-sm hover:border-teal-400 dark:hover:border-teal-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors active:scale-95"
                    title={t.editDetails}
                    aria-label={t.editDetails}
                >
                    <Edit2 className="w-5 h-5" />
                </button>
            )}
        </div>
    );
});