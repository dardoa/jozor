import { describe, expect, it } from 'vitest';

import {
  buildReportsFromEvents,
  type KindiLearningEventRow,
} from '../services/kindiLearningReportsService';

let nextEventId = 1;

const createEvent = (
  overrides: Partial<KindiLearningEventRow> & Pick<KindiLearningEventRow, 'event_type'>
): KindiLearningEventRow => ({
  id: `event-${nextEventId++}`,
  interaction_id: null,
  route_kind: null,
  result_kind: null,
  failure_reason: null,
  redacted_query: null,
  ai_category: null,
  confidence: null,
  intent_guess: null,
  parser_stage: null,
  parser_name: null,
  parser_version: '2026-05-kindi-parser-v1',
  local_lexicon_version: '2026-05-kindi-v3',
  metadata: {},
  created_at: '2026-09-03T10:00:00.000Z',
  ...overrides,
});

describe('Kindi learning feedback reports', () => {
  it('groups feedback by safe answer source, kind, and help topic', () => {
    const reports = buildReportsFromEvents([
      createEvent({
        event_type: 'answer_feedback_helpful',
        metadata: { answerSource: 'local-tree', answerKind: 'relationship' },
        created_at: '2026-09-03T10:00:00.000Z',
      }),
      createEvent({
        event_type: 'answer_feedback_unhelpful',
        metadata: { answerSource: 'local-tree', answerKind: 'relationship' },
        created_at: '2026-09-03T11:00:00.000Z',
      }),
      createEvent({
        event_type: 'answer_feedback_helpful',
        metadata: {
          answerSource: 'help-center',
          answerKind: 'guide',
          topicId: 'cloud-backup',
        },
        created_at: '2026-09-03T12:00:00.000Z',
      }),
    ]);

    expect(reports.overview.answer_feedback_total).toBe(3);
    expect(reports.overview.answer_helpful_rate).toBeCloseTo(2 / 3);
    expect(reports.answerFeedback).toEqual([
      {
        answer_source: 'local-tree',
        answer_kind: 'relationship',
        topic_id: null,
        helpful_count: 1,
        unhelpful_count: 1,
        total_count: 2,
        helpful_rate: 0.5,
        last_seen_at: '2026-09-03T11:00:00.000Z',
      },
      {
        answer_source: 'help-center',
        answer_kind: 'guide',
        topic_id: 'cloud-backup',
        helpful_count: 1,
        unhelpful_count: 0,
        total_count: 1,
        helpful_rate: 1,
        last_seen_at: '2026-09-03T12:00:00.000Z',
      },
    ]);
  });

  it('does not surface arbitrary metadata values as report dimensions', () => {
    const reports = buildReportsFromEvents([
      createEvent({
        id: 'raw-person-id-sentinel',
        interaction_id: 'private-interaction-sentinel',
        event_type: 'answer_feedback_unhelpful',
        route_kind: 'owner@example.test',
        redacted_query: 'find [NAME_1] at owner@example.test',
        parser_name: 'https://private.example/parser',
        metadata: {
          answerSource: 'owner@example.test',
          answerKind: 'private-name',
          topicId: 'https://private.example/person/123',
          rawPersonId: 'raw-person-id-sentinel',
          authToken: 'bearer private-token-sentinel',
        },
      }),
    ]);

    expect(reports.answerFeedback).toEqual([
      expect.objectContaining({
        answer_source: 'unknown',
        answer_kind: 'unknown',
        topic_id: null,
        helpful_count: 0,
        unhelpful_count: 1,
      }),
    ]);
    expect(JSON.stringify(reports.answerFeedback)).not.toContain('owner@example.test');
    expect(JSON.stringify(reports.answerFeedback)).not.toContain('private.example');
    expect(JSON.stringify(reports)).not.toContain('owner@example.test');
    expect(JSON.stringify(reports)).not.toContain('private.example');
    expect(JSON.stringify(reports)).not.toContain('raw-person-id-sentinel');
    expect(JSON.stringify(reports)).not.toContain('private-token-sentinel');
    expect(reports.recentEvents[0]).toMatchObject({
      id: 'report-event-1',
      interaction_id: null,
      route_kind: null,
      redacted_query: null,
      parser_name: null,
      metadata: {},
    });
  });

  it('never restores the retired promptName metadata as an ambiguity label', () => {
    const reports = buildReportsFromEvents([
      createEvent({
        event_type: 'disambiguation_shown',
        redacted_query: null,
        metadata: {
          promptName: 'private-family-name',
          candidateCount: 2,
        },
      }),
    ]);

    expect(reports.ambiguousNames).toEqual([
      expect.objectContaining({
        redacted_pattern: 'unknown',
        avg_candidate_count: 2,
      }),
    ]);
    expect(JSON.stringify(reports)).not.toContain('private-family-name');
  });

  it('retains registered dimensions and drops plausible-looking unregistered values', () => {
    const reports = buildReportsFromEvents([
      createEvent({
        event_type: 'support_unanswered',
        route_kind: 'SUPPORT',
        result_kind: 'guide',
        failure_reason: 'SUPPORT_TOPIC_MISSING',
        ai_category: 'SUPPORT',
        intent_guess: 'SUPPORT',
        parser_stage: 'support_guide',
        parser_name: 'guideMatcher',
        metadata: { route: 'SUPPORT', planType: 'ADD' },
      }),
      createEvent({
        event_type: 'query_submitted',
        route_kind: 'PrivateFamilySurname',
        result_kind: 'PrivateFamilyResult',
        failure_reason: 'PrivateFamilyFailure',
        ai_category: 'PrivateFamilyCategory',
        intent_guess: 'PrivateFamilyIntent',
        parser_stage: 'PrivateFamilyStage',
        parser_name: 'PrivateFamilyParser',
        parser_version: 'PrivateFamilyVersion',
        local_lexicon_version: 'PrivateFamilyLexicon',
        metadata: { route: 'PrivateFamilyRoute', planType: 'PrivateFamilyPlan' },
      }),
    ]);

    expect(reports.recentEvents[0]).toMatchObject({
      route_kind: 'SUPPORT',
      result_kind: 'guide',
      failure_reason: 'SUPPORT_TOPIC_MISSING',
      ai_category: 'SUPPORT',
      intent_guess: 'SUPPORT',
      parser_stage: 'support_guide',
      parser_name: 'guideMatcher',
      parser_version: '2026-05-kindi-parser-v1',
      local_lexicon_version: '2026-05-kindi-v3',
      metadata: { route: 'SUPPORT', planType: 'ADD' },
    });
    expect(reports.recentEvents[1]).toMatchObject({
      route_kind: null,
      result_kind: null,
      failure_reason: null,
      ai_category: null,
      intent_guess: null,
      parser_stage: null,
      parser_name: null,
      parser_version: 'unknown',
      local_lexicon_version: 'unknown',
      metadata: {},
    });
    expect(JSON.stringify(reports)).not.toContain('PrivateFamily');
  });

  it('returns zero feedback metrics when no answer was rated', () => {
    const reports = buildReportsFromEvents([
      createEvent({ event_type: 'query_submitted' }),
    ]);

    expect(reports.overview.answer_feedback_total).toBe(0);
    expect(reports.overview.answer_helpful_rate).toBe(0);
    expect(reports.answerFeedback).toEqual([]);
  });

  it('keeps diagnostic feedback as a controlled reporting dimension', () => {
    const reports = buildReportsFromEvents([
      createEvent({
        event_type: 'answer_feedback_helpful',
        metadata: { answerSource: 'local-tree', answerKind: 'diagnostic' },
      }),
    ]);

    expect(reports.answerFeedback).toEqual([
      expect.objectContaining({
        answer_source: 'local-tree',
        answer_kind: 'diagnostic',
        helpful_count: 1,
      }),
    ]);
  });

  it('keeps biography feedback as a controlled reporting dimension', () => {
    const reports = buildReportsFromEvents([
      createEvent({
        event_type: 'answer_feedback_helpful',
        metadata: { answerSource: 'local-tree', answerKind: 'biography' },
      }),
    ]);

    expect(reports.answerFeedback).toEqual([
      expect.objectContaining({
        answer_source: 'local-tree',
        answer_kind: 'biography',
        helpful_count: 1,
      }),
    ]);
  });

  it('keeps record review feedback as a controlled reporting dimension', () => {
    const reports = buildReportsFromEvents([
      createEvent({
        event_type: 'answer_feedback_helpful',
        metadata: { answerSource: 'local-tree', answerKind: 'record-review' },
      }),
    ]);

    expect(reports.answerFeedback).toEqual([
      expect.objectContaining({
        answer_source: 'local-tree',
        answer_kind: 'record-review',
        helpful_count: 1,
      }),
    ]);
  });
});
