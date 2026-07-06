import { describe, expect, it } from 'vitest';
import type { FamilyManuscriptModel } from '../../types';
import { HtmlManuscriptRenderer } from '../HtmlManuscriptRenderer';
import { CLASSIC_MANUSCRIPT_PRINT_TEMPLATE } from '../manuscriptTemplates';
import { formatManuscriptDate } from '../../services/ManuscriptStructureBuilder';

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

// ---------------------------------------------------------------------------
// Arabic Encoding Regression Guard
// Renders the shared Arabic model and asserts the HTML output contains valid
// Arabic Unicode strings and no mojibake fragments (Ø, Ù, â€, â†).
// ---------------------------------------------------------------------------

const MOJIBAKE_FRAGMENTS_HTML = ['Ø', 'Ù', 'â€', 'â†', 'Ã‡'];

describe('HtmlManuscriptRenderer – Arabic encoding guard', () => {
  it('HTML output contains correct Arabic chapter labels and no mojibake', () => {
    const html = HtmlManuscriptRenderer.renderToHtml(model, { language: 'ar' });

    // Correct Arabic terms must appear in the rendered HTML
    expect(html).toContain('أفراد العائلة');
    expect(html).toContain('توثيق');       // coverage label always present
    expect(html).toContain('المصدر');      // evidence table header
    expect(html).toContain('الاستشهادات'); // evidence table header
    expect(html).toContain('الحقول');      // evidence table header
    expect(html).toContain('مصدر');        // singular source label in person card

    // Mojibake guard
    for (const fragment of MOJIBAKE_FRAGMENTS_HTML) {
      expect(html).not.toContain(fragment);
    }
  });

  it('HTML output contains correct Arabic metadata labels (root, generation, spouse) and no mojibake', () => {
    const arModelWithRelationships: FamilyManuscriptModel = {
      id: 'guard-relationships',
      title: 'مخطوط عائلة',
      rootPersonId: 'p-root',
      chapters: [{
        id: 'people',
        type: 'people',
        title: 'أفراد العائلة',
        people: [
          {
            personId: 'p-root',
            displayName: 'جذر العائلة',
            relationshipToRoot: 'root',
            generation: 0,
            citationCoverage: 0,
            citationCount: 0,
            facts: [],
            sourceHighlights: [],
          },
          {
            personId: 'p-spouse',
            displayName: 'زوجة الجذر',
            relationshipToRoot: 'spouse',
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
      }],
    };

    const html = HtmlManuscriptRenderer.renderToHtml(arModelWithRelationships, { language: 'ar' });

    expect(html).toContain('الجذر');
    expect(html).toContain('زوج/زوجة');
    expect(html).toContain('الجيل 1');

    for (const fragment of MOJIBAKE_FRAGMENTS_HTML) {
      expect(html).not.toContain(fragment);
    }
  });
});

// ---------------------------------------------------------------------------
// Template variant architecture tests
// ---------------------------------------------------------------------------

describe('HtmlManuscriptRenderer – template variant architecture', () => {
  it('default render (no template option) produces .person-card elements', () => {
    const html = HtmlManuscriptRenderer.renderToHtml(model, { language: 'ar' });
    expect(html).toContain('class="person-card"');
  });

  it('explicit classic-card template produces same output as default', () => {
    const htmlDefault = HtmlManuscriptRenderer.renderToHtml(model, { language: 'ar' });
    const htmlExplicit = HtmlManuscriptRenderer.renderToHtml(model, {
      language: 'ar',
      template: CLASSIC_MANUSCRIPT_PRINT_TEMPLATE,
    });
    expect(htmlExplicit).toBe(htmlDefault);
  });

  it('leaf-card variant falls back to classic-card and renders successfully', () => {
    const html = HtmlManuscriptRenderer.renderToHtml(model, {
      language: 'ar',
      template: { ...CLASSIC_MANUSCRIPT_PRINT_TEMPLATE, personCardVariant: 'leaf-card' },
    });
    // Falls back to classic-card — output still contains person-card markup
    expect(html).toContain('class="person-card"');
    expect(html).toContain('رمضان القربي');
  });

  it('photo-card variant falls back to classic-card and renders successfully', () => {
    const html = HtmlManuscriptRenderer.renderToHtml(model, {
      language: 'ar',
      template: { ...CLASSIC_MANUSCRIPT_PRINT_TEMPLATE, personCardVariant: 'photo-card' },
    });
    expect(html).toContain('class="person-card"');
  });

  it('research-card variant falls back to classic-card and renders successfully', () => {
    const html = HtmlManuscriptRenderer.renderToHtml(model, {
      language: 'ar',
      template: { ...CLASSIC_MANUSCRIPT_PRINT_TEMPLATE, personCardVariant: 'research-card' },
    });
    expect(html).toContain('class="person-card"');
  });

  it('compact-row variant falls back to classic-card and renders successfully', () => {
    const html = HtmlManuscriptRenderer.renderToHtml(model, {
      language: 'ar',
      template: { ...CLASSIC_MANUSCRIPT_PRINT_TEMPLATE, personCardVariant: 'compact-row' },
    });
    expect(html).toContain('class="person-card"');
  });

  it('passing a template with enabled/disabled visual inserts does not throw and renders core chapters', () => {
    const html = HtmlManuscriptRenderer.renderToHtml(model, {
      language: 'ar',
      template: {
        ...CLASSIC_MANUSCRIPT_PRINT_TEMPLATE,
        visualInserts: [
          { kind: 'fan-chart', placement: 'after-cover', enabled: true },
          { kind: 'ancestor-tree', placement: 'before-people', enabled: false },
          { kind: 'branch-mini-tree', placement: 'before-branch', enabled: true },
          { kind: 'descendant-tree', placement: 'before-timeline', enabled: true },
        ],
      },
    });

    // Output still renders core elements properly
    expect(html).toContain('مخطوط عائلة القربي');
    expect(html).toContain('أفراد العائلة');
    expect(html).toContain('الخط الزمني');
    expect(html).toContain('المراجع');
  });
});

describe('HtmlManuscriptRenderer – Print Layout Stability', () => {
  it('contains the newly introduced layout stability CSS patterns', () => {
    const html = HtmlManuscriptRenderer.renderToHtml(model, { language: 'ar' });

    expect(html).toContain('print-color-adjust: exact');
    expect(html).toContain('overflow-wrap: anywhere');
    expect(html).toContain('break-inside: avoid');
    expect(html).toContain('table-layout: fixed');
    expect(html).toContain('.page-footer');
    expect(html).toContain('grid-template-columns: minmax(86px, 120px) minmax(0, 1fr)');
  });

  it('successfully renders long Arabic names and source titles without throwing', () => {
    const modelWithLongTitles: FamilyManuscriptModel = {
      id: 'long-names-test',
      title: 'مخطوط عائلة بن عبد الرحمن بن محمد بن علي آل القاضي الشريف الحسيني الأزهري الملقب بالفاكهي البغدادي الشافعي',
      rootPersonId: 'p-long',
      chapters: [
        {
          id: 'people',
          type: 'people',
          title: 'أفراد العائلة',
          people: [
            {
              personId: 'p-long',
              displayName: 'سيد محمد بن عبد الرحمن بن محمد بن علي بن أحمد بن عبدالله آل القاضي الشريف الحسيني الأزهري',
              citationCoverage: 100,
              citationCount: 1,
              facts: [
                { label: 'مكان الميلاد', value: 'حارة الأشراف بالبلدة القديمة بمكة المكرمة، المملكة العربية السعودية', citationCount: 1 }
              ],
              sourceHighlights: [
                { sourceId: 's-long', title: 'كتاب السلوك لمعرفة دول الملوك وتاريخ الخلفاء والأمراء الأعيان من بني هاشم وقريش المجلد الرابع عشر من الطبعة الأولى بمصر سنة ١٣٢٨ هجرية', citationCount: 1 }
              ]
            }
          ]
        },
        {
          id: 'evidence',
          type: 'evidence',
          title: 'المراجع',
          citations: [
            { citationId: 'c-long', sourceId: 's-long', sourceTitle: 'كتاب السلوك لمعرفة دول الملوك وتاريخ الخلفاء والأمراء الأعيان من بني هاشم وقريش المجلد الرابع عشر من الطبعة الأولى بمصر سنة ١٣٢٨ هجرية', targetId: 'p-long', targetField: 'person.birth.place' }
          ]
        }
      ]
    };

    const html = HtmlManuscriptRenderer.renderToHtml(modelWithLongTitles, { language: 'ar' });

    expect(html).toContain('الملقب بالفاكهي');
    expect(html).toContain('سيد محمد بن عبد الرحمن');
    expect(html).toContain('حارة الأشراف بالبلدة القديمة');
    expect(html).toContain('كتاب السلوك لمعرفة دول الملوك');
  });

  it('polishes the cover page by hiding UUID and rendering a template introduction', () => {
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

    const htmlEn = HtmlManuscriptRenderer.renderToHtml(customModel, { language: 'en' });

    // UUID should not be visible in text but exist in HTML comment
    expect(htmlEn).not.toContain('<p class="cover-subtitle">manuscript-uuid-1234</p>');
    expect(htmlEn).toContain('<!-- manuscript-id: manuscript-uuid-1234 -->');

    // Family name introduction should render
    expect(htmlEn).toContain('gathers the Al-Yafi family branch');

    // Empty bibliography should be avoided and replaced by a compact inline note
    expect(htmlEn).not.toContain('class="page chapter-page evidence-chapter"');
    expect(htmlEn).toContain('class="manuscript-sources-note"');
    expect(htmlEn).toContain('No sources have been linked yet.');

    // Citation coverage 0% should be softened
    expect(htmlEn).toContain('No sources yet');
    expect(htmlEn).not.toContain('0% documented');

    const htmlAr = HtmlManuscriptRenderer.renderToHtml({
      ...customModel,
      title: 'كتاب عائلة القربي'
    }, { language: 'ar' });
    expect(htmlAr).toContain('يجمع هذا المخطوط أفراد عائلة القربي');
    expect(htmlAr).toContain('لم تتم إضافة مصادر مرتبطة بعد.');
    expect(htmlAr).toContain('لا توجد مصادر بعد');
  });

  it('correctly formats approximate and placeholder dates using formatManuscriptDate', () => {
    // YYYY-01-01 placeholder
    expect(formatManuscriptDate('1900-01-01', 'en')).toBe('1900');
    expect(formatManuscriptDate('1950-01-01', 'en', true)).toBe('about 1950');
    expect(formatManuscriptDate('1950-01-01', 'ar', true)).toBe('حوالي 1950');

    // Year only
    expect(formatManuscriptDate('1920', 'en')).toBe('1920');
    expect(formatManuscriptDate('1920', 'en', true)).toBe('about 1920');
    expect(formatManuscriptDate('1920', 'ar', true)).toBe('حوالي 1920');

    // Already approximate string
    expect(formatManuscriptDate('about 1930', 'en')).toBe('about 1930');
    expect(formatManuscriptDate('about 1930', 'ar')).toBe('حوالي 1930');
    expect(formatManuscriptDate('حوالي 1940', 'en')).toBe('about 1940');

    // Standard exact date remains exact
    expect(formatManuscriptDate('1984-05-01', 'en')).toBe('1984-05-01');
    expect(formatManuscriptDate('1984-05-01', 'en', true)).toBe('about 1984-05-01');
  });
});
