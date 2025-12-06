
import { Person, Language } from '../types';

interface AncestorPath {
    id: string;
    distance: number;
}

// Get all ancestors with their distance from start person (BFS)
const getAncestors = (personId: string, people: Record<string, Person>): Record<string, number> => {
    const ancestors: Record<string, number> = {};
    const queue: AncestorPath[] = [{ id: personId, distance: 0 }];
    const visited = new Set<string>();

    while (queue.length > 0) {
        const { id, distance } = queue.shift()!;
        if (visited.has(id)) continue;
        visited.add(id);
        
        ancestors[id] = distance;
        
        const person = people[id];
        if (person) {
            person.parents.forEach(parentId => {
                queue.push({ id: parentId, distance: distance + 1 });
            });
        }
    }
    return ancestors;
};

export const calculateRelationship = (id1: string, id2: string, people: Record<string, Person>, lang: Language): { text: string, commonAncestor?: string } => {
    if (id1 === id2) return { text: lang === 'en' ? "Same person" : "نفس الشخص" };

    const ancestors1 = getAncestors(id1, people);
    const ancestors2 = getAncestors(id2, people);
    
    let lowestDistance = Infinity;
    let commonAncestorId: string | null = null;
    let dist1 = 0;
    let dist2 = 0;

    // Find LCA (Lowest Common Ancestor)
    Object.keys(ancestors1).forEach(ancId => {
        if (ancestors2.hasOwnProperty(ancId)) {
            const d1 = ancestors1[ancId];
            const d2 = ancestors2[ancId];
            const totalDist = d1 + d2;
            
            // Prefer closest total distance, then check if closer to one side
            if (totalDist < lowestDistance) {
                lowestDistance = totalDist;
                commonAncestorId = ancId;
                dist1 = d1;
                dist2 = d2;
            }
        }
    });

    // Check for Spouse relationship
    const p1 = people[id1];
    if (p1 && p1.spouses.includes(id2)) {
         return { text: lang === 'en' ? "Spouse" : "زوج/زوجة" };
    }

    if (!commonAncestorId) {
        return { text: lang === 'en' ? "No direct relationship found" : "لا توجد قرابة مباشرة" };
    }

    const enTerms: Record<string, string> = {};
    const arTerms: Record<string, string> = {};

    // Logic based on distance up (dist1) and distance down (dist2)
    
    // Direct Descendant/Ancestor
    if (dist1 === 0) {
        if (dist2 === 1) return { text: lang === 'en' ? "Child" : "ابن/ابنة", commonAncestor: commonAncestorId };
        if (dist2 === 2) return { text: lang === 'en' ? "Grandchild" : "حفيد/حفيدة", commonAncestor: commonAncestorId };
        if (dist2 === 3) return { text: lang === 'en' ? "Great-Grandchild" : "ابن حفيد", commonAncestor: commonAncestorId };
    }
    if (dist2 === 0) {
        if (dist1 === 1) return { text: lang === 'en' ? "Parent" : "أب/أم", commonAncestor: commonAncestorId };
        if (dist1 === 2) return { text: lang === 'en' ? "Grandparent" : "جد/جدة", commonAncestor: commonAncestorId };
        if (dist1 === 3) return { text: lang === 'en' ? "Great-Grandparent" : "أب الجد", commonAncestor: commonAncestorId };
    }

    // Siblings
    if (dist1 === 1 && dist2 === 1) return { text: lang === 'en' ? "Sibling" : "أخ/أخت", commonAncestor: commonAncestorId };

    // Aunt/Uncle / Niece/Nephew
    if (dist1 === 1 && dist2 === 2) return { text: lang === 'en' ? "Niece/Nephew" : "ابن أخ/أخت", commonAncestor: commonAncestorId };
    if (dist1 === 2 && dist2 === 1) return { text: lang === 'en' ? "Aunt/Uncle" : "عم/خال/عمة/خالة", commonAncestor: commonAncestorId };

    // Cousins
    if (dist1 === 2 && dist2 === 2) return { text: lang === 'en' ? "First Cousin" : "ابن عم/خال", commonAncestor: commonAncestorId };
    if (dist1 === 3 && dist2 === 3) return { text: lang === 'en' ? "Second Cousin" : "ابن عم (درجة ثانية)", commonAncestor: commonAncestorId };
    
    // Extended Logic fallback
    const generationDiff = Math.abs(dist1 - dist2);
    if (lang === 'en') {
        if (dist1 > 2 && dist2 > 2) return { text: "Distant Cousin", commonAncestor: commonAncestorId };
        return { text: "Relative", commonAncestor: commonAncestorId };
    } else {
        return { text: "قريب", commonAncestor: commonAncestorId };
    }
};
