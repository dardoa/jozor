import { describe, expect, it } from 'vitest';

import { routeKindiIntent } from '../intentRouter';
import { hasCommandTerm, KINDI_LEXICON } from '../kindiCommandLexicon';

describe('routeKindiIntent', () => {
  it('routes plain relationship search as QUERY', () => {
    const intent = routeKindiIntent('children of mahmoud');

    expect(intent.kind).toBe('QUERY');
    expect(intent.summary).toBe('استعلام استدلالي');
    expect(intent.parsedIntents.map((item) => item.id)).toContain('rel_children');
  });

  it('routes creation and linking language as ACTION', () => {
    expect(routeKindiIntent('add son to mahmoud').kind).toBe('ACTION');
    expect(routeKindiIntent('اضافة زوجة ل صبيحة').kind).toBe('ACTION');
    expect(routeKindiIntent('إنشاء ابن لمحمد').kind).toBe('ACTION');
    expect(routeKindiIntent('أضف حفيد حق محمود').kind).toBe('ACTION');
    expect(routeKindiIntent('اربط مريم بمحمود').kind).toBe('ACTION');
  });

  it('routes editing language as UPDATE', () => {
    expect(routeKindiIntent('update birth date for rana').kind).toBe('UPDATE');
    expect(routeKindiIntent('عدل اسم محمود').kind).toBe('UPDATE');
    expect(routeKindiIntent('صحح تاريخ ميلاد محمود').kind).toBe('UPDATE');
  });

  it('routes deletion language as DELETE', () => {
    expect(routeKindiIntent('delete Mahmoud').kind).toBe('DELETE');
    expect(routeKindiIntent('احذف سامي القرجي').kind).toBe('DELETE');
    expect(routeKindiIntent('إزالة محمود القرجي').kind).toBe('DELETE');
  });

  it('routes support language as SUPPORT only when no explicit command exists', () => {
    expect(routeKindiIntent('كيف أستخدم كيندي؟').kind).toBe('SUPPORT');
    expect(routeKindiIntent('وين أجد المساعدة؟').kind).toBe('SUPPORT');
    expect(routeKindiIntent('كيف أضيف ابن لسامي').kind).toBe('ACTION');
  });

  it('does not match short Arabic relation words inside person names', () => {
    expect(hasCommandTerm('أضف زوجة لأسامة', KINDI_LEXICON.RELATIONS.PARENT_FEMALE)).toBe(false);
    expect(hasCommandTerm('أضف أم لأسامة', KINDI_LEXICON.RELATIONS.PARENT_FEMALE)).toBe(true);
  });
});
