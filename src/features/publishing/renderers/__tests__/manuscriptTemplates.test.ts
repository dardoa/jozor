import { describe, expect, it } from 'vitest';
import { CLASSIC_MANUSCRIPT_PRINT_TEMPLATE, type ManuscriptPrintTemplate, type ManuscriptVisualInsertDefinition } from '../manuscriptTemplates';
import { getEnabledVisualInserts } from '../visualInserts';

describe('Manuscript Templates & Visual Inserts Contract', () => {
  it('default template CLASSIC_MANUSCRIPT_PRINT_TEMPLATE has no active visual inserts', () => {
    expect(CLASSIC_MANUSCRIPT_PRINT_TEMPLATE.visualInserts).toEqual([]);
    const active = getEnabledVisualInserts(CLASSIC_MANUSCRIPT_PRINT_TEMPLATE.visualInserts, 'after-cover');
    expect(active).toEqual([]);
  });

  it('can declare and filter enabled visual inserts by placement', () => {
    const customInserts: readonly ManuscriptVisualInsertDefinition[] = [
      {
        kind: 'fan-chart',
        placement: 'after-cover',
        enabled: true,
        maxGenerations: 4,
      },
      {
        kind: 'ancestor-tree',
        placement: 'after-cover',
        enabled: false,
      },
      {
        kind: 'descendant-tree',
        placement: 'before-timeline',
        enabled: true,
      },
    ];

    const template: ManuscriptPrintTemplate = {
      id: 'custom-template',
      name: 'Custom Template',
      personCardVariant: 'classic-card',
      branchHeaderVariant: 'simple-divider',
      evidenceVariant: 'table',
      timelineVariant: 'vertical-list',
      visualInserts: customInserts,
    };

    // Filter enabled inserts for 'after-cover'
    const afterCover = getEnabledVisualInserts(template.visualInserts, 'after-cover');
    expect(afterCover).toHaveLength(1);
    expect(afterCover[0].kind).toBe('fan-chart');

    // Filter enabled inserts for 'before-timeline'
    const beforeTimeline = getEnabledVisualInserts(template.visualInserts, 'before-timeline');
    expect(beforeTimeline).toHaveLength(1);
    expect(beforeTimeline[0].kind).toBe('descendant-tree');

    // Filter enabled inserts for 'before-people' (none declared)
    const beforePeople = getEnabledVisualInserts(template.visualInserts, 'before-people');
    expect(beforePeople).toHaveLength(0);
  });

  it('ignores disabled inserts', () => {
    const customInserts: readonly ManuscriptVisualInsertDefinition[] = [
      {
        kind: 'fan-chart',
        placement: 'after-cover',
        enabled: false,
      },
    ];

    const active = getEnabledVisualInserts(customInserts, 'after-cover');
    expect(active).toEqual([]);
  });
});
