import { calculatePedigreeLayout } from '../utils/layout/pedigreeLayout';
const makeLinkKey = (sourcePersonId, targetPersonId) => `parent-child:${sourcePersonId}->${targetPersonId}`;
const sortUnique = (values) => Array.from(new Set(values)).sort();
const resolveOldPedigreeParents = (person, people, showDeceased) => {
    const isVisible = (parentId) => {
        const candidate = people[parentId];
        if (!candidate)
            return false;
        if (!showDeceased && candidate.isDeceased)
            return false;
        return true;
    };
    let fatherId = person.parents.find((pid) => isVisible(pid) && people[pid]?.gender === 'male');
    if (!fatherId && person.parents.length > 0) {
        fatherId = person.parents.find((pid) => isVisible(pid));
    }
    let motherId = person.parents.find((pid) => isVisible(pid) && people[pid]?.gender === 'female');
    if (!motherId && person.parents.length > 1) {
        motherId = person.parents.find((pid) => isVisible(pid) && pid !== fatherId);
    }
    return [fatherId, motherId].filter((id) => !!id);
};
const collectOldPedigreeFilteredPeople = (people, focusPersonId, settings) => {
    const filtered = new Set();
    const visited = new Set();
    const stack = [focusPersonId];
    while (stack.length > 0) {
        const currentId = stack.pop();
        if (visited.has(currentId))
            continue;
        visited.add(currentId);
        const person = people[currentId];
        if (!person)
            continue;
        for (const parentId of person.parents) {
            const parent = people[parentId];
            if (!parent)
                continue;
            if (!settings.showDeceased && parent.isDeceased) {
                filtered.add(parentId);
                continue;
            }
            stack.push(parentId);
        }
    }
    return sortUnique(filtered);
};
const buildOldGenerationMap = (people, focusPersonId, settings) => {
    const generationByPersonId = {};
    const visited = new Set();
    const visit = (personId, generation) => {
        if (visited.has(personId))
            return;
        const person = people[personId];
        if (!person)
            return;
        if (!settings.showDeceased && person.isDeceased)
            return;
        visited.add(personId);
        generationByPersonId[personId] = generation;
        const parents = resolveOldPedigreeParents(person, people, settings.showDeceased);
        for (const parentId of parents) {
            visit(parentId, generation + 1);
        }
    };
    visit(focusPersonId, 0);
    return generationByPersonId;
};
export const normalizeOldPedigreeSemanticSnapshot = ({ people, focusPersonId, settings, }) => {
    const layout = calculatePedigreeLayout(people, focusPersonId, settings);
    const generationByPersonId = buildOldGenerationMap(people, focusPersonId, settings);
    const nodes = layout.nodes.map((node) => ({
        visibleNodeId: String(node.id),
        personId: String(node.id),
        role: node.type,
        generation: generationByPersonId[String(node.id)] ?? (node.type === 'focus' ? 0 : -1),
        isReference: false,
    }));
    const links = layout.links.map((link) => {
        const sourcePersonId = typeof link.source === 'string' ? link.source : link.source.id;
        const targetPersonId = typeof link.target === 'string' ? link.target : link.target.id;
        return {
            key: makeLinkKey(sourcePersonId, targetPersonId),
            sourcePersonId,
            targetPersonId,
        };
    });
    const visiblePersonIds = sortUnique(nodes.map((node) => node.personId));
    const repeatedPersonIds = sortUnique(nodes
        .map((node) => node.personId)
        .filter((personId, index, all) => all.indexOf(personId) !== index));
    const ancestorPersonIds = sortUnique(nodes.filter((node) => node.personId !== focusPersonId).map((node) => node.personId));
    return {
        mode: 'pedigree',
        focusPersonId,
        rootPersonId: focusPersonId,
        visiblePersonIds,
        visibleNodeIds: sortUnique(nodes.map((node) => node.visibleNodeId)),
        visibleLinks: sortUnique(links.map((link) => link.key)),
        nodes,
        links,
        generationDepth: nodes.reduce((max, node) => Math.max(max, node.generation), 0),
        filteredOutPersonIds: collectOldPedigreeFilteredPeople(people, focusPersonId, settings),
        repeatedPersonIds,
        ancestorPersonIds,
    };
};
const visibleNodeToSnapshot = (node) => ({
    visibleNodeId: node.id,
    personId: node.personId,
    role: node.role,
    generation: node.generation,
    isReference: node.flags.isReference,
});
export const normalizeVisibleTreePedigreeSemanticSnapshot = (visibleTree) => {
    const nodes = visibleTree.nodes.map(visibleNodeToSnapshot);
    const links = visibleTree.links.map((link) => ({
        key: makeLinkKey(link.sourcePersonId, link.targetPersonId),
        sourcePersonId: link.sourcePersonId,
        targetPersonId: link.targetPersonId,
    }));
    const visiblePersonIds = sortUnique(nodes.map((node) => node.personId));
    const repeatedPersonIds = sortUnique(nodes
        .map((node) => node.personId)
        .filter((personId, index, all) => all.indexOf(personId) !== index));
    const ancestorPersonIds = sortUnique(nodes.filter((node) => node.personId !== visibleTree.focusPersonId).map((node) => node.personId));
    return {
        mode: 'pedigree',
        focusPersonId: visibleTree.focusPersonId,
        rootPersonId: visibleTree.rootPersonId,
        visiblePersonIds,
        visibleNodeIds: sortUnique(nodes.map((node) => node.visibleNodeId)),
        visibleLinks: sortUnique(links.map((link) => link.key)),
        nodes,
        links,
        generationDepth: nodes.reduce((max, node) => Math.max(max, node.generation), 0),
        filteredOutPersonIds: sortUnique(visibleTree.filteredOutPersonIds),
        repeatedPersonIds,
        ancestorPersonIds,
    };
};
const classifyIssue = (issue, oldSnapshot, newSnapshot, generationLimit) => {
    if (issue.kind === 'root_mismatch' || issue.kind === 'focus_mismatch') {
        return 'regression';
    }
    if (issue.kind === 'extra_in_new' || issue.kind === 'repeated_mismatch' || issue.kind === 'role_mismatch') {
        const newNode = newSnapshot.nodes.find((node) => node.visibleNodeId === issue.visibleNodeId || node.personId === issue.personId);
        if (issue.kind === 'extra_in_new' &&
            issue.personId === newSnapshot.focusPersonId &&
            newNode?.role === 'focus') {
            return 'expected_correction';
        }
        if (newNode?.isReference || newNode?.role === 'reference') {
            return 'expected_correction';
        }
    }
    if (issue.kind === 'missing_in_new' || issue.kind === 'generation_mismatch') {
        const oldNode = oldSnapshot.nodes.find((node) => node.visibleNodeId === issue.visibleNodeId || node.personId === issue.personId);
        if (oldNode && oldNode.generation >= generationLimit) {
            return 'expected_correction';
        }
    }
    if (issue.kind === 'filtered_mismatch') {
        return 'undecided_behavior_difference';
    }
    if (issue.kind === 'link_mismatch') {
        const newLink = newSnapshot.links.find((link) => link.key === issue.linkKey);
        if (newLink) {
            const hasReferenceEndpoint = newSnapshot.nodes.some((node) => node.personId === newLink.sourcePersonId && node.isReference) ||
                newSnapshot.nodes.some((node) => node.personId === newLink.targetPersonId && node.isReference);
            if (hasReferenceEndpoint) {
                return 'expected_correction';
            }
        }
    }
    return 'regression';
};
export const comparePedigreeSemanticSnapshots = (oldSnapshot, newSnapshot, options) => {
    const issues = [];
    if (oldSnapshot.focusPersonId !== newSnapshot.focusPersonId) {
        issues.push({
            kind: 'focus_mismatch',
            classification: classifyIssue({
                kind: 'focus_mismatch',
                details: `Focus person differs: old=${oldSnapshot.focusPersonId}, new=${newSnapshot.focusPersonId}`,
            }, oldSnapshot, newSnapshot, options.generationLimit),
            details: `Focus person differs: old=${oldSnapshot.focusPersonId}, new=${newSnapshot.focusPersonId}`,
        });
    }
    if (oldSnapshot.rootPersonId !== newSnapshot.rootPersonId) {
        issues.push({
            kind: 'root_mismatch',
            classification: classifyIssue({
                kind: 'root_mismatch',
                details: `Root person differs: old=${oldSnapshot.rootPersonId}, new=${newSnapshot.rootPersonId}`,
            }, oldSnapshot, newSnapshot, options.generationLimit),
            details: `Root person differs: old=${oldSnapshot.rootPersonId}, new=${newSnapshot.rootPersonId}`,
        });
    }
    for (const personId of oldSnapshot.visiblePersonIds) {
        if (!newSnapshot.visiblePersonIds.includes(personId)) {
            const oldNode = oldSnapshot.nodes.find((node) => node.personId === personId);
            const details = `Person visible in old pedigree semantics but missing in new: ${personId}`;
            issues.push({
                kind: 'missing_in_new',
                classification: classifyIssue({
                    kind: 'missing_in_new',
                    personId,
                    visibleNodeId: oldNode?.visibleNodeId,
                    details,
                }, oldSnapshot, newSnapshot, options.generationLimit),
                personId,
                visibleNodeId: oldNode?.visibleNodeId,
                details,
            });
        }
    }
    for (const personId of newSnapshot.visiblePersonIds) {
        if (!oldSnapshot.visiblePersonIds.includes(personId)) {
            const newNode = newSnapshot.nodes.find((node) => node.personId === personId);
            const details = `Person visible in new pedigree semantics but missing in old: ${personId}`;
            issues.push({
                kind: 'extra_in_new',
                classification: classifyIssue({
                    kind: 'extra_in_new',
                    personId,
                    visibleNodeId: newNode?.visibleNodeId,
                    details,
                }, oldSnapshot, newSnapshot, options.generationLimit),
                personId,
                visibleNodeId: newNode?.visibleNodeId,
                details,
            });
        }
    }
    for (const oldNode of oldSnapshot.nodes) {
        const matchingNewPrimaryNode = newSnapshot.nodes.find((node) => node.personId === oldNode.personId && !node.isReference);
        if (matchingNewPrimaryNode && matchingNewPrimaryNode.role !== oldNode.role) {
            const details = `Role mismatch for ${oldNode.personId}: old=${oldNode.role}, new=${matchingNewPrimaryNode.role}`;
            issues.push({
                kind: 'role_mismatch',
                classification: classifyIssue({
                    kind: 'role_mismatch',
                    personId: oldNode.personId,
                    visibleNodeId: matchingNewPrimaryNode.visibleNodeId,
                    details,
                }, oldSnapshot, newSnapshot, options.generationLimit),
                personId: oldNode.personId,
                visibleNodeId: matchingNewPrimaryNode.visibleNodeId,
                details,
            });
        }
    }
    for (const oldLink of oldSnapshot.visibleLinks) {
        if (!newSnapshot.visibleLinks.includes(oldLink)) {
            const details = `Link present in old pedigree semantics but missing in new: ${oldLink}`;
            issues.push({
                kind: 'link_mismatch',
                classification: classifyIssue({
                    kind: 'link_mismatch',
                    linkKey: oldLink,
                    details,
                }, oldSnapshot, newSnapshot, options.generationLimit),
                linkKey: oldLink,
                details,
            });
        }
    }
    for (const newLink of newSnapshot.visibleLinks) {
        if (!oldSnapshot.visibleLinks.includes(newLink)) {
            const details = `Link present in new pedigree semantics but missing in old: ${newLink}`;
            issues.push({
                kind: 'link_mismatch',
                classification: classifyIssue({
                    kind: 'link_mismatch',
                    linkKey: newLink,
                    details,
                }, oldSnapshot, newSnapshot, options.generationLimit),
                linkKey: newLink,
                details,
            });
        }
    }
    if (oldSnapshot.generationDepth !== newSnapshot.generationDepth) {
        const details = `Generation depth differs: old=${oldSnapshot.generationDepth}, new=${newSnapshot.generationDepth}`;
        issues.push({
            kind: 'generation_mismatch',
            classification: classifyIssue({
                kind: 'generation_mismatch',
                details,
            }, oldSnapshot, newSnapshot, options.generationLimit),
            details,
        });
    }
    if (oldSnapshot.filteredOutPersonIds.join('|') !== newSnapshot.filteredOutPersonIds.join('|')) {
        const details = `Filtered people differ: old=[${oldSnapshot.filteredOutPersonIds.join(', ')}], new=[${newSnapshot.filteredOutPersonIds.join(', ')}]`;
        issues.push({
            kind: 'filtered_mismatch',
            classification: classifyIssue({
                kind: 'filtered_mismatch',
                details,
            }, oldSnapshot, newSnapshot, options.generationLimit),
            details,
        });
    }
    if (oldSnapshot.repeatedPersonIds.join('|') !== newSnapshot.repeatedPersonIds.join('|')) {
        const details = `Repeated/reference people differ: old=[${oldSnapshot.repeatedPersonIds.join(', ')}], new=[${newSnapshot.repeatedPersonIds.join(', ')}]`;
        issues.push({
            kind: 'repeated_mismatch',
            classification: classifyIssue({
                kind: 'repeated_mismatch',
                details,
            }, oldSnapshot, newSnapshot, options.generationLimit),
            details,
        });
    }
    return {
        isMatch: issues.length === 0,
        oldSnapshot,
        newSnapshot,
        issues,
    };
};
export const compareOldAndVisiblePedigree = (oldInput, visibleTree, options) => comparePedigreeSemanticSnapshots(normalizeOldPedigreeSemanticSnapshot(oldInput), normalizeVisibleTreePedigreeSemanticSnapshot(visibleTree), options);
export const buildVisibleTreePedigreeInputFromSettings = (people, focusPersonId, settings) => ({
    people,
    focusPersonId,
    generationLimit: settings.generationLimit,
    showDeceased: settings.showDeceased,
});
