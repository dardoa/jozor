// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { getAuthInitPlan, AuthInitContext } from '../authInitDecision';

describe('getAuthInitPlan', () => {
    const baseContext: AuthInitContext = {
        userUid: 'user-123',
        isSyncing: false,
        isSharedMode: false,
        currentTreeId: null,
        routeTreeId: null,
        routePersonId: null,
        peopleCount: 0,
        hasPersonInTree: () => false,
        lastActiveTreeId: null,
        hasSharedTreePromptModal: true,
    };

    it('returns WAIT if user is missing', () => {
        const plan = getAuthInitPlan({ ...baseContext, userUid: undefined });
        expect(plan.type).toBe('WAIT');
    });

    it('returns WAIT if syncing', () => {
        const plan = getAuthInitPlan({ ...baseContext, isSyncing: true });
        expect(plan.type).toBe('WAIT');
    });

    it('returns MIGRATE_INVALID_TREE_ID if current tree ID is not UUID', () => {
        const plan = getAuthInitPlan({ ...baseContext, currentTreeId: '1' });
        expect(plan).toEqual({ type: 'MIGRATE_INVALID_TREE_ID', invalidTreeId: '1' });
    });

    it('returns BOOTSTRAP_ROUTE_TREE if routeTreeId is provided and not loaded', () => {
        const plan = getAuthInitPlan({ ...baseContext, routeTreeId: '123e4567-e89b-12d3-a456-426614174000' });
        expect(plan).toEqual({ type: 'BOOTSTRAP_ROUTE_TREE', treeId: '123e4567-e89b-12d3-a456-426614174000' });
    });

    it('returns HIDE_WELCOME_ONLY if routeTreeId is already loaded and no routePersonId', () => {
        const uuid = '123e4567-e89b-12d3-a456-426614174000';
        const plan = getAuthInitPlan({ 
            ...baseContext, 
            routeTreeId: uuid, 
            currentTreeId: uuid,
            peopleCount: 2 
        });
        expect(plan.type).toBe('HIDE_WELCOME_ONLY');
    });

    it('returns APPLY_ROUTE_FOCUS_ONLY if routeTreeId loaded and routePersonId exists', () => {
        const uuid = '123e4567-e89b-12d3-a456-426614174000';
        const plan = getAuthInitPlan({ 
            ...baseContext, 
            routeTreeId: uuid, 
            currentTreeId: uuid,
            peopleCount: 2,
            routePersonId: 'person-1',
            hasPersonInTree: (id) => id === 'person-1'
        });
        expect(plan).toEqual({ type: 'APPLY_ROUTE_FOCUS_ONLY', focusId: 'person-1' });
    });

    it('returns RESOLVE_ROUTE_PERSON if routePersonId provided but no tree loaded', () => {
        const plan = getAuthInitPlan({ ...baseContext, routePersonId: 'person-1' });
        expect(plan).toEqual({ type: 'RESOLVE_ROUTE_PERSON', personId: 'person-1' });
    });

    it('returns RESTORE_LAST_ACTIVE if lastActiveTreeId exists', () => {
        const uuid = '123e4567-e89b-12d3-a456-426614174000';
        const plan = getAuthInitPlan({ ...baseContext, lastActiveTreeId: uuid });
        expect(plan).toEqual({ type: 'RESTORE_LAST_ACTIVE', treeId: uuid });
    });

    it('returns FETCH_SHARED_TREES_PROMPT if local is empty and no last tree', () => {
        const plan = getAuthInitPlan({ ...baseContext, peopleCount: 1 });
        expect(plan.type).toBe('FETCH_SHARED_TREES_PROMPT');
    });
});

