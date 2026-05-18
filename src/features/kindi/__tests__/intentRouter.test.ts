import { describe, expect, it } from 'vitest';

import { routeKindiIntent } from '../logic/intentRouter';
import { getConversationFlowIntent, hasCommandTerm, KINDI_LEXICON } from '../logic/kindiCommandLexicon';

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
    expect(routeKindiIntent('حط مرا لساهر القرجي اسمها زينب').kind).toBe('ACTION');
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

  it('routes greetings as GREETING unless an explicit command exists', () => {
    expect(routeKindiIntent('مرحبا').kind).toBe('GREETING');
    expect(routeKindiIntent('السلام عليكم كيندي').kind).toBe('GREETING');
    expect(routeKindiIntent('تحية طيبة').kind).toBe('GREETING');
    expect(routeKindiIntent('أهلاً كيندي').kind).toBe('GREETING');
    expect(routeKindiIntent('صباح الخير').kind).toBe('GREETING');
    expect(routeKindiIntent('كيف حالك؟').kind).toBe('GREETING');
    expect(routeKindiIntent('شلونك؟').kind).toBe('GREETING');
    expect(routeKindiIntent('عساك بخير').kind).toBe('GREETING');
    expect(routeKindiIntent('hello Kindi').kind).toBe('GREETING');
    expect(routeKindiIntent('مرحبا اضف ابن لسامي').kind).toBe('ACTION');
  });

  it('does not match short Arabic relation words inside person names', () => {
    expect(hasCommandTerm('أضف زوجة لأسامة', KINDI_LEXICON.RELATIONS.PARENT_FEMALE)).toBe(false);
    expect(hasCommandTerm('أضف أم لأسامة', KINDI_LEXICON.RELATIONS.PARENT_FEMALE)).toBe(true);
  });

  it('detects broad conversation flow choices without routing them as commands', () => {
    expect(routeKindiIntent('لنبحث عن أفراد العائلة').kind).toBe('QUERY');
    expect(getConversationFlowIntent('لنبحث عن أفراد العائلة')).toBe('search');
    expect(routeKindiIntent('نضيف غصن جديد').kind).toBe('QUERY');
    expect(getConversationFlowIntent('نضيف غصن جديد')).toBe('add');
  });

  it('routes clearly out-of-scope questions as UNKNOWN', () => {
    expect(routeKindiIntent('كيف طقس الرياض اليوم؟').kind).toBe('UNKNOWN');
    expect(routeKindiIntent('قل لي نكتة').kind).toBe('UNKNOWN');
    expect(routeKindiIntent('كيف أصلح السيارة؟').kind).toBe('UNKNOWN');
    expect(routeKindiIntent('محمد القرجي').kind).toBe('QUERY');
  });
});
