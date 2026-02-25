import { Person, TreeSettings } from '../../types';

export interface FanChartDatum {
    id: string;
    person: Person;
    depth: number;
    children?: FanChartDatum[];
}

/**
 * Unified ancestry builder for all layout engines.
 * respects showDeceased filtering and generationLimit.
 */
export function buildAncestry(
    id: string,
    depth: number,
    people: Record<string, Person>,
    depthLimit: number,
    settings: TreeSettings,
    onTruncated?: () => void
): FanChartDatum | null {
    if (depth >= depthLimit) {
        if (onTruncated) onTruncated();
        return null;
    }

    const person = people[id];
    if (!person) return null;

    // Filter by Deceased status
    if (settings.showDeceased === false && person.isDeceased) {
        return null;
    }

    const node: FanChartDatum = {
        id: person.id,
        person,
        depth
    };

    const fatherId = person.parents.find((pid: string) => people[pid]?.gender === 'male');
    const motherId = person.parents.find((pid: string) => people[pid]?.gender === 'female');

    const children: FanChartDatum[] = [];

    if (fatherId) {
        const fNode = buildAncestry(fatherId, depth + 1, people, depthLimit, settings, onTruncated);
        if (fNode) children.push(fNode);
    }

    if (motherId) {
        const mNode = buildAncestry(motherId, depth + 1, people, depthLimit, settings, onTruncated);
        if (mNode) children.push(mNode);
    }

    if (children.length > 0) {
        node.children = children;
    }

    return node;
}
