/**
 * Manuscript print template type definitions.
 *
 * A ManuscriptPrintTemplate describes the set of rendering variants to use
 * for a given print run.  All variant types are declared here so future
 * implementations can be added as isolated files without touching the renderer.
 *
 * NOTE: Only 'classic-card' / 'simple-divider' / 'table' / 'vertical-list'
 * are implemented today.  All other variant values are type-level reserved
 * names that fall back to the classic implementation until they are built.
 */

export type PersonCardVariant =
  | 'classic-card'
  | 'leaf-card'
  | 'photo-card'
  | 'research-card'
  | 'compact-row';

export type BranchHeaderVariant =
  | 'simple-divider'
  | 'ornamental-divider';

export type EvidenceVariant =
  | 'table'
  | 'compact-list'
  | 'footnotes';

export type TimelineVariant =
  | 'vertical-list'
  | 'compact-list';

export type ManuscriptVisualInsertKind =
  | 'fan-chart'
  | 'ancestor-tree'
  | 'descendant-tree'
  | 'branch-mini-tree';

export type ManuscriptVisualInsertPlacement =
  | 'after-cover'
  | 'before-people'
  | 'before-branch'
  | 'after-branch'
  | 'before-timeline';

export interface ManuscriptVisualInsertDefinition {
  readonly kind: ManuscriptVisualInsertKind;
  readonly placement: ManuscriptVisualInsertPlacement;
  readonly enabled: boolean;
  readonly maxGenerations?: number;
}

export interface ManuscriptPrintTemplate {
  readonly id: string;
  readonly name: string;
  readonly personCardVariant: PersonCardVariant;
  readonly branchHeaderVariant: BranchHeaderVariant;
  readonly evidenceVariant: EvidenceVariant;
  readonly timelineVariant: TimelineVariant;
  readonly visualInserts?: readonly ManuscriptVisualInsertDefinition[];
}

/**
 * The default template used when no template is explicitly specified.
 * Produces the same output as the original HtmlManuscriptRenderer.
 */
export const CLASSIC_MANUSCRIPT_PRINT_TEMPLATE: ManuscriptPrintTemplate = {
  id: 'classic-family-book',
  name: 'Classic Family Book',
  personCardVariant: 'classic-card',
  branchHeaderVariant: 'simple-divider',
  evidenceVariant: 'table',
  timelineVariant: 'vertical-list',
  visualInserts: [],
};
