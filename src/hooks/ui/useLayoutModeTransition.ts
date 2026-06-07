import { useEffect, useRef } from 'react';
import { easeSinInOut } from 'd3-ease';
import { select } from 'd3-selection';
import 'd3-transition';

interface UseLayoutModeTransitionOptions {
  layoutMode: string;
  gRef: React.RefObject<SVGGElement | null>;
}

export function useLayoutModeTransition({ layoutMode, gRef }: UseLayoutModeTransitionOptions) {
  const prevLayoutModeRef = useRef<string>(layoutMode);

  useEffect(() => {
    const layoutChanged = prevLayoutModeRef.current !== layoutMode;

    if (layoutChanged && gRef.current) {
      select(gRef.current)
        .transition()
        .duration(180)
        .ease(easeSinInOut)
        .attr('opacity', 0)
        .transition()
        .duration(300)
        .ease(easeSinInOut)
        .attr('opacity', 1);
    }

    prevLayoutModeRef.current = layoutMode;
  }, [gRef, layoutMode]);
}
