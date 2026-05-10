const ALLOWED_EXTERNAL_URL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

export const getSafeExternalUrl = (rawUrl?: string | null): string | null => {
  const value = rawUrl?.trim();
  if (!value) return null;

  try {
    const parsed = new URL(value);
    return ALLOWED_EXTERNAL_URL_PROTOCOLS.has(parsed.protocol) ? parsed.href : null;
  } catch {
    return null;
  }
};

export const sanitizeExternalUrl = (rawUrl?: string | null): string | undefined =>
  getSafeExternalUrl(rawUrl) ?? undefined;
