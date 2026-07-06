import { describe, expect, it } from 'vitest';

import type { FamilyManuscriptModel } from '../../types';
import { MarkdownManuscriptRenderer } from '../MarkdownManuscriptRenderer';

const model: FamilyManuscriptModel = {
  id: 'manuscript-1',
  title: 'Family Manuscript: Example',
  rootPersonId: 'person-1',
  chapters: [
    {
      id: 'overview',
      type: 'overview',
      title: 'Branch overview',
      branchSummaries: [
        { branchRootPersonId: 'person-branch-1', label: 'Saleh branch', personCount: 2 },
      ],
    },
    {
      id: 'people',
      type: 'people',
      title: 'People',
      people: [
        {
          personId: 'person-1',
          displayName: 'Amina Saleh',
          familyContext: {
            kind: 'descendant',
            generationDepth: 1,
            label: 'Generation 2',
            breadcrumb: ['Root Family', 'Amina Saleh'],
            branchRootPersonId: 'person-branch-1',
            branchLabel: 'Saleh branch',
          },
          citationCoverage: 50,
          citationCount: 2,
          facts: [
            { label: 'Birth place', value: 'Kafranbel, Syria', citationCount: 1 },
            { label: 'Residence', value: 'Riyadh, Saudi Arabia', citationCount: 0 },
          ],
          sourceHighlights: [
            { sourceId: 'source-1', title: 'Civil registry', citationCount: 2 },
          ],
        },
      ],
    },
    {
      id: 'timeline',
      type: 'timeline',
      title: 'Timeline',
      timeline: [
        {
          personId: 'person-1',
          personName: 'Amina Saleh',
          date: '1950',
          title: 'Birth',
          place: 'Kafranbel, Syria',
        },
      ],
    },
    {
      id: 'evidence',
      type: 'evidence',
      title: 'Bibliography',
      citations: [
        {
          citationId: 'citation-1',
          sourceId: 'source-1',
          sourceTitle: 'Civil registry',
          targetId: 'person-1',
          targetField: 'person.birth.place',
        },
        {
          citationId: 'citation-2',
          sourceId: 'source-1',
          sourceTitle: 'Civil registry',
          targetId: 'person-1',
          targetField: 'person.birth.date',
        },
      ],
    },
  ],
};

describe('MarkdownManuscriptRenderer', () => {
  it('renders a FamilyManuscriptModel as portable Markdown', () => {
    const markdown = MarkdownManuscriptRenderer.renderToMarkdown(model);

    expect(markdown).toContain('# Family Manuscript: Example');
    expect(markdown).toContain('- Manuscript ID: manuscript\\-1');
    expect(markdown).toContain('## Branch overview');
    expect(markdown).toContain('- Saleh branch - 2 people');
    expect(markdown).toContain('## People');
    expect(markdown).toContain('#### Branch: Saleh branch');
    expect(markdown).toContain('### Amina Saleh');
    expect(markdown).toContain('- Family context: Generation 2');
    expect(markdown).toContain('- Family path: Root Family > Amina Saleh');
    expect(markdown).toContain('- Citation coverage: 50%');
    expect(markdown).toContain('- **Birth place:** Kafranbel, Syria (1 citation)');
    expect(markdown).toContain('- Civil registry (2)');
    expect(markdown).toContain('## Timeline');
    expect(markdown).toContain('- 1950: **Amina Saleh** - Birth - Kafranbel, Syria');
    expect(markdown).toContain('## Bibliography');
    expect(markdown).toContain('- Civil registry - 2 citations; fields: person\\.birth\\.date, person\\.birth\\.place');
  });

  it('can omit technical metadata for user-facing Markdown previews', () => {
    const markdown = MarkdownManuscriptRenderer.renderToMarkdown(model, { includeMetadata: false });

    expect(markdown).not.toContain('Manuscript ID');
    expect(markdown).not.toContain('Root person ID');
    expect(markdown).toContain('## People');
  });

  it('escapes Markdown control characters in inline content', () => {
    const markdown = MarkdownManuscriptRenderer.renderToMarkdown({
      ...model,
      title: 'Family [Draft] #1',
      chapters: [
        {
          id: 'people',
          type: 'people',
          title: 'People',
          people: [
            {
              personId: 'person-2',
              displayName: 'Omar *Test*',
              citationCoverage: 0,
              citationCount: 0,
              facts: [],
              sourceHighlights: [],
            },
          ],
        },
      ],
    });

    expect(markdown).toContain('# Family \\[Draft\\] \\#1');
    expect(markdown).toContain('### Omar \\*Test\\*');
  });

  it('renders relationship metadata when provided', () => {
    const markdown = MarkdownManuscriptRenderer.renderToMarkdown({
      id: 'metadata-test',
      title: 'Relationship Metadata Test',
      rootPersonId: 'p1',
      chapters: [{
        id: 'people',
        type: 'people',
        title: 'People',
        people: [
          {
            personId: 'p1',
            displayName: 'John Root',
            relationshipToRoot: 'root',
            generation: 0,
            citationCoverage: 0,
            citationCount: 0,
            facts: [],
            sourceHighlights: [],
          },
          {
            personId: 'p2',
            displayName: 'Jane Spouse',
            relationshipToRoot: 'spouse',
            generation: 0,
            citationCoverage: 0,
            citationCount: 0,
            facts: [],
            sourceHighlights: [],
          },
          {
            personId: 'p3',
            displayName: 'Jack Child',
            relationshipToRoot: 'child',
            generation: 1,
            citationCoverage: 0,
            citationCount: 0,
            facts: [],
            sourceHighlights: [],
          }
        ],
      }],
    }, { language: 'en' });

    expect(markdown).toContain('- Relationship: Root');
    expect(markdown).toContain('- Relationship: Spouse');
    expect(markdown).toContain('- Relationship: Generation 1');
  });

  it('renders people in the exact pre-ordered narrative sequence and maintains labels', () => {
    const markdown = MarkdownManuscriptRenderer.renderToMarkdown({
      id: 'flow-test',
      title: 'Narrative Flow Test',
      rootPersonId: 'root',
      chapters: [{
        id: 'people',
        type: 'people',
        title: 'People',
        people: [
          {
            personId: 'root',
            displayName: 'Z Root',
            relationshipToRoot: 'root',
            generation: 0,
            citationCoverage: 0,
            citationCount: 0,
            facts: [],
            sourceHighlights: [],
          },
          {
            personId: 'spouse',
            displayName: 'A Spouse',
            relationshipToRoot: 'spouse',
            generation: 0,
            citationCoverage: 0,
            citationCount: 0,
            facts: [],
            sourceHighlights: [],
          },
          {
            personId: 'child1',
            displayName: 'Y First Child',
            relationshipToRoot: 'child',
            generation: 1,
            citationCoverage: 0,
            citationCount: 0,
            facts: [],
            sourceHighlights: [],
          },
          {
            personId: 'spouseChild1',
            displayName: 'B Child Spouse',
            relationshipToRoot: 'spouse',
            generation: 0,
            citationCoverage: 0,
            citationCount: 0,
            facts: [],
            sourceHighlights: [],
          },
          {
            personId: 'grandchild',
            displayName: 'X Grandchild',
            relationshipToRoot: 'grandchild',
            generation: 2,
            citationCoverage: 0,
            citationCount: 0,
            facts: [],
            sourceHighlights: [],
          },
          {
            personId: 'child2',
            displayName: 'C Second Child',
            relationshipToRoot: 'child',
            generation: 1,
            citationCoverage: 0,
            citationCount: 0,
            facts: [],
            sourceHighlights: [],
          }
        ],
      }],
    }, { language: 'en' });

    // Assert absolute relative order of appearances
    const idxRoot = markdown.indexOf('Z Root');
    const idxSpouse = markdown.indexOf('A Spouse');
    const idxChild1 = markdown.indexOf('Y First Child');
    const idxSpouseChild1 = markdown.indexOf('B Child Spouse');
    const idxGrandchild = markdown.indexOf('X Grandchild');
    const idxChild2 = markdown.indexOf('C Second Child');

    expect(idxRoot).toBeGreaterThan(-1);
    expect(idxSpouse).toBeGreaterThan(idxRoot);
    expect(idxChild1).toBeGreaterThan(idxSpouse);
    expect(idxSpouseChild1).toBeGreaterThan(idxChild1);
    expect(idxGrandchild).toBeGreaterThan(idxSpouseChild1);
    expect(idxChild2).toBeGreaterThan(idxGrandchild);

    // Assert relationship labels presence
    expect(markdown).toContain('- Relationship: Root');
    expect(markdown).toContain('- Relationship: Spouse');
    expect(markdown).toContain('- Relationship: Generation 1');
    expect(markdown).toContain('- Relationship: Generation 2');
  });
});

// ---------------------------------------------------------------------------
// Arabic Encoding Regression Guard
// Builds an Arabic-language manuscript model, renders to Markdown and asserts:
// (1) correct Arabic labels (العلاقة, الجذر, الجيل) appear in the output,
// (2) no mojibake fragments (Ø, Ù, â€, â†) appear anywhere in the output.
// ---------------------------------------------------------------------------

const MOJIBAKE_FRAGMENTS_MD = ['Ø', 'Ù', 'â€', 'â†', 'Ã‡'];

const arMarkdownModel: FamilyManuscriptModel = {
  id: 'manuscript-ar-guard',
  title: 'مخطوط عائلة',
  rootPersonId: 'p-root',
  chapters: [
    {
      id: 'people',
      type: 'people',
      title: 'أفراد العائلة',
      people: [
        {
          personId: 'p-root',
          displayName: 'جذر العائلة',
          relationshipToRoot: 'root',
          generation: 0,
          citationCoverage: 75,
          citationCount: 3,
          facts: [
            { label: 'مكان الميلاد', value: 'دمشق', citationCount: 1 },
          ],
          sourceHighlights: [
            { sourceId: 's1', title: 'سجل النفوس', citationCount: 2 },
          ],
        },
        {
          personId: 'p-child',
          displayName: 'ابن الجذر',
          relationshipToRoot: 'child',
          generation: 1,
          citationCoverage: 0,
          citationCount: 0,
          facts: [],
          sourceHighlights: [],
        },
      ],
    },
    {
      id: 'evidence',
      type: 'evidence',
      title: 'المراجع',
      citations: [
        { citationId: 'c1', sourceId: 's1', sourceTitle: 'سجل النفوس', targetId: 'p-root', targetField: 'person.birth.place' },
      ],
    },
  ],
};

describe('MarkdownManuscriptRenderer – Arabic encoding guard', () => {
  it('Markdown output contains correct Arabic relationship labels and no mojibake', () => {
    const markdown = MarkdownManuscriptRenderer.renderToMarkdown(arMarkdownModel, { language: 'ar' });

    // Arabic relationship prefix must appear
    expect(markdown).toContain('العلاقة');
    // Root relationship label
    expect(markdown).toContain('الجذر');
    // Child generation label
    expect(markdown).toContain('الجيل 1');
    // Arabic chapter title
    expect(markdown).toContain('أفراد العائلة');
    // Source title
    expect(markdown).toContain('سجل النفوس');

    // Mojibake guard
    for (const fragment of MOJIBAKE_FRAGMENTS_MD) {
      expect(markdown).not.toContain(fragment);
    }
  });

  it('polishes markdown output by softening citation coverage and avoiding empty bibliography chapter', () => {
    const customModel: FamilyManuscriptModel = {
      id: 'manuscript-uuid-1234',
      title: 'Family Book of Al-Yafi',
      rootPersonId: 'p1',
      chapters: [
        {
          id: 'p-chapter',
          type: 'people',
          title: 'People',
          people: [
            {
              personId: 'p1',
              displayName: 'John Doe',
              citationCoverage: 0,
              citationCount: 0,
              facts: [
                { label: 'Birth Date', value: '1900-01-01', citationCount: 0 }
              ],
              sourceHighlights: []
            }
          ]
        },
        {
          id: 'ev-chapter',
          type: 'evidence',
          title: 'Bibliography',
          citations: []
        }
      ]
    };

    const markdownEn = MarkdownManuscriptRenderer.renderToMarkdown(customModel, { language: 'en' });

    // Empty bibliography skipped, rendered as inline note
    expect(markdownEn).not.toContain('## Bibliography');
    expect(markdownEn).toContain('*No sources have been linked yet.*');

    // Softened citation coverage
    expect(markdownEn).toContain('- Citation coverage: Sources: not added yet');

    const markdownAr = MarkdownManuscriptRenderer.renderToMarkdown(customModel, { language: 'ar' });
    expect(markdownAr).toContain('*لم تتم إضافة مصادر مرتبطة بعد.*');
    expect(markdownAr).toContain('- Citation coverage: المصادر: غير مضافة بعد');
  });
});
