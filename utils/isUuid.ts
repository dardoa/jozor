/**
 * Shared UUID v4 validation utility.
 * Centralises the pattern to prevent per-file drift (e.g. missing the 4th group).
 *
 * Correct UUID format: 8-4-4-4-12 hex characters, separated by hyphens.
 */
export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Returns true if the given string is a valid UUID (case-insensitive).
 */
export const isUuid = (value: string): boolean => UUID_REGEX.test(value);
