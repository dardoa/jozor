import React, { useEffect, useRef, useState } from 'react';
import {
    Edit3,
    Star,
    UserRound,
    Heart,
    Baby,
    ChevronRight,
    ArrowLeft,
    Link as LinkIcon,
    Trash2,
    Eye,
} from 'lucide-react';
import { Person, Gender } from '../types';
import { useTranslation } from '../context/TranslationContext';
import { DropdownContent, DropdownMenuItem, DropdownMenuDivider } from './ui/DropdownMenu';

interface NodeContextMenuProps {
    person: Person;
    x: number;
    y: number;
    onClose: () => void;
    onAddRelation: (type: 'parent' | 'spouse' | 'child', gender: Gender) => void;
    onOpenDetails: (id: string, mode: 'view' | 'edit') => void;
    onLinkExisting: (type: 'parent' | 'spouse' | 'child', gender: Gender) => void;
    onSetAsRoot: (id: string) => void;
    onDelete: (id: string) => void;
    currentUserRole: 'owner' | 'editor' | 'viewer' | null;
}

const MenuHeader = ({ label, showBack = false, onBack, t, person }: { label: string, showBack?: boolean, onBack?: () => void, t: ReturnType<typeof useTranslation>['t'], person: Person }) => (
    <div className="px-4 py-3 border-b border-[var(--border-soft)] mb-1 flex items-center gap-3 bg-[var(--surface-subtle)]/85">
        {showBack && onBack && (
            <button
                onClick={(e) => { e.stopPropagation(); onBack(); }}
                aria-label={t.back}
                title={t.back}
                className="p-1.5 hover:bg-[var(--theme-hover)] rounded-lg text-[var(--text-dim)] transition-colors"
            >
                <ArrowLeft className="w-3.5 h-3.5" />
            </button>
        )}
        <div>
            <p className="ds-label">
                {showBack ? t.back : (person.firstName + ' ' + person.lastName)}
            </p>
            <h3 className="text-sm font-semibold text-[var(--text-main)] truncate">
                {label}
            </h3>
        </div>
    </div>
);

export const NodeContextMenu: React.FC<NodeContextMenuProps> = ({
    person,
    x,
    y,
    onClose,
    onAddRelation,
    onOpenDetails,
    onLinkExisting,
    onSetAsRoot,
    onDelete,
    currentUserRole
}) => {
    const { t, language } = useTranslation();
    const menuRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<'main' | 'linkExisting'>('main');

    // null = guest/local mode → same rights as owner locally
    const canEdit = currentUserRole === 'owner' || currentUserRole === 'editor' || currentUserRole === null;
    const isRtl = language === 'ar';
    const detailsLabel = canEdit ? t.editDetails : (((t as any).viewDetails as string | undefined) ?? 'View Details');
    const linkExistingLabel = ((t as any).linkExistingPerson as string | undefined) ?? 'Link Existing Person';
    const deleteLabel = t.deletePerson ?? 'Delete Person';
    const sonLabel = (t as any).addSon ?? ((t as any).addChild as string | undefined) ?? 'Add Son';
    const daughterLabel = (t as any).addDaughter ?? ((t as any).addChild as string | undefined) ?? 'Add Daughter';
    const estimatedMenuWidth = 260;
    const estimatedMenuHeight = view === 'linkExisting' ? 320 : 360;
    const clampedTop = Math.max(12, Math.min(y, window.innerHeight - estimatedMenuHeight));
    const clampedInlineOffset = Math.max(
        12,
        Math.min(
            isRtl ? window.innerWidth - x : x,
            window.innerWidth - estimatedMenuWidth - 12,
        ),
    );

    const runAndClose = (callback: () => void) => {
        onClose();
        callback();
    };

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

    return (
        <div
            ref={menuRef}
            className="fixed z-[var(--z-index-tips)] min-w-[244px] animate-in fade-in zoom-in-95 duration-200"
            style={{
                top: clampedTop,
                insetInlineStart: clampedInlineOffset,
            }}
        >
            <DropdownContent className="!p-0 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-soft)]">

                {view === 'main' && (
                    <div className="animate-in duration-200 slide-in-from-inline-end-1">
                        <MenuHeader label={t.personActions} t={t} person={person} />

                        <div className="p-1 space-y-0.5">
                            <DropdownMenuItem
                                onClick={() => runAndClose(() => onOpenDetails(person.id, canEdit ? 'edit' : 'view'))}
                                icon={canEdit ? <Edit3 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                iconBgClass="!bg-indigo-500/10"
                                iconTextColorClass="!text-indigo-400"
                                label={detailsLabel}
                            />

                            {canEdit && (
                                <>
                                    <DropdownMenuDivider />
                                    <DropdownMenuItem
                                        onClick={() => runAndClose(() => onAddRelation('parent', 'male'))}
                                        icon={<UserRound className="w-3.5 h-3.5" />}
                                        label={t.addFather}
                                    />
                                    <DropdownMenuItem
                                        onClick={() => runAndClose(() => onAddRelation('parent', 'female'))}
                                        icon={<UserRound className="w-3.5 h-3.5" />}
                                        label={t.addMother}
                                    />
                                    <DropdownMenuItem
                                        onClick={() => runAndClose(() => onAddRelation('spouse', person.gender === 'male' ? 'female' : 'male'))}
                                        icon={<Heart className="w-3.5 h-3.5" />}
                                        label={t.addSpouse}
                                    />
                                    <DropdownMenuItem
                                        onClick={() => runAndClose(() => onAddRelation('child', 'male'))}
                                        icon={<Baby className="w-3.5 h-3.5" />}
                                        label={sonLabel}
                                    />
                                    <DropdownMenuItem
                                        onClick={() => runAndClose(() => onAddRelation('child', 'female'))}
                                        icon={<Baby className="w-3.5 h-3.5" />}
                                        label={daughterLabel}
                                    />
                                    <DropdownMenuDivider />
                                    <DropdownMenuItem
                                        onClick={() => setView('linkExisting')}
                                        icon={<LinkIcon className="w-3.5 h-3.5" />}
                                        label={linkExistingLabel}
                                        rightElement={<ChevronRight className="w-3 h-3 text-[var(--text-muted)] rtl:rotate-180" />}
                                    />
                                    <DropdownMenuItem
                                        onClick={() => runAndClose(() => onSetAsRoot(person.id))}
                                        icon={<Star className="w-3.5 h-3.5" />}
                                        iconBgClass="!bg-yellow-500/20"
                                        iconTextColorClass="!text-yellow-400"
                                        label={t.setAsRoot}
                                    />
                                    <DropdownMenuItem
                                        onClick={() => runAndClose(() => onDelete(person.id))}
                                        icon={<Trash2 className="w-3.5 h-3.5" />}
                                        iconBgClass="!bg-red-500/15"
                                        iconTextColorClass="!text-red-500"
                                        label={deleteLabel}
                                    />
                                </>
                            )}
                        </div>
                    </div>
                )}

                {view === 'linkExisting' && (
                    <div className="animate-in duration-200 slide-in-from-inline-start-1">
                        <MenuHeader label={linkExistingLabel} showBack onBack={() => setView('main')} t={t} person={person} />
                        <div className="p-1 space-y-0.5">
                            <DropdownMenuItem
                                onClick={() => runAndClose(() => onLinkExisting('parent', 'male'))}
                                icon={<UserRound className="w-3.5 h-3.5" />}
                                label={t.addFather}
                            />
                            <DropdownMenuItem
                                onClick={() => runAndClose(() => onLinkExisting('parent', 'female'))}
                                icon={<UserRound className="w-3.5 h-3.5" />}
                                label={t.addMother}
                            />
                            <DropdownMenuItem
                                onClick={() => runAndClose(() => onLinkExisting('spouse', person.gender === 'male' ? 'female' : 'male'))}
                                icon={<Heart className="w-3.5 h-3.5" />}
                                label={t.addSpouse}
                            />
                            <DropdownMenuDivider />
                            <DropdownMenuItem
                                onClick={() => runAndClose(() => onLinkExisting('child', 'male'))}
                                icon={<Baby className="w-3.5 h-3.5" />}
                                label={sonLabel}
                            />
                            <DropdownMenuItem
                                onClick={() => runAndClose(() => onLinkExisting('child', 'female'))}
                                icon={<Baby className="w-3.5 h-3.5" />}
                                label={daughterLabel}
                            />
                        </div>
                    </div>
                )}
            </DropdownContent>
        </div>
    );
};

