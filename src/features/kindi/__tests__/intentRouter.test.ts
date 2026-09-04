import { describe, expect, it } from 'vitest';

import { routeKindiIntent } from '../logic/intentRouter';
import {
  getConversationFlowIntent,
  hasCommandTerm,
  hasKindiAIFallbackIntentSignal,
  KINDI_LEXICON,
  stripKnownCommandTerms,
} from '../logic/kindiCommandLexicon';

describe('routeKindiIntent', () => {
  it('routes plain relationship search as QUERY', () => {
    const intent = routeKindiIntent('children of mahmoud');

    expect(intent.kind).toBe('QUERY');
    expect(intent.summary).toBe('استعلام عن الشجرة');
    expect(intent.parsedIntents.map((item) => item.id)).toContain('rel_children');
  });

  it('routes creation and linking language as ACTION', () => {
    expect(routeKindiIntent('add son to mahmoud').kind).toBe('ACTION');
    expect(routeKindiIntent('اضافة زوجة ل صبيحة').kind).toBe('ACTION');
    expect(routeKindiIntent('إنشاء ابن لمحمد').kind).toBe('ACTION');
    expect(routeKindiIntent('أضف حفيد حق محمود').kind).toBe('ACTION');
    expect(routeKindiIntent('اربط مريم بمحمود').kind).toBe('ACTION');
    expect(routeKindiIntent('حط مرا لساهر القرجي اسمها زينب').kind).toBe('ACTION');
    expect(routeKindiIntent('ضيف ولده لمحمود اسمه علي').kind).toBe('ACTION');
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

  it('routes instructional and capability questions as SUPPORT without preparing changes', () => {
    expect(routeKindiIntent('كيف أستخدم كيندي؟').kind).toBe('SUPPORT');
    expect(routeKindiIntent('وين أجد المساعدة؟').kind).toBe('SUPPORT');
    expect(routeKindiIntent('كيف أضيف ابن لسامي').kind).toBe('SUPPORT');
    expect(routeKindiIntent('ماذا تستطيع أن تفعل؟').kind).toBe('SUPPORT');
    expect(routeKindiIntent('what can you do?').kind).toBe('SUPPORT');
  });

  it('routes tree diagnostics as QUERY even when phrased as a how-question', () => {
    expect(routeKindiIntent('كيف هي جودة البيانات في الشجرة؟').kind).toBe('QUERY');
    expect(routeKindiIntent('what is missing for this person?').kind).toBe('QUERY');
    expect(routeKindiIntent('check the tree for errors', 'en').kind).toBe('QUERY');
  });

  it('routes biography drafting as a read-only QUERY even when phrased with a creation verb', () => {
    expect(routeKindiIntent('أنشئ مسودة سيرة لهذا الشخص').kind).toBe('QUERY');
    expect(routeKindiIntent('اكتب نبذة عن محمد القرجي').kind).toBe('QUERY');
    expect(routeKindiIntent('create a biography for this person', 'en').kind).toBe('QUERY');
    expect(routeKindiIntent('عدل السيرة لمحمد').kind).toBe('UPDATE');
  });

  it('routes record organization as a read-only QUERY', () => {
    expect(routeKindiIntent('نظّم ملاحظات ومصادر هذا الشخص').kind).toBe('QUERY');
    expect(routeKindiIntent('راجع مصادر هذا الشخص').kind).toBe('QUERY');
    expect(routeKindiIntent("organize this person's record", 'en').kind).toBe('QUERY');
  });

  it('localizes the routed summary without changing intent detection', () => {
    const routed = routeKindiIntent('أضف ابنًا لمحمود', 'en');

    expect(routed.kind).toBe('ACTION');
    expect(routed.summary).toBe('Add to the family tree');
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

  it('strips known command terms without removing words inside names', () => {
    expect(stripKnownCommandTerms('add son to Mahmoud named Ali')).toBe('Mahmoud Ali');
    expect(stripKnownCommandTerms('delete Anderson')).toBe('Anderson');
    expect(stripKnownCommandTerms('update profession for Nora')).toBe('profession Nora');
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

  it('recognizes broad Arabic and English family signals without matching unrelated topics', () => {
    expect(hasKindiAIFallbackIntentSignal('show me the family relationship for Lina')).toBe(true);
    expect(hasKindiAIFallbackIntentSignal('explain my ancestry')).toBe(true);
    expect(hasKindiAIFallbackIntentSignal('اشرح صلة القرابة')).toBe(true);
    expect(hasKindiAIFallbackIntentSignal('tell me the weather tomorrow')).toBe(false);
  });
});
