import type { ManuscriptVisualInsertDefinition, ManuscriptVisualInsertPlacement } from './manuscriptTemplates';

/**
 * Returns a list of active visual inserts matching the requested placement.
 * These are used by the renderer to decide if and where to inject plates.
 */
export function getEnabledVisualInserts(
  inserts: readonly ManuscriptVisualInsertDefinition[] | undefined,
  placement: ManuscriptVisualInsertPlacement
): readonly ManuscriptVisualInsertDefinition[] {
  return (inserts ?? []).filter((insert) => insert.enabled && insert.placement === placement);
}
