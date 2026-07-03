import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GeographicJourneyModal } from '../GeographicJourneyModal';
import type { Person } from '../../../../types/person';
import type { LocationData } from '../../../../types/tree';
import type { MapViewProps } from '../geography/MapView';

const mockMap = {
  fitBounds: vi.fn(),
  setView: vi.fn(),
  getZoom: () => 3,
  getBounds: () => ({
    getWest: () => -180,
    getSouth: () => -90,
    getEast: () => 180,
    getNorth: () => 90,
  }),
};

vi.mock('leaflet', () => ({
  default: {
    canvas: () => ({}),
    divIcon: (options: unknown) => options,
    latLngBounds: (coordinates: unknown) => ({ coordinates }),
    point: (x: number, y: number) => ({ x, y }),
  },
}));

vi.mock('../geography/MapView', () => ({
  MapView: ({
    mode,
    showPlaceLabels,
    migrationJourney,
    onMapReady,
    onTogglePersonSelection,
    onSelectRoute,
  }: MapViewProps) => {
    React.useEffect(() => {
      onMapReady(mockMap as unknown as L.Map);
    }, [onMapReady]);

    return (
      <div data-testid="map-container">
        <div data-testid="tile-layer" data-url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png" />
        {showPlaceLabels ? (
          <div className="journey-label-tiles" data-testid="tile-layer" data-url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png" />
        ) : null}
        {mode === 'events' ? <div data-testid="cluster-markers" /> : null}
        {mode === 'migration' ? (
          <>
            {migrationJourney.nodes.map((node) => (
              <div
                key={`${node.personId}-${node.locationName}`}
                data-testid="map-marker"
                onClick={() => onTogglePersonSelection(node.personId)}
              >
                {node.name}
              </div>
            ))}
            <div data-testid="migration-paths" onClick={() => onSelectRoute('some-route')} />
          </>
        ) : null}
      </div>
    );
  },
}));

vi.mock('../geography/MapBranding', () => ({
  applyBranding: (dataUrl: string) => dataUrl,
}));

vi.mock('../../../../context/OverlayContext', () => ({
  OverlayPrimitive: ({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) =>
    isOpen ? <div>{children}</div> : null,
}));

vi.mock('../../../../context/TranslationContext', () => ({
  useTranslation: () => ({
    language: 'en',
    t: {
      capturing: 'Capturing...',
      close: 'Close',
      exportImage: 'Export Image',
      geography: 'Geography',
      unnamedPerson: 'Unnamed person',
      statistics: {
        uniqueLocations: 'Unique Locations',
      },
    },
  }),
}));

vi.mock('../../../../store/useAppStore', () => ({
  useAppStore: (selector: (state: { treeName: string }) => unknown) => selector({ treeName: 'Test Tree' }),
}));

vi.mock('../../../../utils/showToast', () => ({
  showToast: {
    error: vi.fn(),
  },
}));

vi.mock('../../../../utils/fileUtils', () => ({
  downloadFile: vi.fn(),
}));

vi.mock('html-to-image', () => ({
  toPng: vi.fn(),
}));

const person: Person = {
  id: 'person-1',
  title: '',
  firstName: 'Amina',
  middleName: '',
  lastName: 'Saleh',
  birthName: '',
  nickName: '',
  suffix: '',
  gender: 'female',
  birthDate: '1900-01-01',
  birthPlace: 'Aleppo',
  birthSource: '',
  deathDate: '',
  deathPlace: '',
  deathSource: '',
  burialPlace: '',
  residence: '',
  isDeceased: false,
  profession: '',
  company: '',
  interests: '',
  bio: '',
  gallery: [],
  voiceNotes: [],
  sources: [],
  events: [],
  email: '',
  website: '',
  blog: '',
  address: '',
  parents: [],
  spouses: [],
  children: [],
};

const locations: Record<string, LocationData> = {
  Aleppo: {
    lat: 36.2,
    lng: 37.1,
    resolvedName: 'Aleppo',
    status: 'resolved',
  },
  Damascus: {
    lat: 33.5,
    lng: 36.3,
    resolvedName: 'Damascus',
    status: 'resolved',
  },
};

describe('GeographicJourneyModal', () => {
  it('renders the quiet map without place label tiles by default', () => {
    render(
      <GeographicJourneyModal
        isOpen
        onClose={vi.fn()}
        people={{ [person.id]: person }}
        locations={locations}
        language="en"
        initialMode="events"
      />
    );

    expect(screen.getByTestId('map-container')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Place labels' })).toBeInTheDocument();
    expect(screen.getAllByTestId('tile-layer')).toHaveLength(1);
    expect(document.querySelector('.journey-label-tiles')).not.toBeInTheDocument();
  });

  it('shows place label tiles only after the user enables labels', () => {
    render(
      <GeographicJourneyModal
        isOpen
        onClose={vi.fn()}
        people={{ [person.id]: person }}
        locations={locations}
        language="en"
        initialMode="events"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Place labels' }));

    expect(document.querySelector('.journey-label-tiles')).toBeInTheDocument();
    expect(screen.getAllByTestId('tile-layer')).toHaveLength(2);
  });

  it('renders migration route counters and selected route details', () => {
    const migratingPerson: Person = {
      ...person,
      residence: 'Damascus',
    };

    render(
      <GeographicJourneyModal
        isOpen
        onClose={vi.fn()}
        people={{ [migratingPerson.id]: migratingPerson }}
        locations={locations}
        language="en"
        initialMode="migration"
      />
    );

    expect(screen.getByText('Routes')).toBeInTheDocument();
    expect(screen.getByText('Points')).toBeInTheDocument();
    expect(screen.getByText('Migration Routes')).toBeInTheDocument();

    const damascusText = screen.getAllByText('Damascus').find(element => element.closest('button'));
    const routeButton = damascusText?.closest('button');
    expect(routeButton).not.toBeNull();
    fireEvent.click(routeButton as HTMLButtonElement);

    expect(screen.getByText('Selected route')).toBeInTheDocument();
    expect(screen.getByText('From')).toBeInTheDocument();
    expect(screen.getByText('To')).toBeInTheDocument();
    expect(screen.getByText('Show all paths')).toBeInTheDocument();
    expect(mockMap.fitBounds).toHaveBeenCalled();
  });
});
