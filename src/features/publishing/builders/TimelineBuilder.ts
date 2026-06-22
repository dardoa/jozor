import type { Person } from '../../../types';
import type { PublicationDocument, PublicationSection, PublicationBlock, PublicationAsset } from '../types';

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
    rootPersonId?: string // If provided, we can filter to a specific subset of people (descendants or ancestors), otherwise all people
  ): PublicationDocument {
    const events: TimelineEventPayload[] = [];

    // Helper to build full name
    const getFullName = (p: Person) => {
      return [p.title, p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ').trim() || p.nickName || 'Unnamed Person';
    };

    // Filter people subset if rootPersonId is specified
    let targetPeople = Object.values(people);
    if (rootPersonId && people[rootPersonId]) {
      const subsetIds = new Set<string>();
      const visited = new Set<string>();

      const collectDescendants = (id: string) => {
        if (visited.has(id)) return;
        visited.add(id);
        const p = people[id];
        if (!p) return;
        subsetIds.add(id);
        
        // Include spouses of descendants in the timeline
        if (p.spouses) {
          p.spouses.forEach((sid) => {
            if (people[sid]) {
              subsetIds.add(sid);
            }
          });
        }

        if (p.children) {
          p.children.forEach((cid) => collectDescendants(cid));
        }
      };

      collectDescendants(rootPersonId);
      targetPeople = targetPeople.filter((p) => subsetIds.has(p.id));
    }

    targetPeople.forEach((p) => {
      const pName = getFullName(p);

      // 1. Birth Event
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

      // 2. Marriage Event
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

      // 3. Death Event
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

      // 4. Custom Events
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

    // Sort events chronologically (YYYY-MM-DD strings are naturally sortable)
    events.sort((a, b) => a.date.localeCompare(b.date));

    // Map to PublicationAssets
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

    // Cover Section
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
