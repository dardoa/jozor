import { describe, expect, it } from 'vitest';

import { createMapTileProvider } from '../mapTileProvider';

describe('map tile provider', () => {
  it('uses the official OpenStreetMap tile endpoint without requiring a key', () => {
    expect(createMapTileProvider({})).toMatchObject({
      baseUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      labelsUrl: null,
      supportsLabelToggle: false,
    });
  });

  it('enables label toggling only when both configured HTTPS layers are valid', () => {
    expect(createMapTileProvider({
      VITE_GEOGRAPHY_TILE_URL: 'https://maps.example/base/{z}/{x}/{y}.png',
      VITE_GEOGRAPHY_LABEL_TILE_URL: 'https://maps.example/labels/{z}/{x}/{y}.png',
      VITE_GEOGRAPHY_TILE_ATTRIBUTION: 'Example maps',
    })).toEqual({
      baseUrl: 'https://maps.example/base/{z}/{x}/{y}.png',
      labelsUrl: 'https://maps.example/labels/{z}/{x}/{y}.png',
      attribution: 'Example maps',
      supportsLabelToggle: true,
    });
  });

  it('rejects unsafe templates and markup in configured attribution', () => {
    expect(createMapTileProvider({
      VITE_GEOGRAPHY_TILE_URL: 'javascript:alert(1)',
      VITE_GEOGRAPHY_LABEL_TILE_URL: 'http://maps.example/{z}/{x}/{y}.png',
      VITE_GEOGRAPHY_TILE_ATTRIBUTION: '<img src=x>',
    })).toMatchObject({
      baseUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      labelsUrl: null,
      supportsLabelToggle: false,
    });
  });
});
