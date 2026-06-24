import type { Person, RelationshipEdge } from '../../../types';
import type { PublicationDocument, PublicationSection, PublicationBlock, PublicationAsset } from '../types';
import { PublishingRelationshipAdapter } from '../services/PublishingRelationshipAdapter';

export interface TimelineEventPayload {
  personId: string;
  personName: string;
  date: string;
  type: 'birth' | 'death' | 'marriage' | 'custom';
  title: string;
  place?: string;
  description?: string;
}

export class TimelineBuilder {
  /**
   * Aggregates birth, death, marriage, and custom events for the selected family tree
   * and sorts them chronologically to produce a timeline document.
   */
  public static build(
    people: Record<string, Person>,
    rootPersonId?: string,
    relationshipEdges?: Record<string, RelationshipEdge> | readonly RelationshipEdge[]
  ): PublicationDocument {
    const events: TimelineEventPayload[] = [];

    const getFullName = (p: Person) => {
      return [p.title, p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ').trim() || p.nickName || 'Unnamed Person';
    };

    let targetPeople = Object.values(people);
    if (rootPersonId && people[rootPersonId]) {
      const branchGraph = PublishingRelationshipAdapter.buildBranchGraph(people, rootPersonId, relationshipEdges);
      targetPeople = Object.values(branchGraph.people);
    }

    targetPeople.forEach((p) => {
      const pName = getFullName(p);

      if (p.birthDate) {
        events.push({
          personId: p.id,
          personName: pName,
          date: p.birthDate,
          type: 'birth',
          title: `ولادة ${pName}`,
          place: p.birthPlace || undefined,
        });
      }

      if (p.marriageDate) {
        events.push({
          personId: p.id,
          personName: pName,
          date: p.marriageDate,
          type: 'marriage',
          title: `زواج ${pName}`,
          place: p.marriagePlace || undefined,
        });
      }

      if (p.isDeceased && p.deathDate) {
        events.push({
          personId: p.id,
          personName: pName,
          date: p.deathDate,
          type: 'death',
          title: `وفاة ${pName}`,
          place: p.deathPlace || undefined,
        });
      }

      if (p.events && Array.isArray(p.events)) {
        p.events.forEach((ev) => {
          if (ev.date) {
            events.push({
              personId: p.id,
              personName: pName,
              date: ev.date,
              type: 'custom',
              title: ev.title,
              place: ev.place || undefined,
              description: ev.description || undefined,
            });
          }
        });
      }
    });

    events.sort((a, b) => a.date.localeCompare(b.date));

    const eventAssets: PublicationAsset[] = events.map((ev, idx) => ({
      id: `asset-event-${idx}-${ev.personId}`,
      type: 'event',
      payload: ev,
    }));

    const timelineBlock: PublicationBlock = {
      id: `block-timeline-${crypto.randomUUID()}`,
      type: 'timeline',
      assets: eventAssets,
    };

    const timelineSection: PublicationSection = {
      id: `section-timeline-${crypto.randomUUID()}`,
      type: 'timeline',
      blocks: [timelineBlock],
    };

    const rootPerson = rootPersonId ? people[rootPersonId] : null;
    const docTitle = rootPerson
      ? `الخط الزمني لعائلة ${getFullName(rootPerson)}`
      : 'الخط الزمني العام للعائلة';

    const coverBlock: PublicationBlock = {
      id: `block-cover-${crypto.randomUUID()}`,
      type: 'header',
      assets: [
        {
          id: `asset-cover-title-${crypto.randomUUID()}`,
          type: 'text',
          payload: {
            text: docTitle,
            subtext: 'تم التوليد بواسطة محرك جذور للنشر',
          },
        },
      ],
    };

    const coverSection: PublicationSection = {
      id: `section-cover-${crypto.randomUUID()}`,
      type: 'cover',
      blocks: [coverBlock],
    };

    return {
      id: `doc-${crypto.randomUUID()}`,
      title: docTitle,
      theme: 'classic',
      type: 'single-page',
      sections: [coverSection, timelineSection],
    };
  }
}
