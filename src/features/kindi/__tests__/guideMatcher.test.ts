import { describe, expect, it } from 'vitest';

import { getKindiGuideAnswer, matchKindiGuideTopic } from '../logic/guideMatcher';

describe('Kindi local guide matcher', () => {
  it('matches backup and sync help without AI', () => {
    const match = matchKindiGuideTopic('كيف أعمل نسخة احتياطية للشجرة؟');

    expect(match?.topic.id).toBe('kindi-backup-sync');
    expect(match?.score).toBeGreaterThan(0);
  });

  it('matches access and privacy help', () => {
    const match = matchKindiGuideTopic('where do I manage viewer access and sharing?');

    expect(match?.topic.id).toBe('kindi-access-privacy');
  });

  it('returns a concrete answer for supported guide topics', () => {
    expect(getKindiGuideAnswer('كيف أختار الشخص الصحيح إذا تكرر الاسم؟')).toContain('بطاقات اختيار');
  });

  it('does not match unrelated support text', () => {
    expect(matchKindiGuideTopic('how do I cook rice?')).toBeNull();
  });
});

