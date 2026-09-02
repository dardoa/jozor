import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import MapViewImpl from '../MapViewImpl';

interface TileEvents {
  tileerror?: () => void;
  tileload?: () => void;
}

vi.mock('leaflet', () => ({
  default: {
    canvas: () => ({}),
    divIcon: (options: unknown) => options,
    point: (x: number, y: number) => ({ x, y }),
  },
}));

vi.mock('supercluster', () => ({
  default: class MockSupercluster {
    load() {
      return this;
    }
  },
}));

vi.mock('react-leaflet', async () => {
  const ReactModule = await import('react');

  return {
    MapContainer: ReactModule.forwardRef<HTMLDivElement, { children: React.ReactNode }>(
      ({ children }, _ref) => <div data-testid="map-container">{children}</div>,
    ),
    Marker: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    Popup: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    TileLayer: ({ eventHandlers }: { eventHandlers?: TileEvents }) => (
      <div data-testid="tile-layer">
        <button type="button" onClick={() => eventHandlers?.tileerror?.()}>
          fail tile
        </button>
        <button type="button" onClick={() => eventHandlers?.tileload?.()}>
          load tile
        </button>
      </div>
    ),
  };
});

vi.mock('../ClusterMarkers', () => ({ ClusterMarkers: () => null }));
vi.mock('../MigrationPathsOverlay', () => ({ MigrationPathsOverlay: () => null }));
vi.mock('../MapLabelPane', () => ({ MapLabelPane: () => null }));

describe('MapViewImpl tile resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps map content usable and reports repeated tile failures until loading recovers', () => {
    render(
      <MapViewImpl
        mode="events"
        eventLocations={[]}
        migrationJourney={{ nodes: [], links: [] }}
        showPlaceLabels={false}
        isRtl={false}
        selectedPersonId={null}
        selectedRouteId={null}
        onMapReady={vi.fn()}
        onSelectPerson={vi.fn()}
        onSelectRoute={vi.fn()}
        onTogglePersonSelection={vi.fn()}
      />,
    );

    const failButton = screen.getByRole('button', { name: 'fail tile' });
    fireEvent.click(failButton);
    fireEvent.click(failButton);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    fireEvent.click(failButton);
    expect(screen.getByRole('alert')).toHaveTextContent('The map background could not be loaded');
    expect(screen.getByTestId('map-container')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'load tile' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
