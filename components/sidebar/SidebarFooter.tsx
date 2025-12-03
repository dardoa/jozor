import React, { memo } from 'react';
import { Person, Gender } from '../../types';
import { Heart, Baby, Trash2, Check, Edit2, UserPlus, ArrowUp, ArrowDown } from 'lucide-react';

interface SidebarFooterProps {
    person: Person;
    isEditing: boolean;
    setIsEditing: (v: boolean) => void;
    onAddParent: (g: Gender) => void;
    onAddSpouse: (g: Gender) => void;
    onAddChild: (g: Gender) => void;
    onDelete: (id: string) => void;
    t: any;
}

export const SidebarFooter: React.FC<SidebarFooterProps> = memo(({ 
    person, isEditing, setIsEditing, onAddParent, onAddSpouse, onAddChild, onDelete, t 
}) => {
    
    // Helper for circular add buttons
    const QuickAddButton = ({ onClick, icon, color, label }: { onClick: () => void, icon: React.ReactNode, color: string, label: string }) => (
        <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-sm border border-transparent hover:shadow-md active:scale-95 ${color}`}
            title={label}
        >
            {icon}
        </button>
    );

    // Completely new delete handler
    const handleDelete = () => {
        if (window.confirm(t.personDeleteConfirm)) { // Using specific translation key
            onDelete(person.id);
        }
    };

    return (
        <div className="bg-white dark:bg-stone-900 border-t border-stone-200/50 dark:border-stone-800/50 flex flex-col shadow-sm relative z-10 p-4">
            
            {/* Quick Add Actions Bar */}
            <div className="flex justify-center gap-4 mb-4">
                <div className="flex gap-2">
                     <QuickAddButton 
                        onClick={() => onAddParent('male')} 
                        icon={<ArrowUp className="w-4 h-4"/>}
                        color="bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400"
                        label={t.addFather}
                     />
                     <QuickAddButton 
                        onClick={() => onAddParent('female')} 
                        icon={<ArrowUp className="w-4 h-4"/>}
                        color="bg-pink-50 text-pink-600 hover:bg-pink-100 dark:bg-pink-900/30 dark:text-pink-400"
                        label={t.addMother}
                     />
                </div>

                <div className="w-px bg-stone-200 dark:bg-stone-700 h-9 mx-1"></div>

                <div className="flex gap-2">
                     <QuickAddButton 
                        onClick={() => onAddSpouse('male')} 
                        icon={<Heart className="w-4 h-4"/>}
                        color="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400"
                        label={t.addHusband}
                     />
                     <QuickAddButton 
                        onClick={() => onAddSpouse('female')} 
                        icon={<Heart className="w-4 h-4"/>}
                        color="bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400"
                        label={t.addWife}
                     />
                </div>

                <div className="w-px bg-stone-200 dark:bg-stone-700 h-9 mx-1"></div>

                <div className="flex gap-2">
                     <QuickAddButton 
                        onClick={() => onAddChild('male')} 
                        icon={<Baby className="w-4 h-4"/>}
                        color="bg-teal-50 text-teal-600 hover:bg-teal-100 dark:bg-teal-900/30 dark:text-teal-400"
                        label={t.addSon}
                     />
                     <QuickAddButton 
                        onClick={() => onAddChild('female')} 
                        icon={<Baby className="w-4 h-4"/>}
                        color="bg-orange-50 text-orange-600 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400"
                        label={t.addDaughter}
                     />
                </div>
            </div>

            {/* Main Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-stone-100 dark:border-stone-800">
                <button
                    type="button"
                    onClick={handleDelete}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm font-bold"
                >
                    <Trash2 className="w-4 h-4" />
                    <span>{t.deletePerson}</span>
                </button>

                {isEditing ? (
                    <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-full shadow-md hover:bg-emerald-700 transition-colors font-bold text-sm"
                    >
                        <Check className="w-4 h-4 stroke-[3]" />
                        {t.saveChanges}
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 px-6 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 rounded-full shadow-sm hover:border-teal-400 dark:hover:border-teal-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors font-bold text-sm"
                    >
                        <Edit2 className="w-3.5 h-3.5" />
                        {t.editDetails}
                    </button>
                )}
            </div>
        </div>
    );
});