
import { describe, it, expect } from 'vitest';
import { buildSyncSuccess, buildSyncError, buildSyncSaving } from '../syncStatusHelpers';
import { SyncStatus } from '../../../types';

const defaultStatus: SyncStatus = {
    state: 'offline',
    lastSyncTime: null,
    lastSyncSupabase: null,
    lastSyncDrive: null,
    supabaseStatus: 'idle',
    driveStatus: 'idle',
    pendingCount: 0
};

describe('syncStatusHelpers', () => {
    it('preserves paused outgoing work after a read reconciliation or a new local edit', () => {
        const paused: SyncStatus = { ...defaultStatus, state: 'error', retryPaused: true, retryAttempt: 6, errorMessage: 'Failed' };
        for (const result of [buildSyncSuccess(paused, 2), buildSyncSaving(paused, 2)]) {
            expect(result).toMatchObject({ state: 'error', supabaseStatus: 'error', retryPaused: true, retryAttempt: 6, pendingCount: 2, errorMessage: 'Failed' });
        }
        expect(buildSyncSuccess(paused, 0)).toMatchObject({ state: 'synced', retryPaused: false, retryAttempt: 0 });
    });
    describe('buildSyncSuccess', () => {
        it('sets synced state and clears errors', () => {
            const errorStatus: SyncStatus = {
                ...defaultStatus,
                state: 'error',
                errorMessage: 'Failed',
                lastErrorCategory: 'NETWORK',
                lastErrorAt: new Date(),
                lastErrorRetryable: true
            };

            const result = buildSyncSuccess(errorStatus, 0);

            expect(result.state).toBe('synced');
            expect(result.supabaseStatus).toBe('idle');
            expect(result.pendingCount).toBe(0);
            expect(result.errorMessage).toBeUndefined();
            expect(result.lastErrorCategory).toBeUndefined();
            expect(result.lastErrorAt).toBeNull();
            expect(result.lastErrorRetryable).toBeUndefined();
        });

        it('updates lastSyncSupabase if provided', () => {
            const date = new Date('2026-05-01T00:00:00.000Z');
            const result = buildSyncSuccess(defaultStatus, 0, { lastSyncSupabase: date });
            expect(result.lastSyncSupabase).toBe(date);
        });

        it('keeps saving state while another queued operation remains', () => {
            const result = buildSyncSuccess(defaultStatus, 2);

            expect(result.state).toBe('saving');
            expect(result.supabaseStatus).toBe('syncing');
            expect(result.pendingCount).toBe(2);
        });
    });

    describe('buildSyncError', () => {
        it('sets error state and preserves context', () => {
            const date = new Date('2026-05-01T00:00:00.000Z');
            const result = buildSyncError(defaultStatus, 5, {
                message: 'Connection failed',
                category: 'NETWORK',
                retryable: true,
                time: date
            });

            expect(result.state).toBe('error');
            expect(result.supabaseStatus).toBe('error');
            expect(result.pendingCount).toBe(5);
            expect(result.errorMessage).toBe('Connection failed');
            expect(result.lastErrorCategory).toBe('NETWORK');
            expect(result.lastErrorAt).toBe(date);
            expect(result.lastErrorRetryable).toBe(true);
        });

        it('uses defaults for missing optional fields', () => {
            const result = buildSyncError(defaultStatus, 2, { message: 'Unknown error' });
            expect(result.lastErrorRetryable).toBe(false);
            expect(result.lastErrorAt).toBeInstanceOf(Date);
        });
    });

    describe('buildSyncSaving', () => {
        it('sets saving state', () => {
            const result = buildSyncSaving(defaultStatus, 10);
            expect(result.state).toBe('saving');
            expect(result.supabaseStatus).toBe('syncing');
            expect(result.pendingCount).toBe(10);
        });
    });
});

