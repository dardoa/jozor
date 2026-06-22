import type { Person } from '../../../types';
import type { 
  PublicationDocument, 
  PlacedDocument, 
  PublicationRequest, 
  PublicationTemplate,
  PublicationSection,
  PublicationBlock,
  PublicationSectionDefinition
} from '../types';
import { AncestorBuilder } from '../builders/AncestorBuilder';
import { BranchBuilder } from '../builders/BranchBuilder';
import { TimelineBuilder } from '../builders/TimelineBuilder';
import { AncestorTreeLayout, LayoutOptions } from '../layout/AncestorTreeLayout';
import { BookLayout } from '../layout/BookLayout';
import { TemplateRegistry } from './TemplateRegistry';

interface TreeSectionOptions {
  readonly variant?: 'ancestor' | 'branch';
  readonly depth?: number;
}

function isTreeSectionOptions(options: unknown): options is TreeSectionOptions {
  if (typeof options !== 'object' || options === null) {
    return false;
  }
  const opt = options as Record<string, unknown>;
  
  if ('variant' in opt && typeof opt.variant !== 'undefined' && opt.variant !== 'ancestor' && opt.variant !== 'branch') {
    return false;
  }
  
  if ('depth' in opt && typeof opt.depth !== 'undefined' && typeof opt.depth !== 'number') {
    return false;
  }
  
  return true;
}

function composeSection(
  definition: PublicationSectionDefinition,
  rootPerson: Person,
  people: Record<string, Person>,
  requestDepth?: number
): PublicationSection {
  switch (definition.type) {
    case 'cover': {
      const coverBlock: PublicationBlock = {
        id: `block-cover-${crypto.randomUUID()}`,
        type: 'header',
        assets: [
          {
            id: `asset-cover-title-${crypto.randomUUID()}`,
            type: 'text',
            payload: {
              text: `شجرة أسلاف ${rootPerson.firstName} ${rootPerson.lastName}`.trim(),
              subtext: 'تم التوليد بواسطة محرك جذور للنشر',
            },
          },
        ],
      };
      return {
        id: `section-cover-${crypto.randomUUID()}`,
        type: 'cover',
        blocks: [coverBlock],
      };
    }

    case 'introduction': {
      const introBlockHeader: PublicationBlock = {
        id: `block-intro-header-${crypto.randomUUID()}`,
        type: 'header',
        assets: [
          {
            id: `asset-intro-title-${crypto.randomUUID()}`,
            type: 'text',
            payload: {
              text: 'مقدمة الكتاب',
              subtext: 'توطئة عائلية وتاريخية',
            },
          },
        ],
      };
      const introBlockBody: PublicationBlock = {
        id: `block-intro-body-${crypto.randomUUID()}`,
        type: 'paragraph',
        assets: [
          {
            id: `asset-intro-body-${crypto.randomUUID()}`,
            type: 'text',
            payload: {
              text: 'مقدمة وثيقة النسب',
              body: `توثق هذه المخطوطة شجرة النسب والتسلسل العائلي للجد الأعلى والأسلاف صعوداً وهبوطاً بدءاً من ${rootPerson.firstName} ${rootPerson.lastName}. يشمل هذا السجل تفاصيل التواريخ والعلاقات الأسرية الموثقة بوزنها التاريخي والمنهجي.`,
            },
          },
        ],
      };
      return {
        id: `section-intro-${crypto.randomUUID()}`,
        type: 'introduction',
        blocks: [introBlockHeader, introBlockBody],
      };
    }

    case 'tree': {
      let variant: 'ancestor' | 'branch' = 'ancestor';
      let depth = 4;

      if (definition.options) {
        if (isTreeSectionOptions(definition.options)) {
          if (definition.options.variant) {
            variant = definition.options.variant;
          }
          if (typeof definition.options.depth === 'number') {
            depth = definition.options.depth;
          }
        } else {
          throw new Error('Invalid options passed to tree section definition.');
        }
      }

      // Prioritize explicit request override if passed
      if (typeof requestDepth === 'number') {
        depth = requestDepth;
      }

      let treeDoc: PublicationDocument;
      if (variant === 'ancestor') {
        treeDoc = AncestorBuilder.build(people, rootPerson.id, depth);
      } else {
        treeDoc = BranchBuilder.build(people, rootPerson.id);
      }

      const treeSection = treeDoc.sections.find((s) => s.type === 'tree');
      if (!treeSection) {
        throw new Error('Tree section could not be composed by the builder.');
      }
      return treeSection;
    }

    case 'timeline': {
      const timelineDoc = TimelineBuilder.build(people);
      const timelineSection = timelineDoc.sections.find((s) => s.type === 'timeline');
      if (!timelineSection) {
        throw new Error('Timeline section could not be composed by the builder.');
      }
      return timelineSection;
    }

    default: {
      throw new Error(`Unsupported section type: "${definition.type}"`);
    }
  }
}

export class PublishingPipeline {
  /**
   * Composes a logical PublicationDocument by dispatching to the appropriate builder
   * based on the scope type of the request.
   */
  public static composeDocument(
    request: PublicationRequest,
    people: Record<string, Person>
  ): PublicationDocument {
    const template = TemplateRegistry.getTemplate(request.templateId);
    const rootPerson = people[request.rootPersonId];
    if (!rootPerson) {
      throw new Error(`Root person "${request.rootPersonId}" not found in the family tree.`);
    }

    const sections: PublicationSection[] = template.sections.map((sectionDef) => {
      return composeSection(sectionDef, rootPerson, people, request.scope.generationsDepth);
    });

    return {
      id: `doc-${crypto.randomUUID()}`,
      title: template.name.includes('كتاب') 
        ? `كتاب عائلة ${rootPerson.lastName}` 
        : `شجرة أسلاف ${rootPerson.firstName} ${rootPerson.lastName}`.trim(),
      theme: request.theme || (template.id.includes('classic') ? 'classic' : 'modern'),
      type: template.documentType,
      sections,
    };
  }

  /**
   * Computes absolute layout placements and outputs a PlacedDocument by dispatching
   * to the correct layout engine based on the template's publicationKind.
   */
  public static layoutDocument(
    doc: PublicationDocument,
    template: PublicationTemplate,
    overrides?: Partial<LayoutOptions>
  ): PlacedDocument {
    const kind = template.publicationKind;

    switch (kind) {
      case 'ancestor-poster': {
        // Construct consolidated LayoutOptions from template defaults and theme configuration
        const layoutOptions: LayoutOptions = {
          pageWidth: template.defaultLayoutOptions.pageWidth,
          pageHeight: template.defaultLayoutOptions.pageHeight,
          margins: template.defaultLayoutOptions.margins,
          generationSpacing: template.defaultLayoutOptions.generationSpacing,
          theme: template.theme,
          ...overrides,
        };

        return AncestorTreeLayout.layout(doc, layoutOptions);
      }
      case 'book-manuscript': {
        const layoutOptions: LayoutOptions = {
          pageWidth: template.defaultLayoutOptions.pageWidth,
          pageHeight: template.defaultLayoutOptions.pageHeight,
          margins: template.defaultLayoutOptions.margins,
          generationSpacing: template.defaultLayoutOptions.generationSpacing,
          theme: template.theme,
          ...overrides,
        };

        return BookLayout.layout(doc, layoutOptions);
      }
      default: {
        throw new Error(`Unsupported publication kind for layout: "${kind}"`);
      }
    }
  }
}
