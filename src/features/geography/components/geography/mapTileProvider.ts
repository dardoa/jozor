export interface MapTileProviderConfig {
  baseUrl: string;
  labelsUrl: string | null;
  attribution: string;
  supportsLabelToggle: boolean;
}

interface MapTileProviderEnvironment {
  VITE_GEOGRAPHY_TILE_URL?: string;
  VITE_GEOGRAPHY_LABEL_TILE_URL?: string;
  VITE_GEOGRAPHY_TILE_ATTRIBUTION?: string;
}

const DEFAULT_OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const DEFAULT_OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const isValidHttpsTileTemplate = (value: string | undefined): value is string => {
  if (!value) return false;
  try {
    const url = new URL(value.replace('{z}', '0').replace('{x}', '0').replace('{y}', '0').replace('{r}', ''));
    return url.protocol === 'https:' && value.includes('{z}') && value.includes('{x}') && value.includes('{y}');
  } catch {
    return false;
  }
};

const sanitizeAttribution = (value: string | undefined): string | null => {
  const normalized = value?.trim();
  if (!normalized || /[<>]/.test(normalized)) return null;
  return normalized.slice(0, 160);
};

export const createMapTileProvider = (
  environment: MapTileProviderEnvironment,
): MapTileProviderConfig => {
  const configuredBaseUrl = isValidHttpsTileTemplate(environment.VITE_GEOGRAPHY_TILE_URL)
    ? environment.VITE_GEOGRAPHY_TILE_URL
    : null;
  const configuredLabelsUrl = isValidHttpsTileTemplate(environment.VITE_GEOGRAPHY_LABEL_TILE_URL)
    ? environment.VITE_GEOGRAPHY_LABEL_TILE_URL
    : null;

  return {
    baseUrl: configuredBaseUrl ?? DEFAULT_OSM_TILE_URL,
    labelsUrl: configuredBaseUrl && configuredLabelsUrl ? configuredLabelsUrl : null,
    attribution: configuredBaseUrl
      ? sanitizeAttribution(environment.VITE_GEOGRAPHY_TILE_ATTRIBUTION) ?? 'OpenStreetMap contributors'
      : DEFAULT_OSM_ATTRIBUTION,
    supportsLabelToggle: Boolean(configuredBaseUrl && configuredLabelsUrl),
  };
};

export const mapTileProvider = createMapTileProvider(import.meta.env);
