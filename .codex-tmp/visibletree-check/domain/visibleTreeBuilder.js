const PEDIGREE_MODE = 'pedigree';
const makeVisibleNodeId = (mode, path) => `${mode}:${path.join('/')}`;
const makeVisibleLinkId = (sourceNodeId, targetNodeId, role) => `${role}:${sourceNodeId}->${targetNodeId}`;
const createBuildState = () => ({
    nodes: [],
    links: [],
    nodeMap: {},
    linkMap: {},
    primaryNodeIds: [],
    referenceNodeIds: [],
    filteredOutPersonIds: new Set(),
    primaryNodeIdByPersonId: new Map(),
});
const normalizeGenerationLimit = (generationLimit) => {
    if (!Number.isFinite(generationLimit))
        return Number.MAX_SAFE_INTEGER;
    return Math.max(0, Math.floor(generationLimit));
};
const isVisiblePerson = (person, showDeceased) => {
    if (!person)
        return false;
    if (!showDeceased && person.isDeceased)
        return false;
    return true;
};
const resolvePedigreeParents = (person, people, showDeceased) => {
    const availableParents = person.parents
        .map((parentId) => people[parentId])
        .filter((candidate) => isVisiblePerson(candidate, showDeceased));
    if (availableParents.length === 0)
        return [];
    const maleParent = availableParents.find((candidate) => candidate.gender === 'male');
    const femaleParent = availableParents.find((candidate) => candidate.gender === 'female');
    const resolved = [];
    const usedIds = new Set();
    if (maleParent) {
        resolved.push({ personId: maleParent.id, relationContext: 'father' });
        usedIds.add(maleParent.id);
    }
    if (femaleParent && !usedIds.has(femaleParent.id)) {
        resolved.push({ personId: femaleParent.id, relationContext: 'mother' });
        usedIds.add(femaleParent.id);
    }
    for (const parent of availableParents) {
        if (usedIds.has(parent.id))
            continue;
        resolved.push({ personId: parent.id, relationContext: 'parent' });
        usedIds.add(parent.id);
    }
    return resolved.slice(0, 2);
};
const pushNode = (state, node) => {
    state.nodes.push(node);
    state.nodeMap[node.id] = node;
    if (node.flags.isReference)
        state.referenceNodeIds.push(node.id);
    else
        state.primaryNodeIds.push(node.id);
};
const pushLink = (state, link) => {
    state.links.push(link);
    state.linkMap[link.id] = link;
};
const createNode = ({ visibleId, person, role, depth, generation, relationContext, traversalPath, isReference, referenceOfNodeId, }) => ({
    id: visibleId,
    personId: person.id,
    person,
    role,
    mode: PEDIGREE_MODE,
    depth,
    generation,
    parentNodeIds: [],
    childNodeIds: [],
    spouseNodeIds: [],
    flags: {
        isFocus: role === 'focus',
        isReference,
        isPrimaryInstance: !isReference,
        isFiltered: false,
        isDeceasedHidden: false,
        isGenerationTrimmed: false,
    },
    metadata: {
        relationContext,
        traversalPath,
        referenceOfNodeId,
    },
});
const createReferenceNode = (state, person, depth, generation, traversalPath, relationContext) => {
    const visibleId = makeVisibleNodeId(PEDIGREE_MODE, traversalPath);
    const primaryNodeId = state.primaryNodeIdByPersonId.get(person.id) ?? null;
    return createNode({
        visibleId,
        person,
        role: 'reference',
        depth,
        generation,
        relationContext,
        traversalPath,
        isReference: true,
        referenceOfNodeId: primaryNodeId,
    });
};
const createSemanticLink = (sourceNode, targetNode, relationContext) => ({
    id: makeVisibleLinkId(sourceNode.id, targetNode.id, 'parent-child'),
    sourceNodeId: sourceNode.id,
    targetNodeId: targetNode.id,
    sourcePersonId: sourceNode.personId,
    targetPersonId: targetNode.personId,
    role: 'parent-child',
    mode: PEDIGREE_MODE,
    metadata: {
        relationContext,
        isReferenceLink: targetNode.flags.isReference,
    },
});
const buildPedigreeBranch = (personId, input, state, depth, traversalPath, relationContext, branchPersonIds) => {
    const limit = normalizeGenerationLimit(input.generationLimit);
    if (depth >= limit)
        return null;
    const person = input.people[personId];
    if (!person)
        return null;
    const isRoot = depth === 0;
    if (!isRoot && !input.showDeceased && person.isDeceased) {
        state.filteredOutPersonIds.add(personId);
        return null;
    }
    const visibleId = makeVisibleNodeId(PEDIGREE_MODE, traversalPath);
    if (!isRoot && (state.primaryNodeIdByPersonId.has(personId) || branchPersonIds.has(personId))) {
        const referenceNode = createReferenceNode(state, person, depth, depth, traversalPath, relationContext);
        pushNode(state, referenceNode);
        return referenceNode;
    }
    const node = createNode({
        visibleId,
        person,
        role: isRoot ? 'focus' : 'ancestor',
        depth,
        generation: depth,
        relationContext: isRoot ? 'root' : relationContext,
        traversalPath,
        isReference: false,
        referenceOfNodeId: null,
    });
    pushNode(state, node);
    if (!state.primaryNodeIdByPersonId.has(personId)) {
        state.primaryNodeIdByPersonId.set(personId, node.id);
    }
    const nextBranchPeople = new Set(branchPersonIds);
    nextBranchPeople.add(personId);
    const parents = resolvePedigreeParents(person, input.people, input.showDeceased);
    for (const parent of parents) {
        const parentNode = buildPedigreeBranch(parent.personId, input, state, depth + 1, [...traversalPath, parent.personId], parent.relationContext, nextBranchPeople);
        if (!parentNode)
            continue;
        node.parentNodeIds.push(parentNode.id);
        parentNode.childNodeIds.push(node.id);
        const link = createSemanticLink(node, parentNode, parent.relationContext);
        pushLink(state, link);
    }
    return node;
};
export const buildVisiblePedigreeTree = (input) => {
    const state = createBuildState();
    const focusPerson = input.people[input.focusPersonId];
    if (!focusPerson) {
        return {
            mode: PEDIGREE_MODE,
            focusPersonId: input.focusPersonId,
            rootPersonId: input.focusPersonId,
            nodes: [],
            links: [],
            nodeMap: {},
            linkMap: {},
            primaryNodeIds: [],
            referenceNodeIds: [],
            filteredOutPersonIds: [],
            summary: {
                totalNodes: 0,
                totalLinks: 0,
                totalPrimaryNodes: 0,
                totalReferenceNodes: 0,
                totalFilteredOutPeople: 0,
            },
        };
    }
    buildPedigreeBranch(input.focusPersonId, input, state, 0, [input.focusPersonId], 'root', new Set());
    return {
        mode: PEDIGREE_MODE,
        focusPersonId: input.focusPersonId,
        rootPersonId: input.focusPersonId,
        nodes: state.nodes,
        links: state.links,
        nodeMap: state.nodeMap,
        linkMap: state.linkMap,
        primaryNodeIds: state.primaryNodeIds,
        referenceNodeIds: state.referenceNodeIds,
        filteredOutPersonIds: Array.from(state.filteredOutPersonIds),
        summary: {
            totalNodes: state.nodes.length,
            totalLinks: state.links.length,
            totalPrimaryNodes: state.primaryNodeIds.length,
            totalReferenceNodes: state.referenceNodeIds.length,
            totalFilteredOutPeople: state.filteredOutPersonIds.size,
        },
    };
};
export const buildVisibleTree = (mode, input) => {
    if (mode === 'pedigree') {
        return buildVisiblePedigreeTree(input);
    }
    throw new Error(`VisibleTree mode "${mode}" is not implemented yet.`);
};
