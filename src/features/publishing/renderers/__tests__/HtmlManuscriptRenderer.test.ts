import { describe, expect, it } from 'vitest';
import type { FamilyManuscriptModel } from '../../types';
import { HtmlManuscriptRenderer } from '../HtmlManuscriptRenderer';

const model: FamilyManuscriptModel = {
  id: 'manuscript-test',
  title: 'مخطوط عائلة القربي',
  rootPersonId: 'p1',
  chapters: [
    {
      id: 'overview',
      type: 'overview',
      title: 'Branch overview',
      branchSummaries: [
        { branchRootPersonId: 'branch-1', label: 'Saleh branch', personCount: 2 },
      ],
    },
    {
      id: 'people',
      type: 'people',
      title: 'أفراد العائلة',
      people: [
        {
          personId: 'p1',
          displayName: 'رمضان القربي',
          photoUrl: 'https://example.com/ramadan.jpg',
          narrative: 'رمضان القربي وُلد في كفرنبل وتظهر هذه المسودة عند تفعيل السرد.',
          citationCoverage: 50,
          citationCount: 2,
          facts: [
            { label: 'مكان الميلاد', value: 'كفرنبل، سوريا', citationCount: 1 },
            { label: 'الإقامة', value: 'الرياض، السعودية', citationCount: 0 },
          ],
          sourceHighlights: [
            { sourceId: 's1', title: 'سجل النفوس', citationCount: 2 },
          ],
        },
      ],
    },
    {
      id: 'timeline',
      type: 'timeline',
      title: 'الخط الزمني',
      timeline: [
        { personId: 'p1', personName: 'رمضان القربي', title: 'ولادة', date: '1895-01-01', place: 'كفرنبل، سوريا' },
      ],
    },
    {
      id: 'evidence',
      type: 'evidence',
      title: 'المراجع',
      citations: [
        { citationId: 'c1', sourceId: 's1', sourceTitle: 'سجل النفوس', targetId: 'p1', targetField: 'person.birth.place' },
        { citationId: 'c2', sourceId: 's1', sourceTitle: 'سجل النفوس', targetId: 'p1', targetField: 'person.birth.date' },
      ],
    },
  ],
};

describe('HtmlManuscriptRenderer', () => {
  it('renders a printable RTL manuscript with Arabic font and evidence sections', () => {
    const html = HtmlManuscriptRenderer.renderToHtml(model, { language: 'ar' });

    expect(html).toContain('dir="rtl"');
    expect(html).toContain('/fonts/Amiri-Regular.ttf');
    expect(html).toContain('Branch overview');
    expect(html).toContain('Saleh branch');
    expect(html).toContain('branch-overview');
    expect(html).toContain('رمضان القربي');
    expect(html).toContain('https://example.com/ramadan.jpg');
    expect(html).toContain('هذه المسودة');
    expect(html).toContain('كفرنبل، سوريا');
    expect(html).toContain('سجل النفوس');
    expect(html).toContain('50% توثيق');
    expect(html).toContain('المصدر');
    expect(html).toContain('page-break-inside: avoid');
  });

  it('renders English labels for LTR manuscripts', () => {
    const html = HtmlManuscriptRenderer.renderToHtml(model, { language: 'en' });

    expect(html).toContain('dir="ltr"');
    expect(html).toContain('2 people');
    expect(html).toContain('50% documented');
    expect(html).toContain('Person entries with key facts and citation coverage.');
    expect(html).toContain('<th>Source</th>');
  });

  it('renders family context labels for person entries', () => {
    const html = HtmlManuscriptRenderer.renderToHtml({
      id: 'context-test',
      title: 'Family Context Test',
      rootPersonId: 'p1',
      chapters: [{
        id: 'people',
        type: 'people',
        title: 'People',
        people: [{
          personId: 'p1',
          displayName: 'Amina Saleh',
          familyContext: {
            kind: 'descendant',
            generationDepth: 1,
            label: 'Generation 2',
            breadcrumb: ['Root Family', 'Amina Saleh'],
            branchRootPersonId: 'person-branch-1',
            branchLabel: 'Saleh branch',
          },
          citationCoverage: 0,
          citationCount: 0,
          facts: [],
          sourceHighlights: [],
        }],
      }],
    }, { language: 'en' });

    expect(html).toContain('Generation 2');
    expect(html).toContain('Root Family › Amina Saleh');
    expect(html).toContain('person-card__breadcrumb');
    expect(html).toContain('person-card__context');
    expect(html).toContain('Saleh branch');
    expect(html).toContain('branch-divider');
  });

  it('accepts a manuscript theme without changing manuscript content', () => {
    const html = HtmlManuscriptRenderer.renderToHtml(model, {
      language: 'ar',
      theme: {
        colors: {
          pageBackground: '#ffffff',
          paperBackground: '#fefefe',
          cardBackground: '#ffffff',
          text: '#111111',
          mutedText: '#555555',
          accent: '#123456',
          border: '#dddddd',
        },
        typography: {
          fontFamily: '"JozorArabic", serif',
          titleSize: '28px',
          headingSize: '17px',
          bodySize: '12px',
          lineHeight: '1.4',
          kickerLetterSpacing: '0.04em',
        },
        layout: {
          pageMargin: '18mm',
          pagePadding: '24mm 18mm',
          cardPadding: '12px',
          cardRadius: '8px',
          gridGap: '10px',
        },
      },
    });

    expect(html).toContain('رمضان القربي');
    expect(html).toContain('color: #123456');
    expect(html).toContain('padding: 24mm 18mm');
  });

  it('renders relationship metadata when provided', () => {
    const html = HtmlManuscriptRenderer.renderToHtml({
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

    expect(html).toContain('person-card__relationship');
    expect(html).toContain('Root');
    expect(html).toContain('Spouse');
    expect(html).toContain('Generation 1');
  });

  it('renders people in the exact pre-ordered narrative sequence and maintains labels', () => {
    const html = HtmlManuscriptRenderer.renderToHtml({
      id: 'flow-test',
      title: 'Narrative Flow Test',
      rootPersonId: 'root',
      chapters: [{
        id: 'people',
        type: 'people',
        title: 'أفراد العائلة',
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
    const idxRoot = html.indexOf('Z Root');
    const idxSpouse = html.indexOf('A Spouse');
    const idxChild1 = html.indexOf('Y First Child');
    const idxSpouseChild1 = html.indexOf('B Child Spouse');
    const idxGrandchild = html.indexOf('X Grandchild');
    const idxChild2 = html.indexOf('C Second Child');

    expect(idxRoot).toBeGreaterThan(-1);
    expect(idxSpouse).toBeGreaterThan(idxRoot);
    expect(idxChild1).toBeGreaterThan(idxSpouse);
    expect(idxSpouseChild1).toBeGreaterThan(idxChild1);
    expect(idxGrandchild).toBeGreaterThan(idxSpouseChild1);
    expect(idxChild2).toBeGreaterThan(idxGrandchild);

    // Assert relationship labels presence
    expect(html).toContain('Root');
    expect(html).toContain('Spouse');
    expect(html).toContain('Generation 1');
    expect(html).toContain('Generation 2');
  });
});
