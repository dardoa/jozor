import { describe, expect, it } from 'vitest';
import type { FamilyManuscriptModel } from '../../types';
import { HtmlManuscriptRenderer } from '../HtmlManuscriptRenderer';

const model: FamilyManuscriptModel = {
  id: 'manuscript-test',
  title: 'مخطوط عائلة القربي',
  rootPersonId: 'p1',
  chapters: [
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
          },
          citationCoverage: 0,
          citationCount: 0,
          facts: [],
          sourceHighlights: [],
        }],
      }],
    }, { language: 'en' });

    expect(html).toContain('Generation 2');
    expect(html).toContain('person-card__context');
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
});
