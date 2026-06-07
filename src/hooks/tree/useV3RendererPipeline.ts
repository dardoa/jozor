import { useMemo } from 'react';
import type { Person, TreeSettings } from '../../types';
import type { CollapsePoint } from '../../utils/layout/constants';
import {
  computeV3PipelineData,
  buildPeopleLayoutSignature,
  buildCollapseSignature,
  buildSettingsSignature,
  type V3RendererPipeline,
  type V3ProjectedNode,
  type V3ProjectedFamily,
  type V3CollapseControl,
} from '../../utils/layout/v3LayoutPipeline';

export type { V3ProjectedNode, V3ProjectedFamily, V3CollapseControl, V3RendererPipeline };

interface UseV3RendererPipelineParams {
  people: Record<string, Person>;
  focusId: string;
  collapsePoints?: CollapsePoint[];
  settings?: Pick<TreeSettings, 'nodeSpacingX' | 'nodeSpacingY' | 'generationLimit'>;
  skip?: boolean;
}

/**
 * Runs the full V3 layout pipeline and returns renderer-ready data.
 * All computation is wrapped in a single useMemo keyed on structural signatures
 * rather than the full people object, so visual-only person edits do not rebuild
 * the layout graph.
 *
 * Returns null when focusId is not found in the graph (empty / invalid state).
 */
export function useV3RendererPipeline({
  people,
  focusId,
  collapsePoints = [],
  settings,
  skip = false,
}: UseV3RendererPipelineParams): V3RendererPipeline | null {
  const peopleLayoutSignature = useMemo(
    () => buildPeopleLayoutSignature(people),
    [people],
  );
  const collapseSignature = useMemo(
    () => buildCollapseSignature(collapsePoints, focusId),
    [collapsePoints, focusId],
  );
  const settingsSignature = useMemo(
    () => buildSettingsSignature(settings),
    [settings],
  );

  return useMemo<V3RendererPipeline | null>(() => {
    if (skip || !focusId || !people[focusId]) return null;
    const [nodeSpacingX, nodeSpacingY, generationLimit] = JSON.parse(settingsSignature) as [
      number,
      number,
      number | null,
    ];

    return computeV3PipelineData({
      people,
      focusId,
      collapsePoints,
      settings: {
        nodeSpacingX,
        nodeSpacingY,
        generationLimit,
      },
    });
  }, [collapseSignature, focusId, peopleLayoutSignature, settingsSignature]);
}
export default useV3RendererPipeline;
