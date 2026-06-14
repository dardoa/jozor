const LEADING_BOM_PATTERN = /^(?:(?:\uFEFF)|(?:ï»¿)|(?:%EF%BB%BF)|(?:%C3%AF%C2%BB%C2%BF))+/i;

export function normalizeHttpOrigin(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;

  const cleaned = value.trim().replace(LEADING_BOM_PATTERN, '').trim();
  if (!cleaned) return null;

  try {
    const url = new URL(cleaned);
    if (
      (url.protocol !== 'https:' && url.protocol !== 'http:')
      || url.username
      || url.password
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}
