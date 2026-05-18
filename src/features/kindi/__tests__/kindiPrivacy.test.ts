import { describe, expect, it } from 'vitest';
import { redactKindiPrompt, restoreKindiDraft } from '../logic/kindiPrivacy';
import type { KindiAIPlanDraft } from '../types';

describe('kindiPrivacy', () => {
  it('redacts target and new person names in a single add command', () => {
    const redaction = redactKindiPrompt('أضف ابن لمحمد خير القرجي اسمه أمير');

    expect(redaction.redactedText).toContain('[NAME_1]');
    expect(redaction.redactedText).toContain('[NAME_2]');
    expect(redaction.redactedText).not.toContain('محمد خير القرجي');
    expect(redaction.redactedText).not.toContain('أمير');
    expect(redaction.entities).toEqual([
      { token: '[NAME_1]', original: 'محمد خير القرجي', kind: 'target' },
      { token: '[NAME_2]', original: 'أمير', kind: 'new_person' },
    ]);
  });

  it('redacts bare add names and target names', () => {
    const redaction = redactKindiPrompt('أضف خالد لسامي');

    expect(redaction.redactedText).not.toContain('خالد');
    expect(redaction.redactedText).not.toContain('سامي');
    expect(redaction.entities).toEqual([
      { token: '[NAME_1]', original: 'خالد', kind: 'new_person' },
      { token: '[NAME_2]', original: 'سامي', kind: 'target' },
    ]);
  });

  it('redacts update subjects without redacting the update value', () => {
    const redaction = redactKindiPrompt('عدل مهنة محمود القرجي إلى مهندس');

    expect(redaction.redactedText).toContain('[NAME_1]');
    expect(redaction.redactedText).toContain('مهندس');
    expect(redaction.redactedText).not.toContain('محمود القرجي');
    expect(redaction.entities).toEqual([
      { token: '[NAME_1]', original: 'محمود القرجي', kind: 'subject' },
    ]);
  });

  it('restores placeholders in direct fields and nested updates', () => {
    const redaction = redactKindiPrompt('أضف زوجة لسامي اسمها نورة');
    const draft: KindiAIPlanDraft = {
      intent: 'ADD',
      relation: 'wife',
      gender: 'female',
      targetMention: '[NAME_1]',
      newPersonName: '[NAME_2]',
      updates: {
        bio: 'طلب مرتبط بـ [NAME_1]',
      },
      confidence: 0.92,
    };

    expect(restoreKindiDraft(draft, redaction.entities)).toEqual({
      intent: 'ADD',
      relation: 'wife',
      gender: 'female',
      targetMention: 'سامي',
      newPersonName: 'نورة',
      updates: {
        bio: 'طلب مرتبط بـ سامي',
      },
      confidence: 0.92,
    });
  });
});
