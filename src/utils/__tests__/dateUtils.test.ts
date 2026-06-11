import { describe, expect, it } from 'vitest';
import { formatDateForPostgres } from '../dateUtils';

describe('formatDateForPostgres', () => {
  it('returns null for null, undefined, or empty/whitespace values', () => {
    expect(formatDateForPostgres(null)).toBeNull();
    expect(formatDateForPostgres(undefined)).toBeNull();
    expect(formatDateForPostgres('')).toBeNull();
    expect(formatDateForPostgres('   ')).toBeNull();
  });

  it('converts 4-digit years (YYYY) to YYYY-01-01', () => {
    expect(formatDateForPostgres('1985')).toBe('1985-01-01');
    expect(formatDateForPostgres('2026')).toBe('2026-01-01');
    expect(formatDateForPostgres('0999')).toBe('0999-01-01');
  });

  it('converts YYYY-MM to YYYY-MM-01', () => {
    expect(formatDateForPostgres('1985-06')).toBe('1985-06-01');
    expect(formatDateForPostgres('2026-12')).toBe('2026-12-01');
  });

  it('returns YYYY-MM-DD unmodified if it is already correct', () => {
    expect(formatDateForPostgres('1985-06-15')).toBe('1985-06-15');
    expect(formatDateForPostgres('2026-12-31')).toBe('2026-12-31');
  });

  it('attempts to parse and convert other valid date formats with explicit timezone', () => {
    expect(formatDateForPostgres('June 15, 1985 UTC')).toBe('1985-06-15');
    expect(formatDateForPostgres('1985-06-15T12:00:00Z')).toBe('1985-06-15');
  });

  it('returns null for truly invalid/unparseable inputs', () => {
    expect(formatDateForPostgres('completely-invalid')).toBeNull();
    expect(formatDateForPostgres('2026-invalid')).toBeNull();
  });
});
