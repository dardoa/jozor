import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { KindiLearningEventInput } from '../services/kindiLearningService';
import type { KindiLearningTrace } from '../types';

const logEvent = vi.fn<(event: KindiLearningEventInput) => void>();
const logSuccess = vi.fn<(trace?: KindiLearningTrace) => void>();
const service = { logKindiLearningEvent: logEvent, logKindiSuccess: logSuccess };
const loadService = vi.fn<() => typeof service | Promise<typeof service>>();
const rawError = 'private-name email@example.test bearer-secret storage-path';
const safeWarning = '[Kindi learning] Diagnostic service unavailable.';
const event: KindiLearningEventInput = {
  eventType: 'search_failure',
  failureReason: 'LOCAL_SEARCH_FAILED',
};
const trace: KindiLearningTrace = {
  redactedQuery: 'add son for [NAME_1] named [NAME_2]',
  aiDraft: { intent: 'ADD', relation: 'son', targetMention: '[NAME_1]', newPersonName: '[NAME_2]', confidence: 0.91 },
  confidence: 0.91,
  localLexiconVersion: 'test-lexicon',
};

describe('kindiLearningDispatch', () => {
  beforeEach(() => {
    vi.resetModules();
    logEvent.mockReset();
    logSuccess.mockReset();
    loadService.mockReset().mockReturnValue(service);
    vi.doMock('../services/kindiLearningService', () => loadService());
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    await vi.dynamicImportSettled();
    vi.doUnmock('../services/kindiLearningService');
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('does not load the service merely by importing the dispatcher or receiving no success trace', async () => {
    const dispatch = await import('../services/kindiLearningDispatch');
    expect(loadService).not.toHaveBeenCalled();
    dispatch.logKindiLearningSuccess();
    await vi.dynamicImportSettled();
    expect(loadService).not.toHaveBeenCalled();
  });

  it('delivers events and success traces exactly once without altering their values', async () => {
    const dispatch = await import('../services/kindiLearningDispatch');
    dispatch.logKindiLearningEvent(event);
    await vi.dynamicImportSettled();
    dispatch.logKindiLearningSuccess(trace);
    await vi.dynamicImportSettled();

    expect(logEvent).toHaveBeenCalledExactlyOnceWith(event);
    expect(logSuccess).toHaveBeenCalledExactlyOnceWith(trace);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('does not wait for the optional service before returning control to the caller', async () => {
    let release!: (value: typeof service) => void;
    loadService.mockReturnValue(new Promise((resolve) => { release = resolve; }));
    const dispatch = await import('../services/kindiLearningDispatch');
    try {
      expect(dispatch.logKindiLearningEvent(event)).toBeUndefined();
      expect(logEvent).not.toHaveBeenCalled();
    } finally {
      release(service);
      await vi.dynamicImportSettled();
    }
    expect(logEvent).toHaveBeenCalledExactlyOnceWith(event);
  });

  it.each(['event', 'success'] as const)('contains a rejected service import for %s diagnostics', async (kind) => {
    loadService.mockImplementation(() => Promise.reject(new Error(rawError)));
    const dispatch = await import('../services/kindiLearningDispatch');
    if (kind === 'event') dispatch.logKindiLearningEvent(event);
    else dispatch.logKindiLearningSuccess(trace);
    await vi.dynamicImportSettled();

    expect(loadService).toHaveBeenCalledOnce();
    expect(logEvent).not.toHaveBeenCalled();
    expect(logSuccess).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledExactlyOnceWith(safeWarning);
  });

  it.each(['event', 'success'] as const)('contains a throwing %s logger without exposing its exception', async (kind) => {
    const logger = kind === 'event' ? logEvent : logSuccess;
    logger.mockImplementation(() => { throw new Error(rawError); });
    const dispatch = await import('../services/kindiLearningDispatch');
    if (kind === 'event') dispatch.logKindiLearningEvent(event);
    else dispatch.logKindiLearningSuccess(trace);
    await vi.dynamicImportSettled();

    expect(logger).toHaveBeenCalledOnce();
    expect(console.warn).toHaveBeenCalledExactlyOnceWith(safeWarning);
  });

  it('keeps subsequent diagnostics usable after a logger fails', async () => {
    logEvent.mockImplementationOnce(() => { throw new Error(rawError); });
    const dispatch = await import('../services/kindiLearningDispatch');
    dispatch.logKindiLearningEvent(event);
    await vi.dynamicImportSettled();
    dispatch.logKindiLearningEvent(event);
    await vi.dynamicImportSettled();

    expect(logEvent).toHaveBeenCalledTimes(2);
    expect(console.warn).toHaveBeenCalledExactlyOnceWith(safeWarning);
  });

  it('does not write diagnostic-load failures to the production console', async () => {
    vi.stubEnv('DEV', false);
    loadService.mockImplementation(() => Promise.reject(new Error(rawError)));
    const dispatch = await import('../services/kindiLearningDispatch');
    dispatch.logKindiLearningEvent(event);
    await vi.dynamicImportSettled();

    expect(loadService).toHaveBeenCalledOnce();
    expect(console.warn).not.toHaveBeenCalled();
  });
});
