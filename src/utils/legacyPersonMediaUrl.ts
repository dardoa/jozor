/** Private Storage URLs require an asset descriptor and the authenticated resolver. */
export const getLegacyPersonMediaUrl = (value: string | null | undefined): string | null => {
  const source = value?.trim();
  if (!source) return null;

  try {
    const url = new URL(source, source.startsWith('/') ? 'https://local.invalid' : undefined);
    if (url.username || url.password) return null;
    if (url.protocol === 'blob:') return source;
    if (url.protocol === 'data:') {
      return /^data:image\/(?:png|jpeg|webp|gif);base64,/i.test(source) ? source : null;
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

    const path = decodeURIComponent(url.pathname).toLowerCase();
    if (path.startsWith('/storage/v1/')) {
      const publicImage = /^\/storage\/v1\/(?:object|render\/image)\/public\/([^/]+)\/.+/.exec(path);
      if (!publicImage || publicImage[1] === 'person-media') return null;
    }
    for (const key of url.searchParams.keys()) {
      if (/^(?:token|access_token|refresh_token|apikey|authorization)$/i.test(key)) return null;
    }
    return source;
  } catch {
    return null;
  }
};
