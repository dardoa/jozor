import type { PosterDesignState } from './posterStateContracts';
import { getPosterPresetDefinition } from './posterPresets';

export interface PosterDesignDocumentMetadata {
  readonly schemaVersion: number;
  readonly createdAtIso: string;
  readonly updatedAtIso: string;
  readonly title?: string;
  readonly authorApp: string;
}

export interface PosterDesignDocument {
  readonly version: '1.0';
  readonly metadata: PosterDesignDocumentMetadata;
  readonly state: PosterDesignState;
}

const UUID_SUBSTRING_REGEX = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/i;
const RAW_PERSON_ID_SUBSTRING_REGEX = /person_[a-zA-Z0-9_-]+/i;
const SESSION_SAFE_TOKEN_REGEX = /^(preview-root-[a-zA-Z0-9_-]+|session-token-[a-zA-Z0-9_-]+)$/i;

const STORAGE_URL_REGEX = /(https?:\/\/|file:\/\/|s3:\/\/|blob:)/i;
const BASE64_IMAGE_REGEX = /^data:image\/(png|jpeg|webp|svg\+xml);base64,/i;
const AUTH_TOKEN_REGEX = /(bearer\s|secret_|api_key_|eyJ[a-zA-Z0-9_-]+\.eyJ)/i;
const SCRIPT_TAG_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/i;

const CSS_SAFE_COLOR_REGEX = /^(#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)|hsl\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*\))$/;

const NORMALIZED_FORBIDDEN_KEYS = new Set([
  'rawid',
  'personid',
  'email',
  'phone',
  'address',
  'notes',
  'photourl',
  'storagepath',
  'authtoken',
  'bearer',
  'jwt',
  'secret',
  'apikey',
  'password',
  'tokensecret',
  'proto',
  'constructor',
  'prototype',
]);

const REQUIRED_DOCUMENT_KEYS = new Set(['version', 'metadata', 'state']);
const REQUIRED_METADATA_KEYS = new Set(['schemaVersion', 'createdAtIso', 'updatedAtIso', 'title', 'authorApp']);
const REQUIRED_STATE_KEYS = new Set(['productMode', 'layoutMode', 'scope', 'activePresetId', 'shared', 'tiered', 'focus', 'radial', 'productBucket']);

const REQUIRED_SHARED_KEYS = new Set([
  'size', 'orientation', 'marginPreset', 'direction', 'privacyMode', 'includePhotos', 'hideLivingPhotos',
  'photoShape', 'showYears', 'showRelationship', 'showBirthPlace', 'showOccupation', 'showDescription',
  'connectorStyle', 'connectorPath', 'spacing', 'footerText', 'showJozorAttribution', 'colorPalette',
  'colorOverrides', 'decoration', 'ornament', 'typography', 'fontFamily', 'cardScale', 'cardEffect',
  'cardFrame', 'cardCorner', 'cardLayout', 'pageFrame', 'header', 'headerText', 'subheaderText', 'selectedPosterRootToken',
]);

const REQUIRED_TIERED_KEYS_V1 = new Set(['generationDepth']);
const REQUIRED_TIERED_KEYS_V2 = new Set(['generationDepth', 'lastTieredScope']);
const REQUIRED_FOCUS_KEYS = new Set(['focalPersonToken', 'ancestorDepth', 'descendantDepth', 'includeSpouses', 'includeSiblings', 'focalCardEmphasis']);
const REQUIRED_RADIAL_KEYS = new Set(['radialSpan', 'generationRings', 'ringSpacing', 'centerCardScale', 'labelOrientation']);
const REQUIRED_PRODUCT_BUCKET_KEYS = new Set(['tiledRows', 'tiledColumns', 'tiledSheetSize', 'tiledOverlapMm', 'branchCollectionIndexTitle']);

const ALLOWED_COLOR_OVERRIDE_KEYS = new Set(['background', 'cardBackground', 'accent', 'connector']);

/**
 * Checks if a string is a whitelisted session-safe person token.
 */
export function isWhitelistedSessionToken(token: unknown): boolean {
  if (typeof token !== 'string' || !token) return false;
  if (UUID_SUBSTRING_REGEX.test(token)) return false;
  if (RAW_PERSON_ID_SUBSTRING_REGEX.test(token)) return false;
  if (STORAGE_URL_REGEX.test(token)) return false;
  return SESSION_SAFE_TOKEN_REGEX.test(token);
}

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function checkExactKeys(obj: Record<string, unknown>, requiredKeys: Set<string>, contextName: string): string | undefined {
  const objKeys = Object.keys(obj);
  for (const reqKey of requiredKeys) {
    if (reqKey === 'title' || reqKey === 'colorOverrides') continue;
    if (!(reqKey in obj)) {
      return `Missing required key "${reqKey}" in ${contextName}`;
    }
  }
  for (const key of objKeys) {
    if (!requiredKeys.has(key)) {
      return `Unknown key "${key}" in ${contextName}`;
    }
  }
  return undefined;
}

/**
 * Recursively scans an object for security violations (URLs, raw IDs, auth tokens, script tags, normalized forbidden keys).
 */
export function scanValueForSecurityViolations(val: unknown, path: string = ''): { readonly safe: boolean; readonly error?: string } {
  if (val === null || val === undefined) return { safe: true };

  if (typeof val === 'string') {
    if (STORAGE_URL_REGEX.test(val)) {
      return { safe: false, error: `URL detected at ${path}: ${val}` };
    }
    if (BASE64_IMAGE_REGEX.test(val)) {
      return { safe: false, error: `Base64 image payload detected at ${path}` };
    }
    if (AUTH_TOKEN_REGEX.test(val)) {
      return { safe: false, error: `Auth token or secret detected at ${path}` };
    }
    if (SCRIPT_TAG_REGEX.test(val)) {
      return { safe: false, error: `Unsafe script payload detected at ${path}` };
    }
    return { safe: true };
  }

  if (typeof val === 'object') {
    if (Array.isArray(val)) {
      for (let i = 0; i < val.length; i++) {
        const res = scanValueForSecurityViolations(val[i], `${path}[${i}]`);
        if (!res.safe) return res;
      }
      return { safe: true };
    }

    const obj = val as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
      const normalized = normalizeKey(key);
      if (NORMALIZED_FORBIDDEN_KEYS.has(normalized)) {
        return { safe: false, error: `Forbidden key "${key}" detected at ${path}` };
      }
      const res = scanValueForSecurityViolations(obj[key], path ? `${path}.${key}` : key);
      if (!res.safe) return res;
    }
  }

  return { safe: true };
}

/**
 * Validates state safety and returns detailed error message if unsafe or structurally invalid.
 */
export function validateStateSafety(state: unknown, schemaVersion: number = 2): { readonly safe: boolean; readonly error?: string } {
  if (typeof state !== 'object' || state === null) {
    return { safe: false, error: 'State must be a non-null object' };
  }
  const s = state as Record<string, unknown>;

  const stateKeyErr = checkExactKeys(s, REQUIRED_STATE_KEYS, 'state object');
  if (stateKeyErr) return { safe: false, error: stateKeyErr };

  const validProductModes = ['detailed-poster', 'full-tree-overview', 'branch-collection', 'tiled-wall'];
  const validLayoutModes = ['tiered', 'focus-family', 'radial-generations'];
  const validScopes = ['full-tree', 'ancestors', 'descendants', 'selected-branch', 'around-person'];

  if (!validProductModes.includes(String(s.productMode))) return { safe: false, error: 'Invalid productMode' };
  if (!validLayoutModes.includes(String(s.layoutMode))) return { safe: false, error: 'Invalid layoutMode' };
  if (!validScopes.includes(String(s.scope))) return { safe: false, error: 'Invalid scope' };
  
  if (typeof s.activePresetId !== 'string' || !getPosterPresetDefinition(s.activePresetId)) {
    return { safe: false, error: `Unregistered activePresetId "${s.activePresetId}"` };
  }

  if (typeof s.shared !== 'object' || s.shared === null) return { safe: false, error: 'Missing shared bucket' };
  if (typeof s.tiered !== 'object' || s.tiered === null) return { safe: false, error: 'Missing tiered bucket' };
  if (typeof s.focus !== 'object' || s.focus === null) return { safe: false, error: 'Missing focus bucket' };
  if (typeof s.radial !== 'object' || s.radial === null) return { safe: false, error: 'Missing radial bucket' };
  if (typeof s.productBucket !== 'object' || s.productBucket === null) return { safe: false, error: 'Missing productBucket' };

  const shared = s.shared as Record<string, unknown>;
  const tiered = s.tiered as Record<string, unknown>;
  const focus = s.focus as Record<string, unknown>;
  const radial = s.radial as Record<string, unknown>;
  const productBucket = s.productBucket as Record<string, unknown>;

  const sharedErr = checkExactKeys(shared, REQUIRED_SHARED_KEYS, 'shared bucket');
  if (sharedErr) return { safe: false, error: sharedErr };

  const tieredKeys = schemaVersion === 1 ? REQUIRED_TIERED_KEYS_V1 : REQUIRED_TIERED_KEYS_V2;
  const tieredErr = checkExactKeys(tiered, tieredKeys, 'tiered bucket');
  if (tieredErr) return { safe: false, error: tieredErr };

  const focusErr = checkExactKeys(focus, REQUIRED_FOCUS_KEYS, 'focus bucket');
  if (focusErr) return { safe: false, error: focusErr };

  const radialErr = checkExactKeys(radial, REQUIRED_RADIAL_KEYS, 'radial bucket');
  if (radialErr) return { safe: false, error: radialErr };

  const prodErr = checkExactKeys(productBucket, REQUIRED_PRODUCT_BUCKET_KEYS, 'productBucket');
  if (prodErr) return { safe: false, error: prodErr };

  // Validate shared enum contracts & boolean types
  const validSizes = ['A4', 'A3', 'A2', 'A1', 'A0'];
  if (!validSizes.includes(String(shared.size))) return { safe: false, error: 'Invalid shared.size' };

  const validOrientations = ['portrait', 'landscape'];
  if (!validOrientations.includes(String(shared.orientation))) return { safe: false, error: 'Invalid shared.orientation' };

  const validMargins = ['compact', 'balanced', 'generous'];
  if (!validMargins.includes(String(shared.marginPreset))) return { safe: false, error: 'Invalid shared.marginPreset' };

  const validDirections = ['vertical', 'horizontal'];
  if (!validDirections.includes(String(shared.direction))) return { safe: false, error: 'Invalid shared.direction' };

  const validPrivacies = ['masked', 'owner-full'];
  if (!validPrivacies.includes(String(shared.privacyMode))) return { safe: false, error: 'Invalid shared.privacyMode' };

  if (typeof shared.includePhotos !== 'boolean') return { safe: false, error: 'includePhotos must be boolean' };
  if (typeof shared.hideLivingPhotos !== 'boolean') return { safe: false, error: 'hideLivingPhotos must be boolean' };
  if (typeof shared.showYears !== 'boolean') return { safe: false, error: 'showYears must be boolean' };
  if (typeof shared.showRelationship !== 'boolean') return { safe: false, error: 'showRelationship must be boolean' };
  if (typeof shared.showBirthPlace !== 'boolean') return { safe: false, error: 'showBirthPlace must be boolean' };
  if (typeof shared.showOccupation !== 'boolean') return { safe: false, error: 'showOccupation must be boolean' };
  if (typeof shared.showDescription !== 'boolean') return { safe: false, error: 'showDescription must be boolean' };
  if (typeof shared.showJozorAttribution !== 'boolean') return { safe: false, error: 'showJozorAttribution must be boolean' };

  const validPhotoShapes = ['circle', 'square', 'rounded'];
  if (!validPhotoShapes.includes(String(shared.photoShape))) return { safe: false, error: 'Invalid shared.photoShape' };

  const validConnectorStyles = ['subtle', 'classic', 'bold'];
  if (!validConnectorStyles.includes(String(shared.connectorStyle))) return { safe: false, error: 'Invalid shared.connectorStyle' };

  const validConnectorPaths = ['style-default', 'straight', 'orthogonal', 'curved'];
  if (!validConnectorPaths.includes(String(shared.connectorPath))) return { safe: false, error: 'Invalid shared.connectorPath' };

  const validSpacings = ['style-default', 'compact', 'balanced', 'airy'];
  if (!validSpacings.includes(String(shared.spacing))) return { safe: false, error: 'Invalid shared.spacing' };

  if (typeof shared.footerText !== 'string' || shared.footerText.length > 80) {
    return { safe: false, error: 'Invalid shared.footerText' };
  }

  const validPalettes = ['style-default', 'heritage-warm', 'gallery-dark', 'evergreen', 'monochrome-print'];
  if (!validPalettes.includes(String(shared.colorPalette))) return { safe: false, error: 'Invalid shared.colorPalette' };

  // Explicit enum validation for remaining contract fields
  const validDecorations = ['style-default', 'clean', 'paper-grain', 'lineage-grid'];
  if (!validDecorations.includes(String(shared.decoration))) return { safe: false, error: 'Invalid shared.decoration' };

  const validOrnaments = ['style-default', 'none', 'lineage-medallion', 'gallery-marks', 'corner-branches'];
  if (!validOrnaments.includes(String(shared.ornament))) return { safe: false, error: 'Invalid shared.ornament' };

  const validTypographies = ['balanced', 'prominent', 'compact'];
  if (!validTypographies.includes(String(shared.typography))) return { safe: false, error: 'Invalid shared.typography' };

  const validFontFamilies = ['style-default', 'amiri', 'noto-sans-arabic', 'noto-kufi-arabic'];
  if (!validFontFamilies.includes(String(shared.fontFamily))) return { safe: false, error: 'Invalid shared.fontFamily' };

  const validCardScales = ['compact', 'standard', 'large'];
  if (!validCardScales.includes(String(shared.cardScale))) return { safe: false, error: 'Invalid shared.cardScale' };

  const validCardEffects = ['style-default', 'flat', 'soft', 'elevated'];
  if (!validCardEffects.includes(String(shared.cardEffect))) return { safe: false, error: 'Invalid shared.cardEffect' };

  const validCardFrames = ['style-default', 'minimal', 'classic', 'ornate'];
  if (!validCardFrames.includes(String(shared.cardFrame))) return { safe: false, error: 'Invalid shared.cardFrame' };

  const validCardCorners = ['style-default', 'square', 'soft', 'rounded'];
  if (!validCardCorners.includes(String(shared.cardCorner))) return { safe: false, error: 'Invalid shared.cardCorner' };

  const validCardLayouts = ['style-default', 'standard', 'photo-focused', 'text-minimal'];
  if (!validCardLayouts.includes(String(shared.cardLayout))) return { safe: false, error: 'Invalid shared.cardLayout' };

  const validPageFrames = ['style-default', 'none', 'minimal', 'heritage', 'gallery'];
  if (!validPageFrames.includes(String(shared.pageFrame))) return { safe: false, error: 'Invalid shared.pageFrame' };

  const validHeaders = ['style-default', 'ceremonial', 'gallery-rail', 'registry'];
  if (!validHeaders.includes(String(shared.header))) return { safe: false, error: 'Invalid shared.header' };

  // Validate colorOverrides if present
  if (shared.colorOverrides !== undefined) {
    if (typeof shared.colorOverrides !== 'object' || shared.colorOverrides === null || Array.isArray(shared.colorOverrides)) {
      return { safe: false, error: 'colorOverrides must be an object' };
    }
    const overrides = shared.colorOverrides as Record<string, unknown>;
    for (const k of Object.keys(overrides)) {
      if (!ALLOWED_COLOR_OVERRIDE_KEYS.has(k)) {
        return { safe: false, error: `Unknown key "${k}" in colorOverrides` };
      }
      const val = overrides[k];
      if (val !== undefined) {
        if (typeof val !== 'string' || !CSS_SAFE_COLOR_REGEX.test(val)) {
          return { safe: false, error: `Invalid color value for "${k}" in colorOverrides: ${val}` };
        }
      }
    }
  }

  // Validate bucket field types and integer ranges
  const genDepth = tiered.generationDepth;
  if (genDepth !== 'all') {
    if (typeof genDepth !== 'number' || !Number.isInteger(genDepth) || genDepth < 1 || genDepth > 4) {
      return { safe: false, error: 'generationDepth must be integer 1..4 or "all"' };
    }
  }

  if (schemaVersion === 2) {
    const lastScope = tiered.lastTieredScope;
    const validLastScopes = ['ancestors', 'descendants', 'full-tree'];
    if (!validLastScopes.includes(String(lastScope))) {
      return { safe: false, error: 'Invalid tiered.lastTieredScope' };
    }
  }

  const ancDepth = focus.ancestorDepth;
  if (ancDepth !== 'all') {
    if (typeof ancDepth !== 'number' || !Number.isInteger(ancDepth) || ancDepth < 1 || ancDepth > 4) {
      return { safe: false, error: 'ancestorDepth must be integer 1..4 or "all"' };
    }
  }

  const descDepth = focus.descendantDepth;
  if (descDepth !== 'all') {
    if (typeof descDepth !== 'number' || !Number.isInteger(descDepth) || descDepth < 1 || descDepth > 4) {
      return { safe: false, error: 'descendantDepth must be integer 1..4 or "all"' };
    }
  }

  if (typeof focus.includeSpouses !== 'boolean') return { safe: false, error: 'focus.includeSpouses must be boolean' };
  if (typeof focus.includeSiblings !== 'boolean') return { safe: false, error: 'focus.includeSiblings must be boolean' };

  const validEmphases = ['standard', 'bolder-border', 'glowing'];
  if (!validEmphases.includes(String(focus.focalCardEmphasis))) return { safe: false, error: 'Invalid focus.focalCardEmphasis' };

  const validSpans = ['360-full-circle', '180-half-fan'];
  if (!validSpans.includes(String(radial.radialSpan))) return { safe: false, error: 'Invalid radial.radialSpan' };

  const rings = radial.generationRings;
  if (typeof rings !== 'number' || !Number.isInteger(rings) || rings < 3 || rings > 6) {
    return { safe: false, error: 'generationRings must be integer 3..6' };
  }

  const validRingSpacings = ['compact', 'balanced', 'spacious'];
  if (!validRingSpacings.includes(String(radial.ringSpacing))) return { safe: false, error: 'Invalid radial.ringSpacing' };

  const validCenterScales = ['compact', 'standard', 'large'];
  if (!validCenterScales.includes(String(radial.centerCardScale))) return { safe: false, error: 'Invalid radial.centerCardScale' };

  const validLabelOrientations = ['straight-unwarped', 'curved'];
  if (!validLabelOrientations.includes(String(radial.labelOrientation))) return { safe: false, error: 'Invalid radial.labelOrientation' };

  const rows = productBucket.tiledRows;
  if (typeof rows !== 'number' || !Number.isInteger(rows) || rows < 2 || rows > 6) {
    return { safe: false, error: 'tiledRows must be integer 2..6' };
  }

  const cols = productBucket.tiledColumns;
  if (typeof cols !== 'number' || !Number.isInteger(cols) || cols < 2 || cols > 6) {
    return { safe: false, error: 'tiledColumns must be integer 2..6' };
  }

  const validTiledSizes = ['A4', 'A3', 'A2'];
  if (!validTiledSizes.includes(String(productBucket.tiledSheetSize))) return { safe: false, error: 'Invalid productBucket.tiledSheetSize' };

  const overlap = productBucket.tiledOverlapMm;
  if (typeof overlap !== 'number' || !Number.isInteger(overlap) || overlap < 6 || overlap > 12) {
    return { safe: false, error: 'tiledOverlapMm must be integer 6..12' };
  }

  if (typeof productBucket.branchCollectionIndexTitle !== 'string') {
    return { safe: false, error: 'productBucket.branchCollectionIndexTitle must be string' };
  }

  // Token whitelist validation
  if (!isWhitelistedSessionToken(shared.selectedPosterRootToken)) {
    return { safe: false, error: `Invalid selectedPosterRootToken: ${shared.selectedPosterRootToken}` };
  }
  if (!isWhitelistedSessionToken(focus.focalPersonToken)) {
    return { safe: false, error: `Invalid focalPersonToken: ${focus.focalPersonToken}` };
  }

  const scan = scanValueForSecurityViolations(state, 'state');
  if (!scan.safe) {
    return scan;
  }

  return { safe: true };
}

/**
 * Safely checks if an unknown input is a valid PosterDesignState shape without casting prematurely.
 */
export function validateStateShape(state: unknown, schemaVersion: number = 2): state is PosterDesignState {
  return validateStateSafety(state, schemaVersion).safe;
}

/**
 * Migrates a PosterDesignDocument from Schema Version 1 to Schema Version 2.
 */
export function migratePosterDesignDocumentV1ToV2(doc: PosterDesignDocument): PosterDesignDocument {
  if (doc.metadata.schemaVersion === 2) {
    return doc;
  }

  const lastScope =
    doc.state.scope !== 'around-person'
      ? (doc.state.scope as Exclude<typeof doc.state.scope, 'around-person'>)
      : 'ancestors';

  return {
    ...doc,
    metadata: {
      ...doc.metadata,
      schemaVersion: 2,
      updatedAtIso: new Date().toISOString(),
    },
    state: {
      ...doc.state,
      tiered: {
        ...doc.state.tiered,
        lastTieredScope: doc.state.tiered.lastTieredScope ?? lastScope,
      },
    },
  };
}

/**
 * Serializes a PosterDesignState into a versioned PosterDesignDocument JSON string.
 */
export function serializePosterDesignDocument(
  state: PosterDesignState,
  title?: string
): string {
  const safety = validateStateSafety(state, 2);
  if (!safety.safe) {
    throw new Error(`Serialization security violation: ${safety.error}`);
  }

  const cleanTitle = title ? title.trim().slice(0, 120) : 'مستند تصميم البوستر البصري';
  if (SCRIPT_TAG_REGEX.test(cleanTitle) || STORAGE_URL_REGEX.test(cleanTitle)) {
    throw new Error('Serialization security violation: Unsafe title payload');
  }

  const document: PosterDesignDocument = {
    version: '1.0',
    metadata: {
      schemaVersion: 2,
      createdAtIso: new Date().toISOString(),
      updatedAtIso: new Date().toISOString(),
      title: cleanTitle,
      authorApp: 'Jozor Visual Publishing Studio',
    },
    state,
  };

  return JSON.stringify(document, null, 2);
}

/**
 * Safely parses and validates a JSON string into a PosterDesignDocument.
 * Throws controlled Error on invalid JSON or unsafe content. NEVER throws TypeError.
 */
export function deserializePosterDesignDocument(jsonString: string): PosterDesignDocument {
  if (typeof jsonString !== 'string' || !jsonString.trim()) {
    throw new Error('Deserialization error: Input must be a non-empty string');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    throw new Error(`Deserialization error: Invalid JSON format (${err instanceof Error ? err.message : String(err)})`);
  }

  if (!validatePosterDesignDocument(parsed)) {
    throw new Error('Deserialization error: Document failed structural or security validation');
  }

  return migratePosterDesignDocumentV1ToV2(parsed);
}

/**
 * Safely checks if an unknown input is a structurally valid and safe PosterDesignDocument.
 * NEVER throws TypeError.
 */
export function validatePosterDesignDocument(doc: unknown): doc is PosterDesignDocument {
  try {
    if (typeof doc !== 'object' || doc === null) return false;
    const d = doc as Record<string, unknown>;

    const docKeyErr = checkExactKeys(d, REQUIRED_DOCUMENT_KEYS, 'document root');
    if (docKeyErr) return false;

    if (d.version !== '1.0') return false;
    if (typeof d.metadata !== 'object' || d.metadata === null) return false;

    const meta = d.metadata as Record<string, unknown>;
    const metaKeyErr = checkExactKeys(meta, REQUIRED_METADATA_KEYS, 'metadata');
    if (metaKeyErr) return false;

    const version = meta.schemaVersion;
    if (version !== 1 && version !== 2) return false;
    if (typeof meta.createdAtIso !== 'string' || isNaN(Date.parse(meta.createdAtIso))) return false;
    if (typeof meta.updatedAtIso !== 'string' || isNaN(Date.parse(meta.updatedAtIso))) return false;
    if (typeof meta.authorApp !== 'string' || !meta.authorApp) return false;

    if (meta.title !== undefined) {
      if (typeof meta.title !== 'string' || meta.title.length > 120) return false;
      if (SCRIPT_TAG_REGEX.test(meta.title) || STORAGE_URL_REGEX.test(meta.title)) return false;
    }

    if (!validateStateShape(d.state, version as number)) return false;

    return true;
  } catch {
    return false;
  }
}

export interface PosterDocumentSchemaValidationResult {
  readonly valid: boolean;
  readonly error?: string;
  readonly migratedDocument?: PosterDesignDocument;
}

/**
 * Validates document schema version with explicit v1 migration, strict v2 completeness,
 * and controlled rejection of unknown schema versions.
 */
export function validatePosterDesignDocumentSchema(doc: unknown): PosterDocumentSchemaValidationResult {
  if (typeof doc !== 'object' || doc === null) {
    return { valid: false, error: 'Document must be a non-null object' };
  }

  const d = doc as Record<string, unknown>;
  const meta = d.metadata as Record<string, unknown> | undefined;
  const version = meta?.schemaVersion;

  if (typeof version !== 'number' || (version !== 1 && version !== 2)) {
    return { valid: false, error: `Unsupported or unknown document schemaVersion: ${String(version)}` };
  }

  if (!validatePosterDesignDocument(doc)) {
    return { valid: false, error: 'Document failed structural or security validation' };
  }

  const migratedDocument = migratePosterDesignDocumentV1ToV2(doc as PosterDesignDocument);
  if (!validatePosterDesignDocument(migratedDocument) || migratedDocument.metadata.schemaVersion !== 2) {
    return { valid: false, error: 'Migrated document failed strict v2 schema validation' };
  }

  return { valid: true, migratedDocument };
}
