import React, { memo } from 'react';
import { Person, Gender, FamilyActionsProps } from '../../types'; // Added FamilyActionsProps
import { Heart, Baby, Trash2, Check, Edit2, UserPlus, ArrowUp, ArrowDown } from 'lucide-react';
import { useTranslation } from '../../context/TranslationContext'; // Import useTranslation

interface SidebarFooterProps {
    person: Person;
    isEditing: boolean;
    setIsEditing: (v: boolean) => void;
    onDelete: (id: string) => void;
    // Removed t: any;
    familyActions: FamilyActionsProps; // New grouped prop
}

export const SidebarFooter: React.FC<SidebarFooterProps> = memo(({ 
    person, isEditing, setIsEditing, onDelete,
    familyActions // Destructure new grouped prop
}) => {
    const { t } = useTranslation(); // Use useTranslation hook directly
    
    // Helper for circular add buttons
    const QuickAddButton = ({ onClick, icon, color, label }: { onClick: () => void, icon: React.ReactNode, color: string, label: string }) => (
        <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-sm border border-transparent hover:shadow-md active:scale-95 ${color}`}
            title={label}
        > {/* Reduced w-8 h-8 to w-7 h-7 */}
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
        <div className="bg-white dark:bg-stone-900 border-t border-stone-200/50 dark:border-stone-800/50 flex flex-col shadow-sm relative z-10 p-3"> {/* Reduced p-4 to p-3 */}
            
            {/* Quick Add Actions Bar */}
            <div className="flex justify-center gap-3 mb-3"> {/* Reduced gap-4 to gap-3 and mb-4 to mb-3 */}
                <div className="flex gap-2"> {/* Reduced gap-2 to gap-1.5 */}
                     <QuickAddButton 
                        onClick={() => familyActions.onAddParent('male')} 
                        icon={<ArrowUp className="w-3 h-3"/>}
                        color="bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400"
                        label={t.addFather}
                     />
                     <QuickAddButton 
                        onClick={() => familyActions.onAddParent('female')} 
                        icon={<ArrowUp className="w-3 h-3"/>}
                        color="bg-pink-50 text-pink-600 hover:bg-pink-100 dark:bg-pink-900/30 dark:text-pink-400"
                        label={t.addMother}
                     />
                </div>

                <div className="w-px bg-stone-200 dark:bg-stone-700 h-7 mx-1"></div> {/* Reduced h-8 to h-7 */}

                <div className="flex gap-2"> {/* Reduced gap-2 to gap-1.5 */}
                     <QuickAddButton 
                        onClick={() => familyActions.onAddSpouse('male')} 
                        icon={<Heart className="w-3 h-3"/>}
                        color="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400"
                        label={t.addHusband}
                     />
                     <QuickAddButton 
                        onClick={() => familyActions.onAddSpouse('female')} 
                        icon={<Heart className="w-3 h-3"/>}
                        color="bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400"
                        label={t.addWife}
                     />
                </div>

                <div className="w-px bg-stone-200 dark:bg-stone-700 h-7 mx-1"></div> {/* Reduced h-8 to h-7 */}

                <div className="flex gap-2"> {/* Reduced gap-2 to gap-1.5 */}
                     <QuickAddButton 
                        onClick={() => familyActions.onAddChild('male')} 
                        icon={<Baby className="w-3 h-3"/>}
                        color="bg-teal-50 text-teal-600 hover:bg-teal-100 dark:bg-teal-900/30 dark:text-teal-400"
                        label={t.addSon}
                     />
                     <QuickAddButton 
                        onClick={() => familyActions.onAddChild('female')} 
                        icon={<Baby className="w-3 h-3"/>}
                        color="bg-orange-50 text-orange-600 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400"
                        label={t.addDaughter}
                     />
                </div>
            </div>

            {/* Main Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-800"> {/* Reduced pt-4 to pt-3 */}
                <button
                    type="button"
                    onClick={handleDelete}
                    className="flex items-center gap-2 px-2.5 py-1 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm font-bold"
                > {/* Reduced px-3 py-1.5 to px-2.5 py-1 */}
                    <Trash2 className="w-3.5 h-3.5" /> {/* Reduced w-4 h-4 to w-3.5 h-3.5 */}
                    <span>{t.deletePerson}</span>
                </button>

                {isEditing ? (
                    <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 text-white rounded-full shadow-md hover:bg-emerald-700 transition-colors font-bold text-sm"
                    > {/* Reduced px-5 py-2 to px-4 py-1.5 */}
                        <Check className="w-3.5 h-3.5 stroke-[3]" /> {/* Reduced w-4 h-4 to w-3.5 h-3.5 */}
                        {t.saveChanges}
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 px-4 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 rounded-full shadow-sm hover:border-teal-400 dark:hover:border-teal-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors font-bold text-sm"
                    > {/* Reduced px-5 py-2 to px-4 py-1.5 */}
                        <Edit2 className="w-3 h-3" /> {/* Reduced w-3.5 h-3.5 to w-3 h-3 */}
                        {t.editDetails}
                    </button>
                )}
            </div>
        </div>
    );
});