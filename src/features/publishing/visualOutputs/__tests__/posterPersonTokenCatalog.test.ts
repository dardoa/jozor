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

  it('reveals private names only for the owner selection control while preserving opaque tokens', () => {
    const session = createPosterPersonTokenCatalogSession('owner-control');
    const source = [
      { rawId: 'private-person', displayName: 'Private Person', isPrivate: true },
    ] as const;
    const ownerCatalog = session.createCatalog(
      source,
      { language: 'en', privacyMode: 'masked', audience: 'owner-control' }
    );
    const posterCatalog = session.createCatalog(
      source,
      { language: 'en', privacyMode: 'masked' }
    );

    expect(ownerCatalog.tokens[0]).toEqual({
      token: expect.stringMatching(/^session-token-/),
      label: 'Private Person',
    });
    expect(posterCatalog.tokens[0]).toEqual({
      token: ownerCatalog.tokens[0].token,
      label: 'Masked person',
    });
  });

  it('adds available life years to owner-control labels to distinguish duplicate names', () => {
    const catalog = createPosterPersonTokenCatalogSession('owner-years').createCatalog(
      [
        { rawId: 'person-a', displayName: 'Same Name', birthDate: '1950-05-02', deathDate: '2020-01-01' },
        { rawId: 'person-b', displayName: 'Same Name', birthDate: '1980-03-04', isLiving: true },
      ],
      { language: 'en', privacyMode: 'masked', audience: 'owner-control' }
    );

    expect(catalog.tokens.map(({ label }) => label)).toEqual([
      'Same Name (1950\u20132020)',
      'Same Name (1980\u2013)',
    ]);
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
