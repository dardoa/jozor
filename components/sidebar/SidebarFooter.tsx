
import React from 'react';
import { Person, Gender } from '../../types';
import { Heart, Baby, Trash2, Check, Edit2, UserPlus } from 'lucide-react';

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

export const SidebarFooter: React.FC<SidebarFooterProps> = ({ 
    person, isEditing, setIsEditing, onAddParent, onAddSpouse, onAddChild, onDelete, t 
}) => {
    
    // Helper for circular add buttons
    const QuickAddButton = ({ onClick, icon, color, label }: { onClick: () => void, icon: React.ReactNode, color: string, label: string }) => (
        <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shadow-sm border border-transparent hover:shadow-md active:scale-95 ${color}`}
            title={label}
        >
            {icon}
        </button>
    );

    // Completely new delete handler
    const handleDelete = () => {
        if (window.confirm(t.confirmDelete)) {
            onDelete(person.id);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex flex-col shadow-sm relative z-10">
            
            {/* Quick Add Actions Bar */}
            <div className="p-2 border-b border-gray-50 dark:border-gray-800 flex justify-center gap-4">
                <div className="flex gap-1">
                     <QuickAddButton 
                        onClick={() => onAddParent('male')} 
                        icon={<UserPlus className="w-4 h-4"/>}
                        color="bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400"
                        label={t.addFather}
                     />
                     <QuickAddButton 
                        onClick={() => onAddParent('female')} 
                        icon={<UserPlus className="w-4 h-4"/>}
                        color="bg-pink-50 text-pink-600 hover:bg-pink-100 dark:bg-pink-900/30 dark:text-pink-400"
                        label={t.addMother}
                     />
                </div>

                <div className="w-px bg-gray-200 dark:bg-gray-700 h-8 mx-1"></div>

                <div className="flex gap-1">
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

                <div className="w-px bg-gray-200 dark:bg-gray-700 h-8 mx-1"></div>

                <div className="flex gap-1">
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
            <div className="py-3 px-4 flex items-center justify-between bg-white dark:bg-gray-900">
                {/* NEW DELETE BUTTON */}
                <button
                    type="button"
                    onClick={handleDelete}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-xs font-bold"
                >
                    <Trash2 className="w-4 h-4" />
                    <span>{t.deletePerson}</span>
                </button>

                {isEditing ? (
                    <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-full shadow-md hover:bg-emerald-700 transition-colors font-bold text-xs"
                    >
                        <Check className="w-4 h-4 stroke-[3]" />
                        {t.saveChanges}
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 px-6 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-full shadow-sm hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-bold text-xs"
                    >
                        <Edit2 className="w-3.5 h-3.5" />
                        {t.editDetails}
                    </button>
                )}
            </div>
        </div>
    );
};
