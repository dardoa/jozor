import { describe, expect, it } from 'vitest';
import { isAccountAdmissionPaused } from '../accountAdmission';

describe('account admission maintenance flag', () => {
  it.each([undefined, 'false', ' false '])('preserves admission for %s', value => {
    expect(isAccountAdmissionPaused({ ACCOUNT_ADMISSION_PAUSED: value })).toBe(false);
  });
  it.each(['true', ' true ', '', ' ', 'FALSE', '0', 'no', 'tr ue'])('fails closed for a present non-false value: %s', value => {
    expect(isAccountAdmissionPaused({ ACCOUNT_ADMISSION_PAUSED: value })).toBe(true);
  });
});
