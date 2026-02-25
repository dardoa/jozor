import { memo, useState, useEffect } from 'react';
import { User, Ribbon, Link as LinkIcon, AlertTriangle, RefreshCw } from 'lucide-react';
import { Person, TreeSettings, TreeNode, Gender } from '../types';
import { getYears } from '../utils/familyLogic';
import { useAppStore } from '../store/useAppStore';
import { TOKENS } from '../utils/tokens';

const EMPTY_ARRAY: string[] = [];

interface NodeComponentProps {
    node: TreeNode;
    index: number;
    isFocused: boolean;
    isHighlighted: boolean;
    onSelect: (id: string) => void;
    onNodeContextMenu: (e: React.MouseEvent, id: string) => void;
    settings: TreeSettings;
    zoomScale: number;
    nodeWidth: number;
    nodeHeight: number;
    isPulsing?: boolean;
    isDimmed?: boolean;
    isPathHighlighted?: boolean;
}

export const NodeComponent = memo<NodeComponentProps>(({
    node,
    index,
    isFocused,
    isHighlighted,
    onSelect,
    onNodeContextMenu,
    settings,
    zoomScale,
    nodeWidth,
    nodeHeight,
    isPulsing,
    isDimmed,
    isPathHighlighted,
}) => {
    const isLOD = zoomScale < 0.5;
    const person = useAppStore((state) => state.people[node.id]) || node.data;
    const isNodeSyncing = useAppStore((state) => state.syncingNodes.has(person.id));
    const searchTarget = useAppStore((state) => state.searchTarget);
    const [isPulsingTarget, setIsPulsingTarget] = useState(false);

    useEffect(() => {
        if (searchTarget?.id === person.id) {
            setIsPulsingTarget(true);
            const timer = setTimeout(() => setIsPulsingTarget(false), 3000);
            return () => clearTimeout(timer);
        } else {
            setIsPulsingTarget(false);
        }
    }, [searchTarget, person.id]);

    const validationErrors = useAppStore((state) => state.validationErrors[person.id] || EMPTY_ARRAY);
    const hasErrors = validationErrors.length > 0;
    const initials = [person.firstName?.[0], person.lastName?.[0]].filter(Boolean).join('').toUpperCase();

    // Gender coding colors mapped to theme variables instead of hardcoded hex
    const getGenderColor = () => {
        if (settings.boxColorLogic === 'none') return 'var(--slate-400)';
        return person.gender === 'male' ? 'var(--gender-male-border, #60a5fa)' : 'var(--gender-female-border, #f472b6)';
    };

    const getMonogramBg = () => {
        if (settings.boxColorLogic === 'none') return 'var(--slate-700)';
        if (settings.boxColorLogic === 'lineage') return settings.themeColor;
        return person.gender === 'male' ? 'var(--gender-male-bg, var(--monogram-male-bg, #1e3a8a))' : 'var(--gender-female-bg, var(--monogram-female-bg, #831843))';
    };

    const borderColor = getGenderColor();
    const monogramBg = getMonogramBg();

    const handleSelect = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect(person.id);
    };

    const themeStyles = {
        card: `backdrop-blur-xl bg-slate-900/60 border-slate-700/80 shadow-2xl shadow-black/40 ${node.isReference ? 'border-dashed border-amber-500/60 ring-1 ring-amber-500/20' : ''}`,
        border: 'border-slate-700/80',
        textName: 'text-white font-bold tracking-tight',
        textMeta: 'text-slate-300 font-medium',
        avatarBg: 'bg-slate-800/80',
    };

    const dynamicTextSize = settings.textSize || 12;

    return (
        <g
            transform={`translate(${node.x},${node.y})`}
            onClick={handleSelect}
            onContextMenu={(e) => onNodeContextMenu(e, person.id)}
            className={`cursor-pointer group transition-all ${isDimmed && !isPathHighlighted ? 'opacity-20 grayscale-[20%]' : 'opacity-100'}`}
            style={{
                transitionDuration: `${TOKENS.ANIMATIONS.long}ms`,
                transitionTimingFunction: TOKENS.EASING.outQuint
            }}
        >
            {/* Highlight/Pulse Pulse */}
            {(isHighlighted || isPulsing) && (
                <rect
                    x={-nodeWidth / 2 - 8}
                    y={-nodeHeight / 2 - 8}
                    width={nodeWidth + 16}
                    height={nodeHeight + 16}
                    rx="24"
                    className={`fill-none stroke-[${settings.themeColor || '#E1AD01'}] stroke-2 ${isPulsing ? 'animate-ping opacity-50' : 'animate-pulse'}`}
                    style={{ stroke: settings.themeColor }}
                />
            )}

            <foreignObject
                x={-nodeWidth / 2}
                y={-nodeHeight / 2}
                width={nodeWidth}
                height={nodeHeight + 40} // Buffer for shadows
                className={`overflow-visible animate-fade-in-up delay-${Math.min((index % 5) + 1, 5)}00`}
            >
                <div className="relative w-full h-full p-2 flex flex-col items-center">
                    <div
                        className={`
              w-full h-full rounded-xl border flex flex-col items-center p-3 relative
              ${themeStyles.card}
              ${isFocused ? 'ring-2 ring-primary-500/50 shadow-lg' : ''}
              ${isPathHighlighted ? 'shadow-[0_0_15px_rgba(245,158,11,0.6)] border-amber-500/50 ring-2 ring-amber-500/20' : ''}
              ${isPulsingTarget ? 'animate-pulse-ring ring-4 ring-amber-500/50 scale-105' : ''}
              hover:shadow-md hover:-translate-y-1
            `}
                        style={{ borderColor: isPathHighlighted ? undefined : borderColor }}
                    >
                        {/* Avatar Container */}
                        <div
                            className={`
                w-12 h-12 rounded-full border-2 overflow-hidden flex-shrink-0 mb-2
                ${themeStyles.avatarBg}
                ${person.isDeceased ? 'grayscale' : ''}
              `}
                            style={{ borderColor }}
                        >
                            {settings.showPhotos && person.photoUrl && !isLOD ? (
                                <img src={person.photoUrl} alt={person.firstName} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center relative" style={{ background: monogramBg }}>
                                    <User className="absolute w-1/2 h-1/2 text-white opacity-20" />
                                    <span className="relative z-10 text-white text-base font-bold opacity-90">{initials}</span>
                                </div>
                            )}
                        </div>

                        {/* Text Content */}
                        <div className="flex-1 flex flex-col items-center justify-center text-center w-full min-w-0">
                            <h3
                                className={`font-semibold leading-tight truncate w-full px-1 ${themeStyles.textName}`}
                                style={{ fontSize: `${dynamicTextSize}px` }}
                            >
                                {!isLOD && settings.showPrefix && person.title && <span className="opacity-60 mr-1">{person.title}</span>}
                                {settings.showFirstName && person.firstName}
                                {!isLOD && settings.showMiddleName && person.middleName && (
                                    <span className="font-normal mx-0.5">{person.middleName}</span>
                                )}
                                {!isLOD && settings.showNickname && person.nickName && (
                                    <span className="font-normal mx-0.5 italic opacity-70">"{person.nickName}"</span>
                                )}
                                {!isLOD && settings.showMaidenName && person.gender === 'female' && person.lastName && (
                                    <span className="font-normal mx-0.5 opacity-60">({person.lastName})</span>
                                )}
                                {!isLOD && settings.showLastName && (
                                    <span className={`font-medium ml-1 opacity-80 ${themeStyles.textName}`}>{person.lastName}</span>
                                )}
                                {!isLOD && settings.showSuffix && person.suffix && <span className="opacity-60 ml-1">{person.suffix}</span>}
                            </h3>

                            <div className="mt-0.5 font-medium whitespace-nowrap flex flex-col items-center text-[10px] opacity-60 text-slate-300">
                                {settings.showDates && (
                                    <div className="flex flex-col items-center">
                                        {(settings.showBirthDate || settings.showDeathDate) && <span>{getYears(person)}</span>}
                                        {settings.showMarriageDate && person.marriageDate && (
                                            <span className="text-[8px] opacity-50">m. {person.marriageDate}</span>
                                        )}
                                    </div>
                                )}
                                {!isLOD && settings.showOccupation && person.profession && (
                                    <span className="text-[9px] opacity-50 italic">{person.profession}</span>
                                )}
                                <div className="flex flex-col items-center mt-0.5">
                                    {!isLOD && settings.showBirthPlace && person.birthPlace && (
                                        <span className="text-[9px] opacity-80 truncate max-w-[140px]">
                                            {person.birthPlace}
                                        </span>
                                    )}
                                    {!isLOD && settings.showMarriagePlace && person.marriagePlace && (
                                        <span className="text-[9px] opacity-80 truncate max-w-[140px]">
                                            m. {person.marriagePlace}
                                        </span>
                                    )}
                                    {!isLOD && settings.showBurialPlace && person.burialPlace && (
                                        <span className="text-[9px] opacity-80 truncate max-w-[140px]">
                                            bur. {person.burialPlace}
                                        </span>
                                    )}
                                    {!isLOD && settings.showResidence && person.residence && (
                                        <span className="text-[9px] opacity-80 truncate max-w-[140px]">
                                            res. {person.residence}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Optimistic UI Sync Spinner */}
                        {isNodeSyncing && !isLOD && (
                            <div className="absolute top-1.5 left-1.5 text-[var(--primary-500)] animate-spin opacity-80 drop-shadow-sm">
                                <RefreshCw className="w-3.5 h-3.5" />
                            </div>
                        )}

                        {/* Gender Icon (if enabled) */}
                        {settings.showGender && !isLOD && (
                            <div className="absolute top-1.5 right-1.5 opacity-40">
                                <div className={`w-1.5 h-1.5 rounded-full`} style={{ backgroundColor: borderColor }} />
                            </div>
                        )}

                        {/* Deceased Icon */}
                        {person.isDeceased && !isLOD && (
                            <div className="absolute top-1.5 right-4 text-slate-400 dark:text-slate-500">
                                <Ribbon className="w-3 h-3" />
                            </div>
                        )}

                        {/* Validation Warning Badge */}
                        {hasErrors && !isLOD && (
                            <div
                                className="absolute top-1.5 left-1.5 p-0.5 bg-red-500 rounded-lg shadow-sm animate-pulse cursor-help"
                                title={validationErrors.join('\n')}
                            >
                                <AlertTriangle className="w-3 h-3 text-white" />
                            </div>
                        )}

                        {/* Reference Badge */}
                        {node.isReference && !isLOD && (
                            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-amber-500/90 border-2 border-slate-900 rounded-full p-1 shadow-xl transition-all duration-300 group-hover:bg-amber-400 group-hover:scale-110">
                                <LinkIcon className="w-3 h-3 text-slate-900" strokeWidth={3} />
                            </div>
                        )}
                    </div>
                </div>
            </foreignObject>
        </g >
    );
});

NodeComponent.displayName = 'NodeComponent';
