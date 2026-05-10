import { memo } from 'react';
import { Link as LinkIcon } from 'lucide-react';

interface NodeReferenceBadgeProps {
  isReference?: boolean;
}

export const NodeReferenceBadge = memo<NodeReferenceBadgeProps>(({ isReference }) => {
  if (!isReference) return null;

  return (
    <div className="absolute -top-3 -end-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-[#C9952A] text-white shadow-lg shadow-[#c9952a]/20 outline outline-2 outline-white">
      <LinkIcon className="h-4 w-4" />
    </div>
  );
});

NodeReferenceBadge.displayName = 'NodeReferenceBadge';
