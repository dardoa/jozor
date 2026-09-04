import { describe, expect, it } from 'vitest';

import { getKindiGuideAnswer, matchKindiGuideTopic } from '../logic/guideMatcher';

describe('Kindi local guide matcher', () => {
  it('answers generic capability discovery locally', () => {
    expect(getKindiGuideAnswer('ماذا تستطيع أن تفعل؟')).toContain('بطاقة مراجعة');
    expect(getKindiGuideAnswer('مساعدة')).toContain('البحث عن أفراد الشجرة');
  });

  it('prefers addition guidance for a generic how-to-add question', () => {
    expect(matchKindiGuideTopic('كيف أضيف شخصا؟')?.topic.id).toBe('kindi-add-relative');
  });

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

  it('uses the shared Help Center topic for Kindi data-quality guidance', () => {
    const match = matchKindiGuideTopic('كيف أستخدم فحص كيندي للشجرة؟');

    expect(match?.topic.helpTopicId).toBe('kindi-data-quality');
    expect(match?.topic.answer).toContain('يفحص كِندي بيانات الشجرة محليًا');
  });

  it('answers in the active interface language while matching either input language', () => {
    expect(getKindiGuideAnswer('ماذا تستطيع أن تفعل؟', 'en')).toContain('review card');
    expect(getKindiGuideAnswer('what can you do?', 'ar')).toContain('بطاقة مراجعة');
  });
});

