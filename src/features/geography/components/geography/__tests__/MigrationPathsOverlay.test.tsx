import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MigrationLink } from '../../../../../domain/mapJourneyUtils';
import { MigrationPathsOverlay } from '../MigrationPathsOverlay';

const mockMap = {
  latLngToContainerPoint: ([lat, lng]: [number, number]) => ({
    x: lng * 10,
    y: lat * -10,
  }),
};

vi.mock('react-leaflet', () => ({
  useMap: () => mockMap,
  useMapEvents: () => mockMap,
}));

const makeLink = (overrides: Partial<MigrationLink> = {}): MigrationLink => ({
  id: 'Aleppo=>Damascus',
  color: '#8B6914',
  count: 2,
  source: {
    personId: 'person-1',
    name: 'Amina Saleh',
    locationName: 'Aleppo',
    lat: 36.2,
    lng: 37.1,
    year: 1900,
  },
  target: {
    personId: 'person-1',
    name: 'Amina Saleh',
    locationName: 'Damascus',
    lat: 33.5,
    lng: 36.3,
    year: 1920,
  },
  people: [
    { id: 'person-1', name: 'Amina Saleh', year: 1920 },
    { id: 'person-2', name: 'Omar Saleh', year: 1922 },
  ],
  ...overrides,
});

describe('MigrationPathsOverlay', () => {
  it('renders route paths and emits the selected route id when clicked', () => {
    const onSelectRoute = vi.fn();

    render(
      <MigrationPathsOverlay
        links={[makeLink()]}
        selectedPersonId={null}
        selectedRouteId={null}
        onSelectRoute={onSelectRoute}
      />
    );

    const routeTitle = screen.getByText('Aleppo -> Damascus (2)');
    const routePath = routeTitle.closest('path');

    expect(routePath).not.toBeNull();
    expect(routePath).toHaveAttribute('marker-end', 'url(#migration-arrow-muted)');

    fireEvent.click(routePath as SVGPathElement);

    expect(onSelectRoute).toHaveBeenCalledWith('Aleppo=>Damascus');
  });

  it('shows only the selected route when selectedRouteId is set', () => {
    render(
      <MigrationPathsOverlay
        links={[
          makeLink(),
          makeLink({
            id: 'Hama=>Riyadh',
            source: {
              personId: 'person-3',
              name: 'Nour Saleh',
              locationName: 'Hama',
              lat: 35.1,
              lng: 36.7,
            },
            target: {
              personId: 'person-3',
              name: 'Nour Saleh',
              locationName: 'Riyadh',
              lat: 24.7,
              lng: 46.7,
            },
            count: 1,
            people: [{ id: 'person-3', name: 'Nour Saleh' }],
          }),
        ]}
        selectedPersonId={null}
        selectedRouteId="Hama=>Riyadh"
      />
    );

    expect(screen.queryByText('Aleppo -> Damascus (2)')).not.toBeInTheDocument();
    expect(screen.getByText('Hama -> Riyadh (1)')).toBeInTheDocument();
  });
});
