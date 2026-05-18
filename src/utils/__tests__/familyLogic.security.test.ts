
import { describe, expect, it } from 'vitest';

import { validatePerson } from '../familyLogic';

describe('validatePerson security hardening', () => {
  it('strips executable source URLs from imported people', () => {
    const person = validatePerson({
      firstName: 'Imported',
      sources: [
        {
          id: 'source-1',
          title: 'Unsafe source',
          url: 'javascript:alert(document.domain)',
        },
        {
          id: 'source-2',
          title: 'Safe source',
          url: 'https://archive.example/source',
        },
      ],
    });

    expect(person.sources[0].url).toBeUndefined();
    expect(person.sources[1].url).toBe('https://archive.example/source');
  });
});

