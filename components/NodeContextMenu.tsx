import React, { useEffect, useRef, useState } from 'react';
import {
    UserPlus,
    UserMinus,
    Edit3,
    Image,
    BookOpen,
    Trash2,
    Star,
    UserRound,
    Heart,
    Baby,
    ChevronRight,
    ArrowLeft,
    Settings2
} from 'lucide-react';
import { Person, Gender, ModalType } from '../types';
import { useTranslation } from '../context/TranslationContext';
import { DropdownContent, DropdownMenuItem, DropdownMenuDivider, DropdownMenuHeader } from './ui/DropdownMenu';

interface NodeContextMenuProps {
    person: Person;
    x: number;
    y: number;
    onClose: () => void;
    onAddRelation: (type: 'parent' | 'spouse' | 'child', gender: Gender) => void;
    onEditProfile: (id: string) => void;
    onViewGallery: (id: string) => void;
    onOpenModal: (type: ModalType) => void;
    onDeletePerson: (id: string) => void;
    onSetAsRoot: (id: string) => void;
    currentUserRole: 'owner' | 'editor' | 'viewer' | null;
}

export const NodeContextMenu: React.FC<NodeContextMenuProps> = ({
    person,
    x,
    y,
    onClose,
    onAddRelation,
    onEditProfile,
    onViewGallery,
    onOpenModal,
    onDeletePerson,
    onSetAsRoot,
    currentUserRole
}) => {
    const { t, language } = useTranslation();
    const menuRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<'main' | 'addRelative' | 'management'>('main');

    const isOwner = currentUserRole === 'owner';
    const isViewer = currentUserRole === 'viewer';
    const canEdit = isOwner || currentUserRole === 'editor';
    const isRTL = language === 'ar';

    // Handle click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    // Handle escape to close
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const MenuHeader = ({ label, showBack = false }: { label: string, showBack?: boolean }) => (
        <div className="px-4 py-3 border-b border-[var(--border-main)] mb-1 flex items-center gap-3">
            {showBack && (
                <button
                    onClick={(e) => { e.stopPropagation(); setView('main'); }}
                    className="p-1 hover:bg-white/10 rounded-lg text-[var(--text-dim)]"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                </button>
            )}
            <div>
                <p className="text-[10px] uppercase tracking-widest text-[var(--text-dim)] font-black">
                    {showBack ? (t.backToPerson || 'Back') : (person.firstName + ' ' + person.lastName)}
                </p>
                <h3 className="font-bold text-xs text-[var(--text-main)] truncate">
                    {label}
                </h3>
            </div>
        </div>
    );

    return (
        <div
            ref={menuRef}
            className="fixed z-[999] min-w-[240px] animate-in fade-in zoom-in-95 duration-200"
            style={{
                top: Math.min(y, window.innerHeight - 300),
                left: isRTL ? undefined : Math.min(x, window.innerWidth - 260),
                right: isRTL ? Math.max(window.innerWidth - x, 20) : undefined
            }}
        >
            <DropdownContent className="shadow-2xl border-white/10 bg-stone-900/95 backdrop-blur-2xl !p-0 overflow-hidden rounded-2xl">

                {view === 'main' && (
                    <div className={`animate-in duration-200 ${isRTL ? 'slide-in-from-left-1' : 'slide-in-from-right-1'}`}>
                        <MenuHeader label={t.personActions || 'Person Actions'} />

                        <div className="p-1 space-y-0.5">
                            <DropdownMenuItem
                                onClick={() => onEditProfile(person.id)}
                                icon={<Edit3 className="w-3.5 h-3.5" />}
                                iconBgClass="!bg-indigo-500/10"
                                iconTextColorClass="!text-indigo-400"
                                label={t.editDetails}
                            />

                            <DropdownMenuItem
                                onClick={() => setView('addRelative')}
                                icon={<UserPlus className="w-3.5 h-3.5" />}
                                label={t.addRelative || 'Add Relative...'}
                                rightElement={<ChevronRight className="w-3 h-3 text-white/20" />}
                            />

                            <DropdownMenuItem
                                onClick={() => onViewGallery(person.id)}
                                icon={<Image className="w-3.5 h-3.5" />}
                                iconBgClass="!bg-purple-500/10"
                                iconTextColorClass="!text-purple-400"
                                label={t.viewGallery || 'View Gallery'}
                            />

                            <DropdownMenuItem
                                onClick={() => onOpenModal('story')}
                                icon={<BookOpen className="w-3.5 h-3.5" />}
                                iconBgClass="!bg-amber-500/10"
                                iconTextColorClass="!text-amber-400"
                                label={t.familyStory}
                            />

                            <DropdownMenuDivider />

                            <DropdownMenuItem
                                onClick={() => setView('management')}
                                icon={<Settings2 className="w-3.5 h-3.5" />}
                                label={t.management || 'Management...'}
                                rightElement={<ChevronRight className="w-3 h-3 text-white/20" />}
                            />
                        </div>
                    </div>
                )}

                {view === 'addRelative' && (
                    <div className={`animate-in duration-200 ${isRTL ? 'slide-in-from-right-1' : 'slide-in-from-left-1'}`}>
                        <MenuHeader label={t.addRelativeTitle || 'Add Connectivity'} showBack />
                        <div className="p-1 space-y-0.5">
                            <DropdownMenuItem
                                onClick={() => onAddRelation('parent', 'male')}
                                disabled={isViewer}
                                icon={<UserRound className="w-3.5 h-3.5" />}
                                label={t.addFather}
                            />
                            <DropdownMenuItem
                                onClick={() => onAddRelation('parent', 'female')}
                                disabled={isViewer}
                                icon={<UserRound className="w-3.5 h-3.5" />}
                                label={t.addMother}
                            />
                            <DropdownMenuItem
                                onClick={() => onAddRelation('spouse', person.gender === 'male' ? 'female' : 'male')}
                                disabled={isViewer}
                                icon={<Heart className="w-3.5 h-3.5" />}
                                label={t.addSpouse}
                            />
                            <DropdownMenuDivider />
                            <DropdownMenuItem
                                onClick={() => onAddRelation('child', 'male')}
                                disabled={isViewer}
                                icon={<Baby className="w-3.5 h-3.5" />}
                                label={t.addChild || t.addSon || 'Add Son'}
                            />
                            <DropdownMenuItem
                                onClick={() => onAddRelation('child', 'female')}
                                disabled={isViewer}
                                icon={<Baby className="w-3.5 h-3.5" />}
                                label={t.addDaughter || 'Add Daughter'}
                            />
                        </div>
                    </div>
                )}

                {view === 'management' && (
                    <div className={`animate-in duration-200 ${isRTL ? 'slide-in-from-right-1' : 'slide-in-from-left-1'}`}>
                        <MenuHeader label={t.nodeManagement || 'Node Management'} showBack />
                        <div className="p-1 space-y-0.5">
                            <DropdownMenuItem
                                onClick={() => onSetAsRoot(person.id)}
                                disabled={!canEdit}
                                icon={<Star className="w-3.5 h-3.5" />}
                                iconBgClass="!bg-yellow-500/20"
                                iconTextColorClass="!text-yellow-400"
                                label={t.setAsRoot || 'Set as Root'}
                            />
                            <DropdownMenuDivider />
                            <DropdownMenuItem
                                onClick={() => onDeletePerson(person.id)}
                                disabled={!isOwner}
                                icon={<Trash2 className="w-3.5 h-3.5" />}
                                iconBgClass="!bg-red-500/20"
                                iconTextColorClass="!text-red-400"
                                colorClass="text-red-400 hover:bg-red-500/10"
                                label={t.deletePerson}
                            />
                        </div>
                    </div>
                )}
            </DropdownContent>
        </div>
    );
};
