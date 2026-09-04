import { describe, expect, it } from 'vitest';

import { routeKindiIntent } from '../logic/intentRouter';
import {
  createKindiGuidedUpdateDraft,
  isKindiGuidedUpdateField,
} from '../logic/kindiGuidedUpdate';
import { extractKindiSubjectText } from '../logic/kindiExecutivePlanner';
import { extractUpdateFields } from '../logic/parsers/updateCommandParser';

describe('Kindi guided diagnostic updates', () => {
  it.each([
    ['ar', 'birthDate', '1980-01-02', { birthDate: '1980-01-02' }],
    ['ar', 'profession', 'مهندسة', { profession: 'مهندسة' }],
    ['en', 'deathDate', '2020', { deathDate: '2020' }],
    ['en', 'residence', 'Riyadh', { residence: 'Riyadh' }],
  ] as const)(
    'creates a local %s %s update command that resolves through context',
    (language, field, value, expectedUpdates) => {
      const prefix = createKindiGuidedUpdateDraft(field, language);
      const command = `${prefix}${value}`;

      expect(routeKindiIntent(command).kind).toBe('UPDATE');
      expect(extractKindiSubjectText(command)).toMatch(
        language === 'ar' ? /هذا الشخص/u : /this person/iu
      );
      expect(extractUpdateFields(command)).toMatchObject(expectedUpdates);
      expect(command).not.toMatch(/person[_-]?\d|[0-9a-f]{8}-[0-9a-f-]{27,}/iu);
    }
  );

  it('limits guided entry to simple record fields', () => {
    expect(isKindiGuidedUpdateField('birthDate')).toBe(true);
    expect(isKindiGuidedUpdateField('profession')).toBe(true);
    expect(isKindiGuidedUpdateField('parents')).toBe(false);
    expect(createKindiGuidedUpdateDraft('sources', 'en')).toBeUndefined();
  });
});
