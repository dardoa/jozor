import type { ManuscriptPersonEntry } from '../../types';
import type { PersonCardVariant } from '../manuscriptTemplates';
import {
  renderClassicPersonCard,
  type PersonCardRenderContext,
} from './classicPersonCard';

export type { PersonCardRenderContext, PersonCardRenderLabels } from './classicPersonCard';

/**
 * Routes a person-card render request to the appropriate variant renderer.
 *
 * Today all unimplemented variants fall back to classic-card so that
 * consumers can already pass a template variant without breakage.
 * When a new variant is ready, replace its case with a real implementation.
 */
export function renderPersonCardByVariant(
  variant: PersonCardVariant,
  person: ManuscriptPersonEntry,
  context: PersonCardRenderContext
): string {
  switch (variant) {
    case 'classic-card':
      return renderClassicPersonCard(person, context);
    // Future variants — currently fall back to classic-card:
    case 'leaf-card':
    case 'photo-card':
    case 'research-card':
    case 'compact-row':
      return renderClassicPersonCard(person, context);
    default: {
      // Exhaustive narrowing: if a new variant is added to PersonCardVariant
      // but not handled here, TypeScript will flag this cast as an error.
      const _exhaustive: never = variant;
      void _exhaustive;
      return renderClassicPersonCard(person, context);
    }
  }
}
