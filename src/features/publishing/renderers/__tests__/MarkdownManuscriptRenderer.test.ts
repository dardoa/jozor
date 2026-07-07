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
          relationshipToRoot: 'grandchild',
          generation: 2,
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

const MOJIBAKE_FRAGMENTS_MD = [
  'Ã', 'Â', '¢', 'ã', 'ä', 'å', 'æ', 'ç', 'è', 'é',
  'ê', 'ë', 'ì', 'í', 'î', 'ï', 'ð', 'ñ', 'ò', 'ó',
];

const arMarkdownModel: FamilyManuscriptModel = {
  id: 'ar-manuscript',
  title: 'مخطوط عائلة القربي',
  rootPersonId: 'p-root',
  chapters: [
    {
      id: 'people',
      type: 'people',
      title: 'أفراد العائلة',
      people: [
        {
          personId: 'p-root',
          displayName: 'الجذر الأول',
          relationshipToRoot: 'root',
          generation: 0,
          citationCoverage: 0,
          citationCount: 0,
          facts: [],
          sourceHighlights: [],
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

describe('MarkdownManuscriptRenderer', () => {
  it('renders a FamilyManuscriptModel as portable Markdown', () => {
    const markdown = MarkdownManuscriptRenderer.renderToMarkdown(model);

    expect(markdown).toContain('# Family Manuscript: Example');
    expect(markdown).toContain('- Manuscript ID: manuscript\\-1');
    expect(markdown).toContain('## Manuscript Introduction');
    expect(markdown).toContain('## Branch overview');
    expect(markdown).toContain('- Saleh branch - 2 people');
    expect(markdown).toContain('## People');
    expect(markdown).toContain('#### Branch: Saleh branch');
    expect(markdown).toContain('### Amina Saleh');
    expect(markdown).toContain('- Relationship to root: Generation 2');
    expect(markdown).toContain('- Manuscript generation (Family context): Generation 2');
    expect(markdown).toContain('- Family path: Root Family > Amina Saleh');
    expect(markdown).toContain('- Source status: 50%');
    expect(markdown).toContain('- **Birth place:** Kafranbel, Syria (1 citation)');
    expect(markdown).toContain('- Civil registry (2)');
    expect(markdown).toContain('## Timeline');
    expect(markdown).toContain('- 1950: **Amina Saleh** — Birth — Kafranbel, Syria');
    expect(markdown).toContain('## References and Sources');
    expect(markdown).toContain('- Civil registry — 2 citations; fields: person\\.birth\\.date, person\\.birth\\.place');
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
    const customMetadataModel: FamilyManuscriptModel = {
      id: 'metadata-test',
      title: 'Relationship Metadata Test',
      rootPersonId: 'p1',
      chapters: [
        {
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
            },
          ],
        },
      ],
    };

    const markdown = MarkdownManuscriptRenderer.renderToMarkdown(customMetadataModel, { language: 'en' });

    expect(markdown).toContain('- Relationship to root: Root');
    expect(markdown).toContain('- Relationship to root: Spouse');
    expect(markdown).toContain('- Relationship to root: Generation 1');
  });

  it('renders people in the exact pre-ordered narrative sequence and maintains labels', () => {
    const orderModel: FamilyManuscriptModel = {
      id: 'flow-test',
      title: 'Narrative Flow Test',
      rootPersonId: 'root',
      chapters: [
        {
          id: 'people-chap',
          type: 'people',
          title: 'People',
          people: [
            { personId: 'root', displayName: 'Z Root', relationshipToRoot: 'root', generation: 0, citationCoverage: 0, citationCount: 0, facts: [], sourceHighlights: [] },
            { personId: 'spouse', displayName: 'A Spouse', relationshipToRoot: 'spouse', generation: 0, citationCoverage: 0, citationCount: 0, facts: [], sourceHighlights: [] },
            { personId: 'child1', displayName: 'Y First Child', relationshipToRoot: 'child', generation: 1, citationCoverage: 0, citationCount: 0, facts: [], sourceHighlights: [] },
            { personId: 'child1-spouse', displayName: 'B Child Spouse', relationshipToRoot: 'spouse', generation: 0, citationCoverage: 0, citationCount: 0, facts: [], sourceHighlights: [] },
            { personId: 'grandchild', displayName: 'X Grandchild', relationshipToRoot: 'grandchild', generation: 2, citationCoverage: 0, citationCount: 0, facts: [], sourceHighlights: [] },
            { personId: 'child2', displayName: 'C Second Child', relationshipToRoot: 'child', generation: 1, citationCoverage: 0, citationCount: 0, facts: [], sourceHighlights: [] },
          ],
        },
      ],
    };

    const markdown = MarkdownManuscriptRenderer.renderToMarkdown(orderModel, { language: 'en' });

    // Assert relationship labels presence
    expect(markdown).toContain('- Relationship to root: Root');
    expect(markdown).toContain('- Relationship to root: Spouse');
    expect(markdown).toContain('- Relationship to root: Generation 1');
    expect(markdown).toContain('- Relationship to root: Generation 2');

    // Assert narrative rendering follows seq order: root -> spouse -> child1 -> child1-spouse -> grandchild -> child2
    const rootIdx = markdown.indexOf('Z Root');
    const spouseIdx = markdown.indexOf('A Spouse');
    const child1Idx = markdown.indexOf('Y First Child');
    const child1SpouseIdx = markdown.indexOf('B Child Spouse');
    const grandchildIdx = markdown.indexOf('X Grandchild');
    const child2Idx = markdown.indexOf('C Second Child');

    expect(rootIdx).toBeLessThan(spouseIdx);
    expect(spouseIdx).toBeLessThan(child1Idx);
    expect(child1Idx).toBeLessThan(child1SpouseIdx);
    expect(child1SpouseIdx).toBeLessThan(grandchildIdx);
    expect(grandchildIdx).toBeLessThan(child2Idx);
  });
});

describe('MarkdownManuscriptRenderer – Arabic encoding guard', () => {
  it('Markdown output contains correct Arabic relationship labels and no mojibake', () => {
    const markdown = MarkdownManuscriptRenderer.renderToMarkdown(arMarkdownModel, { language: 'ar' });

    // Arabic relationship prefix must appear
    expect(markdown).toContain('العلاقة مع الجذر');
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

    // Empty bibliography has proper references section title
    expect(markdownEn).toContain('## References and Sources');
    expect(markdownEn).toContain('No linked sources have been added yet.');

    // Softened citation coverage
    expect(markdownEn).toContain('- Source status: not added yet');

    const markdownAr = MarkdownManuscriptRenderer.renderToMarkdown(customModel, { language: 'ar' });
    expect(markdownAr).toContain('## المراجع والمصادر');
    expect(markdownAr).toContain('لم تتم إضافة مصادر مرتبطة بعد.');
    expect(markdownAr).toContain('- حالة المصادر: المصادر غير مضافة بعد');
  });
});
