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
    expect(html).toContain('كفرنبل، سوريا');
    expect(html).toContain('سجل النفوس');
    expect(html).toContain('page-break-inside: avoid');
  });
});
