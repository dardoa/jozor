import { memo } from 'react';
import { ChevronUp, Ribbon } from 'lucide-react';
import type { Person } from '../../../../types';
import { SmartAvatar } from '../../../ui/SmartAvatar';

const PRIVACY_PLACEHOLDER_COLOR = 'var(--tree-avatar-border)';
const PRIVACY_PLACEHOLDER_BACKGROUND = 'var(--tree-avatar-bg)';

export interface NodeImageBlockProps {
  isLOD: boolean;
  imageBlockHeightPx: number;
  borderColor: string;
  monogramBg: string;
  person: Person;
  shouldRenderPhoto: boolean;
  photoAlt: string;
  photoSource: string | null;
  privacyMode: boolean;
  isDeceased: boolean;
  showGender: boolean;
  onFocusPerson: (id: string) => void;
  showParentNavigation: boolean;
  privacyPlaceholder: {
    Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties; 'aria-label'?: string }>;
    ariaLabel: string;
  };
}

const getFatherId = (person: Person) => {
  const explicitFatherId = (person as Person & { fatherId?: string }).fatherId;
  return explicitFatherId || person.parents?.[0] || null;
};

export const NodeImageBlock = memo<NodeImageBlockProps>(({
  isLOD,
  imageBlockHeightPx,
  borderColor,
  monogramBg,
  person,
  shouldRenderPhoto,
  photoAlt,
  photoSource,
  privacyMode,
  isDeceased,
  showGender,
  onFocusPerson,
  showParentNavigation,
  privacyPlaceholder,
}) => {
  const fatherId = getFatherId(person);
  const stopNodePointerHandling = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
  };
  const handleParentFocus = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (fatherId) onFocusPerson(fatherId);
  };

  return (
    <div
      className={`relative flex w-full flex-shrink-0 items-center justify-center overflow-visible rounded-[calc(var(--tree-node-radius)-4px)] border ${isDeceased ? 'grayscale' : ''}`}
      style={{
        height: `${imageBlockHeightPx}px`,
        borderColor: 'color-mix(in srgb, var(--tree-avatar-border) 72%, white)',
        backgroundColor: 'color-mix(in srgb, var(--tree-avatar-bg) 72%, var(--tree-node-bg))',
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-[calc(var(--tree-node-radius)-4px)]">
        {shouldRenderPhoto ? (
          <SmartAvatar
            person={{ ...person, photoUrl: photoSource || person.photoUrl }}
            size={imageBlockHeightPx}
            className="rounded-[calc(var(--tree-node-radius)-6px)]"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ background: privacyMode ? PRIVACY_PLACEHOLDER_BACKGROUND : monogramBg }}
          >
            {privacyMode ? (
              <privacyPlaceholder.Icon
                aria-label={privacyPlaceholder.ariaLabel}
                className="h-10 w-10"
                style={{ color: PRIVACY_PLACEHOLDER_COLOR }}
              />
            ) : (
              <SmartAvatar
                person={{ ...person, photoUrl: undefined }}
                size={Math.min(imageBlockHeightPx, 112)}
                className="rounded-[calc(var(--tree-node-radius)-6px)]"
              />
            )}
          </div>
        )}
      </div>

      {fatherId && !isLOD && (
        <button
          type="button"
          aria-label="Focus parent"
          title="Focus parent"
          onClick={handleParentFocus}
          onPointerDown={stopNodePointerHandling}
          onPointerUp={stopNodePointerHandling}
          onPointerCancel={stopNodePointerHandling}
          className={`absolute left-1/2 top-[-35px] z-30 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-white/75 bg-white/80 text-slate-700 shadow-md backdrop-blur-md transition duration-200 hover:-translate-x-1/2 hover:-translate-y-0.5 hover:bg-white/95 active:scale-95 md:h-6 md:w-6 md:group-hover:opacity-100 ${
            showParentNavigation
              ? 'pointer-events-auto scale-100 opacity-100 motion-safe:animate-pulse'
              : 'pointer-events-none scale-95 opacity-0'
          }`}
        >
          <ChevronUp className="h-4 w-4 md:h-3.5 md:w-3.5" strokeWidth={2.6} />
        </button>
      )}

      {showGender && !isLOD && (
        <div
          className="absolute end-2 top-2 h-2.5 w-2.5 rounded-full border border-white/75 shadow-sm"
          style={{ backgroundColor: borderColor }}
        />
      )}

      {isDeceased && !isLOD && (
        <div
          className="absolute bottom-2 end-2 rounded-full p-1 shadow-sm"
          style={{ backgroundColor: 'rgba(255,255,255,0.82)', color: 'var(--tree-text-secondary)' }}
        >
          <Ribbon className="h-3 w-3" />
        </div>
      )}
    </div>
  );
});

NodeImageBlock.displayName = 'NodeImageBlock';

