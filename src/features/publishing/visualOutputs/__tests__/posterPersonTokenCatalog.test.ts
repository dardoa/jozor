import { describe, expect, it } from 'vitest';
import { createPosterPersonTokenCatalogSession } from '../posterPersonTokenCatalog';

const PEOPLE = [
  { rawId: 'raw-root', displayName: 'Root Person', isLiving: true },
  { rawId: 'raw-parent', displayName: 'Parent Person', isLiving: false },
] as const;

describe('posterPersonTokenCatalog', () => {
  it('preserves token identity while language and privacy labels change', () => {
    const session = createPosterPersonTokenCatalogSession('stable-session');
    const maskedArabic = session.createCatalog(PEOPLE, { language: 'ar', privacyMode: 'masked' });
    const fullEnglish = session.createCatalog(PEOPLE, { language: 'en', privacyMode: 'owner-full' });

    expect(fullEnglish.tokens.map(({ token }) => token))
      .toEqual(maskedArabic.tokens.map(({ token }) => token));
    expect(maskedArabic.tokens[0].label).toBe('شخص مخفي');
    expect(fullEnglish.tokens[0].label).toBe('Root Person');
  });

  it('isolates identical raw IDs across separate tree sessions', () => {
    const first = createPosterPersonTokenCatalogSession('tree-a').createCatalog(
      PEOPLE,
      { language: 'en', privacyMode: 'owner-full' }
    );
    const second = createPosterPersonTokenCatalogSession('tree-b').createCatalog(
      PEOPLE,
      { language: 'en', privacyMode: 'owner-full' }
    );

    expect(first.defaultToken).not.toBe(second.defaultToken);
    expect(second.hasToken(first.defaultToken ?? '')).toBe(false);
  });

  it('prevents a disposed tree session from creating new catalogs', () => {
    const session = createPosterPersonTokenCatalogSession('disposed-tree');
    session.createCatalog(PEOPLE, { language: 'en', privacyMode: 'owner-full' });
    session.dispose();

    expect(() => session.createCatalog(PEOPLE, { language: 'en', privacyMode: 'owner-full' }))
      .toThrow('disposed');
  });
});
