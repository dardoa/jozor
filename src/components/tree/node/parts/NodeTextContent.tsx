import { memo } from 'react';
import { Link as LinkIcon } from 'lucide-react';

export interface NodeTextContentProps {
  personId: string;
  isDeceased: boolean;
  dynamicTextSizePx: number;
  primaryNameLine: string;
  secondaryNameLine: string;
  nicknameAsPrimary: boolean;
  metaLines: string[];
  showReferenceBadge: boolean;
}

export const NodeTextContent = memo<NodeTextContentProps>(({
  personId,
  isDeceased,
  dynamicTextSizePx,
  primaryNameLine,
  secondaryNameLine,
  nicknameAsPrimary,
  metaLines,
  showReferenceBadge,
}) => (
  <div className="flex min-w-0 w-full flex-col items-center justify-start text-center gap-1.5">
    <div className="flex w-full flex-col items-center justify-start gap-1.5">
      {primaryNameLine ? (
        <h3
          className="w-full px-0.5 font-semibold"
          style={{
            fontSize: `${Math.max(dynamicTextSizePx + 1, 13)}px`,
            lineHeight: 1.18,
            color: isDeceased ? 'var(--tree-text-secondary)' : 'var(--tree-text-primary)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            overflowWrap: 'break-word',
          }}
        >
          {primaryNameLine}
        </h3>
      ) : null}

      {secondaryNameLine ? (
        nicknameAsPrimary ? (
          <div
            className="max-w-full px-1 text-[11px] font-semibold"
            style={{
              color: 'var(--tree-text-secondary)',
              lineHeight: 1.15,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {secondaryNameLine}
          </div>
        ) : (
          <div
            className="inline-flex max-w-full items-center rounded-full px-2 py-1 text-[10px] font-medium"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--tree-badge-bg) 14%, white)',
              border: '1px solid color-mix(in srgb, var(--tree-badge-bg) 22%, white)',
              color: 'color-mix(in srgb, var(--tree-line-color) 80%, var(--tree-text-secondary))',
              lineHeight: 1,
            }}
          >
            <span className="truncate">{secondaryNameLine}</span>
          </div>
        )
      ) : null}

      {metaLines.length > 0 ? (
        <div className="flex w-full flex-col items-center gap-0.5 text-center">
          {metaLines.map((line, lineIndex) => (
            <div
              key={`${personId}-meta-${lineIndex}`}
              className="w-full px-1 text-[10px] font-medium"
              style={{
                color: 'var(--tree-text-secondary)',
                opacity: lineIndex === 0 ? 0.72 : 0.56,
                lineHeight: 1.2,
                display: '-webkit-box',
                WebkitLineClamp: 1,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {line}
            </div>
          ))}
        </div>
      ) : null}
    </div>

    {showReferenceBadge ? (
      <div className="flex min-w-0 flex-wrap items-center justify-center gap-1.5 pt-1">
        <div
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--tree-badge-bg) 16%, white)',
            border: '1px solid color-mix(in srgb, var(--tree-badge-bg) 34%, white)',
            color: 'var(--tree-badge-bg)',
          }}
        >
          <LinkIcon className="h-2.5 w-2.5" strokeWidth={2.2} />
        </div>
      </div>
    ) : null}
  </div>
));

NodeTextContent.displayName = 'NodeTextContent';

