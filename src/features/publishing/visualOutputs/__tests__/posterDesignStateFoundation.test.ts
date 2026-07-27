import { describe, it, expect } from 'vitest';
import {
  createInitialPosterDesignState,
  applyPreset,
  isPresetModified,
  updateSharedSetting,
  switchLayoutMode,
  updateTieredBucket,
  updateFocusBucket,
  updateRadialBucket,
  resetSection,
  resetPoster,
  PosterHistoryManager,
} from '../posterDesignState';
import {
  getPosterLayoutCombinationCapability,
  requiresPrintQualityGate,
  requiresDedicatedTileQualityEvaluation,
} from '../posterCompatibilityModel';
import {
  serializePosterDesignDocument,
  validatePosterDesignDocument,
  validateStateSafety,
  isWhitelistedSessionToken,
} from '../posterDesignDocument';
import type {
  PosterProductMode,
  PosterLayoutMode,
  PosterTreeScope,
} from '../posterStateContracts';

describe('Phase 1A: Final Two-Issue Closure Pass', () => {
  describe('1. Table-Driven Matrix: All 48 Product × Layout × Scope Combinations', () => {
    const productModes: PosterProductMode[] = [
      'detailed-poster',
      'full-tree-overview',
      'branch-collection',
      'tiled-wall',
    ];
    const layoutModes: PosterLayoutMode[] = ['tiered', 'focus-family', 'radial-generations'];
    const scopes: PosterTreeScope[] = ['full-tree', 'ancestors', 'descendants', 'selected-branch'];

    const expectedMatrix: Record<string, 'runtime-supported-and-reachable' | 'quality-gated' | 'planned' | 'unassessed' | 'incompatible'> = {
      // detailed-poster x tiered
      'detailed-poster:tiered:ancestors': 'runtime-supported-and-reachable',
      'detailed-poster:tiered:descendants': 'runtime-supported-and-reachable',
      'detailed-poster:tiered:full-tree': 'quality-gated',
      'detailed-poster:tiered:selected-branch': 'planned',

      // detailed-poster x focus-family
      'detailed-poster:focus-family:ancestors': 'planned',
      'detailed-poster:focus-family:descendants': 'planned',
      'detailed-poster:focus-family:full-tree': 'incompatible',
      'detailed-poster:focus-family:selected-branch': 'incompatible',

      // detailed-poster x radial-generations
      'detailed-poster:radial-generations:ancestors': 'planned',
      'detailed-poster:radial-generations:descendants': 'planned',
      'detailed-poster:radial-generations:full-tree': 'unassessed',
      'detailed-poster:radial-generations:selected-branch': 'incompatible',

      // full-tree-overview x tiered
      'full-tree-overview:tiered:full-tree': 'runtime-supported-and-reachable',
      'full-tree-overview:tiered:ancestors': 'incompatible',
      'full-tree-overview:tiered:descendants': 'incompatible',
      'full-tree-overview:tiered:selected-branch': 'incompatible',

      // full-tree-overview x focus-family
      'full-tree-overview:focus-family:full-tree': 'incompatible',
      'full-tree-overview:focus-family:ancestors': 'incompatible',
      'full-tree-overview:focus-family:descendants': 'incompatible',
      'full-tree-overview:focus-family:selected-branch': 'incompatible',

      // full-tree-overview x radial-generations
      'full-tree-overview:radial-generations:full-tree': 'unassessed',
      'full-tree-overview:radial-generations:ancestors': 'incompatible',
      'full-tree-overview:radial-generations:descendants': 'incompatible',
      'full-tree-overview:radial-generations:selected-branch': 'incompatible',

      // branch-collection x tiered
      'branch-collection:tiered:full-tree': 'runtime-supported-and-reachable',
      'branch-collection:tiered:ancestors': 'incompatible',
      'branch-collection:tiered:descendants': 'incompatible',
      'branch-collection:tiered:selected-branch': 'planned',

      // branch-collection x focus-family
      'branch-collection:focus-family:full-tree': 'incompatible',
      'branch-collection:focus-family:ancestors': 'incompatible',
      'branch-collection:focus-family:descendants': 'incompatible',
      'branch-collection:focus-family:selected-branch': 'incompatible',

      // branch-collection x radial-generations
      'branch-collection:radial-generations:full-tree': 'incompatible',
      'branch-collection:radial-generations:ancestors': 'incompatible',
      'branch-collection:radial-generations:descendants': 'incompatible',
      'branch-collection:radial-generations:selected-branch': 'incompatible',

      // tiled-wall x tiered (quality-gated aligned with Phase 0A)
      'tiled-wall:tiered:full-tree': 'quality-gated',
      'tiled-wall:tiered:ancestors': 'incompatible',
      'tiled-wall:tiered:descendants': 'incompatible',
      'tiled-wall:tiered:selected-branch': 'planned',

      // tiled-wall x focus-family
      'tiled-wall:focus-family:full-tree': 'incompatible',
      'tiled-wall:focus-family:ancestors': 'incompatible',
      'tiled-wall:focus-family:descendants': 'incompatible',
      'tiled-wall:focus-family:selected-branch': 'incompatible',

      // tiled-wall x radial-generations
      'tiled-wall:radial-generations:full-tree': 'unassessed',
      'tiled-wall:radial-generations:ancestors': 'incompatible',
      'tiled-wall:radial-generations:descendants': 'incompatible',
      'tiled-wall:radial-generations:selected-branch': 'incompatible',
    };

    let totalEvaluated = 0;

    for (const prod of productModes) {
      for (const layout of layoutModes) {
        for (const sc of scopes) {
          const key = `${prod}:${layout}:${sc}`;
          it(`evaluates ${key} correctly against the matrix`, () => {
            const result = getPosterLayoutCombinationCapability(prod, layout, sc);
            const expectedStatus = expectedMatrix[key];
            expect(result.status).toBe(expectedStatus);

            if (expectedStatus === 'runtime-supported-and-reachable' || expectedStatus === 'quality-gated') {
              expect(result.isRuntimeSupported).toBe(true);
            } else {
              expect(result.isRuntimeSupported).toBe(false);
            }

            if (expectedStatus === 'planned') {
              expect(result.isPlanned).toBe(true);
            } else {
              expect(result.isPlanned).toBe(false);
            }
          });
          totalEvaluated++;
        }
      }
    }

    it('verifies that all 48 combinations were enumerated in tests', () => {
      expect(totalEvaluated).toBe(48);
      expect(Object.keys(expectedMatrix).length).toBe(48);
    });
  });

  describe('2. Dedicated Tile Quality Evaluation & No Invented >200 Heuristic', () => {
    it('reports requiresDedicatedTileQualityEvaluation correctly for Tiled Wall full-tree', () => {
      expect(requiresDedicatedTileQualityEvaluation('tiled-wall', 'tiered', 'full-tree')).toBe(true);
      expect(requiresDedicatedTileQualityEvaluation('detailed-poster', 'tiered', 'full-tree')).toBe(false);
    });

    it('proves no node-count heuristic (>200) duplicates the real tile engine in requiresPrintQualityGate', () => {
      // Small or large node count both return false in requiresPrintQualityGate for tiled-wall
      // because authoritative blocking decision belongs to PrintQualityReport in tiledWallPoster.ts
      expect(requiresPrintQualityGate('tiled-wall', 'tiered', 'full-tree', 'A3', 10)).toBe(false);
      expect(requiresPrintQualityGate('tiled-wall', 'tiered', 'full-tree', 'A3', 250)).toBe(false);
      expect(requiresPrintQualityGate('tiled-wall', 'tiered', 'full-tree', 'A3', 5000)).toBe(false);
    });
  });

  describe('3. Exhaustive Enum Validation (One Negative Test per Contract Group)', () => {
    it('rejects invalid decoration enum', () => {
      const validDoc = JSON.parse(serializePosterDesignDocument(createInitialPosterDesignState('classic-heritage')));
      validDoc.state.shared.decoration = 'fancy-stars';
      expect(validatePosterDesignDocument(validDoc)).toBe(false);
    });

    it('rejects invalid ornament enum', () => {
      const validDoc = JSON.parse(serializePosterDesignDocument(createInitialPosterDesignState('classic-heritage')));
      validDoc.state.shared.ornament = 'gold-emboss';
      expect(validatePosterDesignDocument(validDoc)).toBe(false);
    });

    it('rejects invalid typography enum', () => {
      const validDoc = JSON.parse(serializePosterDesignDocument(createInitialPosterDesignState('classic-heritage')));
      validDoc.state.shared.typography = 'ultra-bold';
      expect(validatePosterDesignDocument(validDoc)).toBe(false);
    });

    it('rejects invalid fontFamily enum', () => {
      const validDoc = JSON.parse(serializePosterDesignDocument(createInitialPosterDesignState('classic-heritage')));
      validDoc.state.shared.fontFamily = 'comic-sans';
      expect(validatePosterDesignDocument(validDoc)).toBe(false);
    });

    it('rejects invalid cardScale enum', () => {
      const validDoc = JSON.parse(serializePosterDesignDocument(createInitialPosterDesignState('classic-heritage')));
      validDoc.state.shared.cardScale = 'gigantic';
      expect(validatePosterDesignDocument(validDoc)).toBe(false);
    });

    it('rejects invalid cardEffect enum', () => {
      const validDoc = JSON.parse(serializePosterDesignDocument(createInitialPosterDesignState('classic-heritage')));
      validDoc.state.shared.cardEffect = 'glassmorphism-glow';
      expect(validatePosterDesignDocument(validDoc)).toBe(false);
    });

    it('rejects invalid cardFrame enum', () => {
      const validDoc = JSON.parse(serializePosterDesignDocument(createInitialPosterDesignState('classic-heritage')));
      validDoc.state.shared.cardFrame = 'heavy-wood';
      expect(validatePosterDesignDocument(validDoc)).toBe(false);
    });

    it('rejects invalid cardCorner enum', () => {
      const validDoc = JSON.parse(serializePosterDesignDocument(createInitialPosterDesignState('classic-heritage')));
      validDoc.state.shared.cardCorner = 'sharp-bevel';
      expect(validatePosterDesignDocument(validDoc)).toBe(false);
    });

    it('rejects invalid cardLayout enum', () => {
      const validDoc = JSON.parse(serializePosterDesignDocument(createInitialPosterDesignState('classic-heritage')));
      validDoc.state.shared.cardLayout = 'badge-only';
      expect(validatePosterDesignDocument(validDoc)).toBe(false);
    });

    it('rejects invalid pageFrame enum', () => {
      const validDoc = JSON.parse(serializePosterDesignDocument(createInitialPosterDesignState('classic-heritage')));
      validDoc.state.shared.pageFrame = 'double-gold';
      expect(validatePosterDesignDocument(validDoc)).toBe(false);
    });

    it('rejects invalid header enum', () => {
      const validDoc = JSON.parse(serializePosterDesignDocument(createInitialPosterDesignState('classic-heritage')));
      validDoc.state.shared.header = 'floating-title';
      expect(validatePosterDesignDocument(validDoc)).toBe(false);
    });

    it('rejects invalid radial.ringSpacing enum', () => {
      const validDoc = JSON.parse(serializePosterDesignDocument(createInitialPosterDesignState('classic-heritage')));
      validDoc.state.radial.ringSpacing = 'super-airy';
      expect(validatePosterDesignDocument(validDoc)).toBe(false);
    });

    it('rejects invalid radial.centerCardScale enum', () => {
      const validDoc = JSON.parse(serializePosterDesignDocument(createInitialPosterDesignState('classic-heritage')));
      validDoc.state.radial.centerCardScale = 'massive';
      expect(validatePosterDesignDocument(validDoc)).toBe(false);
    });

    it('rejects invalid radial.labelOrientation enum', () => {
      const validDoc = JSON.parse(serializePosterDesignDocument(createInitialPosterDesignState('classic-heritage')));
      validDoc.state.radial.labelOrientation = 'upside-down';
      expect(validatePosterDesignDocument(validDoc)).toBe(false);
    });
  });

  describe('4. Additional Negative Tests for Schema Validation', () => {
    it('rejects state missing shared.size', () => {
      const validDoc = JSON.parse(serializePosterDesignDocument(createInitialPosterDesignState('classic-heritage')));
      delete validDoc.state.shared.size;
      expect(validatePosterDesignDocument(validDoc)).toBe(false);
    });

    it('rejects invalid orientation values', () => {
      const validDoc = JSON.parse(serializePosterDesignDocument(createInitialPosterDesignState('classic-heritage')));
      validDoc.state.shared.orientation = 'square';
      expect(validatePosterDesignDocument(validDoc)).toBe(false);
    });

    it('rejects string values for includePhotos', () => {
      const validDoc = JSON.parse(serializePosterDesignDocument(createInitialPosterDesignState('classic-heritage')));
      (validDoc.state.shared as unknown as Record<string, unknown>).includePhotos = 'true';
      expect(validatePosterDesignDocument(validDoc)).toBe(false);
    });

    it('rejects invalid photoShape values', () => {
      const validDoc = JSON.parse(serializePosterDesignDocument(createInitialPosterDesignState('classic-heritage')));
      validDoc.state.shared.photoShape = 'hexagon';
      expect(validatePosterDesignDocument(validDoc)).toBe(false);
    });

    it('rejects invalid connectorStyle or connectorPath values', () => {
      const validDoc = JSON.parse(serializePosterDesignDocument(createInitialPosterDesignState('classic-heritage')));
      validDoc.state.shared.connectorStyle = 'super-bold';
      expect(validatePosterDesignDocument(validDoc)).toBe(false);

      const validDoc2 = JSON.parse(serializePosterDesignDocument(createInitialPosterDesignState('classic-heritage')));
      validDoc2.state.shared.connectorPath = 'wavy';
      expect(validatePosterDesignDocument(validDoc2)).toBe(false);
    });

    it('rejects unregistered activePresetId values', () => {
      const validDoc = JSON.parse(serializePosterDesignDocument(createInitialPosterDesignState('classic-heritage')));
      validDoc.state.activePresetId = 'custom-user-preset';
      expect(validatePosterDesignDocument(validDoc)).toBe(false);
    });

    it('rejects fractional numbers for generationDepth, generationRings, and tiledRows', () => {
      const validDoc = JSON.parse(serializePosterDesignDocument(createInitialPosterDesignState('classic-heritage')));

      const badDepth = JSON.parse(JSON.stringify(validDoc));
      badDepth.state.tiered.generationDepth = 2.5;
      expect(validatePosterDesignDocument(badDepth)).toBe(false);

      const badRings = JSON.parse(JSON.stringify(validDoc));
      badRings.state.radial.generationRings = 4.2;
      expect(validatePosterDesignDocument(badRings)).toBe(false);

      const badRows = JSON.parse(JSON.stringify(validDoc));
      badRows.state.productBucket.tiledRows = 3.14;
      expect(validatePosterDesignDocument(badRows)).toBe(false);
    });

    it('rejects invalid radialSpan values', () => {
      const validDoc = JSON.parse(serializePosterDesignDocument(createInitialPosterDesignState('classic-heritage')));
      validDoc.state.radial.radialSpan = '90-quarter';
      expect(validatePosterDesignDocument(validDoc)).toBe(false);
    });

    it('rejects non-boolean focus flags', () => {
      const validDoc = JSON.parse(serializePosterDesignDocument(createInitialPosterDesignState('classic-heritage')));
      (validDoc.state.focus as unknown as Record<string, unknown>).includeSpouses = 1;
      expect(validatePosterDesignDocument(validDoc)).toBe(false);
    });

    it('rejects invalid tiledSheetSize values', () => {
      const validDoc = JSON.parse(serializePosterDesignDocument(createInitialPosterDesignState('classic-heritage')));
      validDoc.state.productBucket.tiledSheetSize = 'LETTER';
      expect(validatePosterDesignDocument(validDoc)).toBe(false);
    });

    it('rejects malformed colorOverrides payloads (injections, unknown keys, non-css colors)', () => {
      const validDoc = JSON.parse(serializePosterDesignDocument(createInitialPosterDesignState('classic-heritage')));

      const badKey = JSON.parse(JSON.stringify(validDoc));
      badKey.state.shared.colorOverrides = { unknownColorKey: '#ffffff' };
      expect(validatePosterDesignDocument(badKey)).toBe(false);

      const badXss = JSON.parse(JSON.stringify(validDoc));
      badXss.state.shared.colorOverrides = { background: 'javascript:alert()' };
      expect(validatePosterDesignDocument(badXss)).toBe(false);

      const badType = JSON.parse(JSON.stringify(validDoc));
      badType.state.shared.colorOverrides = 'not-an-object';
      expect(validatePosterDesignDocument(badType)).toBe(false);
    });

    it('rejects case-insensitive and normalized forbidden keys', () => {
      const validDoc = JSON.parse(serializePosterDesignDocument(createInitialPosterDesignState('classic-heritage')));

      const forbiddenVariants = ['RAW_ID', 'person_id', 'Photo_Url', 'AUTH_TOKEN', 'Auth-Token', 'Proto'];
      for (const variant of forbiddenVariants) {
        const docWithVariant = JSON.parse(JSON.stringify(validDoc));
        docWithVariant.state.shared[variant] = 'forbidden';
        expect(validatePosterDesignDocument(docWithVariant)).toBe(false);
      }
    });

    it('rejects state missing required bucket keys', () => {
      const validDoc = JSON.parse(serializePosterDesignDocument(createInitialPosterDesignState('classic-heritage')));

      const missingToken = JSON.parse(JSON.stringify(validDoc));
      delete missingToken.state.shared.selectedPosterRootToken;
      expect(validatePosterDesignDocument(missingToken)).toBe(false);

      const missingGenDepth = JSON.parse(JSON.stringify(validDoc));
      delete missingGenDepth.state.tiered.generationDepth;
      expect(validatePosterDesignDocument(missingGenDepth)).toBe(false);
    });
  });

  describe('5. Section Ownership & Isolation', () => {
    it('verifies content reset does NOT alter Cards settings', () => {
      let state = createInitialPosterDesignState('classic-heritage');

      state = updateSharedSetting(state, 'footerText', 'Custom Footer');
      state = updateSharedSetting(state, 'includePhotos', false);
      state = updateSharedSetting(state, 'photoShape', 'square');

      state = resetSection(state, 'content');

      expect(state.shared.footerText).toBe(''); // Content reset
      expect(state.shared.includePhotos).toBe(false); // Cards UNTOUCHED
      expect(state.shared.photoShape).toBe('square'); // Cards UNTOUCHED
    });

    it('verifies layout reset resets active layout bucket while preserving Appearance settings', () => {
      let state = createInitialPosterDesignState('classic-heritage');

      state = updateSharedSetting(state, 'direction', 'vertical');
      state = updateSharedSetting(state, 'fontFamily', 'noto-sans-arabic');
      state = updateSharedSetting(state, 'colorPalette', 'gallery-dark');
      state = updateTieredBucket(state, { generationDepth: 2 });

      state = resetSection(state, 'layout');

      expect(state.shared.direction).toBe('horizontal'); // Layout reset
      expect(state.tiered.generationDepth).toBe(4); // Active bucket reset
      expect(state.shared.fontFamily).toBe('noto-sans-arabic'); // Appearance UNTOUCHED
      expect(state.shared.colorPalette).toBe('gallery-dark'); // Appearance UNTOUCHED
    });

    it('verifies section isolation across all five sections', () => {
      let state = createInitialPosterDesignState('classic-heritage');

      state = updateSharedSetting(state, 'size', 'A0'); // Print
      state = updateSharedSetting(state, 'fontFamily', 'noto-sans-arabic'); // Appearance
      state = updateSharedSetting(state, 'cardCorner', 'square'); // Cards
      state = updateSharedSetting(state, 'footerText', 'Test'); // Content
      state = updateSharedSetting(state, 'direction', 'vertical'); // Layout

      state = resetSection(state, 'print');
      expect(state.shared.size).toBe('A3');
      expect(state.shared.fontFamily).toBe('noto-sans-arabic');
      expect(state.shared.cardCorner).toBe('square');
      expect(state.shared.footerText).toBe('Test');
      expect(state.shared.direction).toBe('vertical');
    });

    it('verifies preset applying and modified state detection', () => {
      let state = createInitialPosterDesignState('classic-heritage');
      expect(isPresetModified(state)).toBe(false);

      state = updateSharedSetting(state, 'photoShape', 'square');
      expect(isPresetModified(state)).toBe(true);

      state = applyPreset(state, 'classic-heritage');
      expect(state.shared.photoShape).toBe('circle');
      expect(isPresetModified(state)).toBe(false);
    });

    it('verifies bucket value preservation during layout mode switching', () => {
      let state = createInitialPosterDesignState('classic-heritage');

      state = updateTieredBucket(state, { generationDepth: 3 });
      state = switchLayoutMode(state, 'focus-family');
      state = updateFocusBucket(state, { ancestorDepth: 3, includeSpouses: false });
      state = switchLayoutMode(state, 'radial-generations');
      state = updateRadialBucket(state, { generationRings: 6 });

      state = switchLayoutMode(state, 'tiered');
      expect(state.tiered.generationDepth).toBe(3);
      expect(state.focus.ancestorDepth).toBe(3);
      expect(state.radial.generationRings).toBe(6);
    });

    it('verifies poster reset functionality', () => {
      let state = createInitialPosterDesignState('classic-heritage');
      state = updateSharedSetting(state, 'size', 'A0');
      state = resetPoster(state, 'modern-gallery');
      expect(state.activePresetId).toBe('modern-gallery');
      expect(state.shared.size).toBe('A3');
    });
  });

  describe('6. Stateless Script Regex & Repeated Validation Test', () => {
    it('validates the same script payload repeatedly (5 times) and verifies every attempt is rejected', () => {
      const state = createInitialPosterDesignState('classic-heritage');

      for (let i = 1; i <= 5; i++) {
        const unsafeState = updateSharedSetting(state, 'footerText', '<script>alert("xss")</script>');
        expect(() => serializePosterDesignDocument(unsafeState)).toThrow(/Unsafe script/);
        expect(validateStateSafety(unsafeState).safe).toBe(false);
      }
    });
  });

  describe('7. Tightened Session Person Tokens', () => {
    it('accepts whitelisted canonical tokens preview-root-* and session-token-*', () => {
      expect(isWhitelistedSessionToken('preview-root-1')).toBe(true);
      expect(isWhitelistedSessionToken('preview-root-abc_123')).toBe(true);
      expect(isWhitelistedSessionToken('session-token-xyz-789')).toBe(true);
    });

    it('rejects tokens containing embedded UUIDs, person_* IDs, URLs, or arbitrary suffixes', () => {
      expect(isWhitelistedSessionToken('preview-root-550e8400-e29b-41d4-a716-446655440000')).toBe(false);
      expect(isWhitelistedSessionToken('session-token-person_12345')).toBe(false);
      expect(isWhitelistedSessionToken('custom-user-token')).toBe(false);
      expect(isWhitelistedSessionToken('https://example.com/root')).toBe(false);
      expect(isWhitelistedSessionToken('person_12345')).toBe(false);
      expect(isWhitelistedSessionToken('550e8400-e29b-41d4-a716-446655440000')).toBe(false);
    });
  });

  describe('8. History & Preset Determinism', () => {
    it('clears redo stack upon new action after undo', () => {
      const history = new PosterHistoryManager();
      let state = history.getPresentState();

      state = updateSharedSetting(state, 'size', 'A2');
      history.pushState(state);

      state = updateSharedSetting(state, 'size', 'A1');
      history.pushState(state);

      history.undo();
      expect(history.getPresentState().shared.size).toBe('A2');
      expect(history.canRedo()).toBe(true);

      state = updateSharedSetting(history.getPresentState(), 'size', 'A0');
      history.pushState(state);

      expect(history.canRedo()).toBe(false);
      expect(history.getPresentState().shared.size).toBe('A0');
    });

    it('maintains 20-snapshot boundary limit across undo/redo operations', () => {
      const history = new PosterHistoryManager();
      let state = history.getPresentState();

      for (let i = 1; i <= 25; i++) {
        state = updateSharedSetting(state, 'footerText', `Footer ${i}`);
        history.pushState(state);
      }

      expect(history.getPastCount()).toBe(20);

      for (let i = 0; i < 5; i++) {
        history.undo();
      }

      expect(history.getPastCount()).toBe(15);
      expect(history.getFutureCount()).toBe(5);
    });
  });
});
