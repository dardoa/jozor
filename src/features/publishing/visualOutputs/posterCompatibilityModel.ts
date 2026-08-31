import type {
  PosterProductMode,
  PosterLayoutMode,
  PosterTreeScope,
  PosterPaperSize,
} from './posterStateContracts';

export type CapabilityReachabilityStatus =
  | 'runtime-supported-and-reachable'
  | 'implemented-but-not-Studio-reachable'
  | 'registry-advertised'
  | 'quality-gated'
  | 'planned'
  | 'incompatible';

export interface PosterCombinationCapability {
  readonly status: CapabilityReachabilityStatus;
  readonly isRuntimeSupported: boolean;
  readonly isPlanned: boolean;
  readonly requiresQualityGate: boolean;
  readonly description: {
    readonly en: string;
    readonly ar: string;
  };
}

export interface ApplicableControlSections {
  readonly quickSetup: boolean;
  readonly content: boolean;
  readonly layout: boolean;
  readonly cards: boolean;
  readonly appearance: boolean;
  readonly print: boolean;
  readonly showFocalPersonControls: boolean;
  readonly showRadialGeometryControls: boolean;
  readonly showTiledWallControls: boolean;
  readonly showBranchCollectionControls: boolean;
}

/**
 * Assesses the reachability and support status of a product / layout / scope combination
 * against the explicit Phase 0A capability matrix.
 */
export function getPosterLayoutCombinationCapability(
  productMode: PosterProductMode,
  layoutMode: PosterLayoutMode,
  scope: PosterTreeScope
): PosterCombinationCapability {
  // 1. Detailed Poster Product Mode
  if (productMode === 'detailed-poster') {
    if (layoutMode === 'tiered') {
      if (scope === 'ancestors' || scope === 'descendants') {
        return {
          status: 'runtime-supported-and-reachable',
          isRuntimeSupported: true,
          isPlanned: false,
          requiresQualityGate: false,
          description: {
            en: 'Detailed tiered poster supported in production.',
            ar: 'بوستر تفصيلي متدرج مدعوم بالكامل.',
          },
        };
      }
      if (scope === 'full-tree') {
        return {
          status: 'quality-gated',
          isRuntimeSupported: true,
          isPlanned: false,
          requiresQualityGate: true,
          description: {
            en: 'Full tree detailed poster is quality-gated due to high node density on small paper.',
            ar: 'بوستر الشجرة الكاملة يتطلب فحص جودة الطباعة بسبب الكثافة العالية.',
          },
        };
      }
      if (scope === 'selected-branch') {
        return {
          status: 'runtime-supported-and-reachable',
          isRuntimeSupported: true,
          isPlanned: false,
          requiresQualityGate: false,
          description: {
            en: 'Selected branch poster is supported with descendants and in-branch spouses.',
            ar: 'بوستر الفرع المحدد مدعوم مع الذرية وأزواج أفراد الفرع.',
          },
        };
      }
    }

    if (layoutMode === 'focus-family') {
      if (scope === 'around-person') {
        return {
          status: 'runtime-supported-and-reachable',
          isRuntimeSupported: true,
          isPlanned: false,
          requiresQualityGate: false,
          description: {
            en: 'Focus family layout is supported in the Studio runtime.',
            ar: 'تخطيط العائلة حول شخص مدعوم بالكامل في الاستوديو.',
          },
        };
      }
      return {
        status: 'incompatible',
        isRuntimeSupported: false,
        isPlanned: false,
        requiresQualityGate: false,
        description: {
          en: 'Focus family layout is incompatible with non-focal tree scopes.',
          ar: 'تخطيط حول شخص غير متوافق مع النطاقات غير المحورية.',
        },
      };
    }

    if (layoutMode === 'radial-generations') {
      if (scope === 'ancestors' || scope === 'descendants') {
        return {
          status: 'runtime-supported-and-reachable',
          isRuntimeSupported: true,
          isPlanned: false,
          requiresQualityGate: false,
          description: {
            en: 'Radial generations layout is supported in the Studio runtime.',
            ar: 'التخطيط الشعاعي المروحي مدعوم في الاستوديو.',
          },
        };
      }
      if (scope === 'full-tree') {
        return {
          status: 'planned',
          isRuntimeSupported: false,
          isPlanned: true,
          requiresQualityGate: false,
          description: {
            en: 'Full-tree radial detailed posters are deferred until a complete-family radial model is designed and verified.',
            ar: 'بوستر الشجرة الكاملة الشعاعي مؤجل حتى تصميم نموذج شعاعي للعائلة الكاملة والتحقق منه.',
          },
        };
      }
      return {
        status: 'incompatible',
        isRuntimeSupported: false,
        isPlanned: false,
        requiresQualityGate: false,
        description: {
          en: 'Radial layout is incompatible with selected-branch scope.',
          ar: 'التخطيط الشعاعي غير متوافق مع نطاق الفرع المختار.',
        },
      };
    }
  }

  // 2. Full Tree Overview Product Mode
  if (productMode === 'full-tree-overview') {
    if (layoutMode === 'tiered') {
      if (scope === 'full-tree') {
        return {
          status: 'runtime-supported-and-reachable',
          isRuntimeSupported: true,
          isPlanned: false,
          requiresQualityGate: false,
          description: {
            en: 'Full-tree overview tiered layout supported in production.',
            ar: 'لوحة الشجرة الكاملة المتدرجة مدعومة بالكامل.',
          },
        };
      }
      return {
        status: 'incompatible',
        isRuntimeSupported: false,
        isPlanned: false,
        requiresQualityGate: false,
        description: {
          en: 'Full-tree overview product requires full-tree scope.',
          ar: 'منتج الشجرة الكاملة يتطلب نطاق الشجرة الكاملة.',
        },
      };
    }

    if (layoutMode === 'radial-generations') {
      if (scope === 'full-tree') {
        return {
          status: 'incompatible',
          isRuntimeSupported: false,
          isPlanned: false,
          requiresQualityGate: false,
          description: {
            en: 'The full-tree overview product uses its dedicated overview engine and is incompatible with radial layout.',
            ar: 'منتج عرض الشجرة الكاملة يستخدم محرك العرض المخصص له ولا يتوافق مع التخطيط الشعاعي.',
          },
        };
      }
      return {
        status: 'incompatible',
        isRuntimeSupported: false,
        isPlanned: false,
        requiresQualityGate: false,
        description: {
          en: 'Full-tree radial overview requires full-tree scope.',
          ar: 'منتج الشجرة الكاملة الشعاعي يتطلب نطاق الشجرة الكاملة.',
        },
      };
    }

    return {
      status: 'incompatible',
      isRuntimeSupported: false,
      isPlanned: false,
      requiresQualityGate: false,
      description: {
        en: 'Full-tree overview product is incompatible with focus family layout.',
        ar: 'منتج الشجرة الكاملة غير متوافق مع تخطيط حول شخص.',
      },
    };
  }

  // 3. Branch Collection Product Mode
  if (productMode === 'branch-collection') {
    if (layoutMode === 'tiered') {
      if (scope === 'full-tree') {
        return {
          status: 'runtime-supported-and-reachable',
          isRuntimeSupported: true,
          isPlanned: false,
          requiresQualityGate: false,
          description: {
            en: 'Branch collection full-tree assembly supported in production.',
            ar: 'منتج مجموعة الفروع للشجرة الكاملة مدعوم بالكامل.',
          },
        };
      }
      if (scope === 'selected-branch') {
        return {
          status: 'incompatible',
          isRuntimeSupported: false,
          isPlanned: false,
          requiresQualityGate: false,
          description: {
            en: 'A selected branch is exported as one detailed poster; wrapping it in a branch collection is redundant.',
            ar: 'يُصدّر الفرع المحدد كبوستر تفصيلي واحد؛ وضعه داخل مجموعة فروع تكرار غير ضروري.',
          },
        };
      }
      return {
        status: 'incompatible',
        isRuntimeSupported: false,
        isPlanned: false,
        requiresQualityGate: false,
        description: {
          en: 'Branch collection requires full-tree assembly scope.',
          ar: 'منتج مجموعة الفروع يتطلب نطاق الشجرة الكاملة.',
        },
      };
    }

    return {
      status: 'incompatible',
      isRuntimeSupported: false,
      isPlanned: false,
      requiresQualityGate: false,
      description: {
        en: 'Branch collection is incompatible with focus or radial layout modes.',
        ar: 'منتج مجموعة الفروع غير متوافق مع التخطيط الشعاعي أو حول شخص.',
      },
    };
  }

  // 4. Tiled Wall Product Mode
  if (productMode === 'tiled-wall') {
    if (layoutMode === 'tiered') {
      if (scope === 'full-tree') {
        // Aligned with Phase 0A quality-gated classification
        return {
          status: 'quality-gated',
          isRuntimeSupported: true,
          isPlanned: false,
          requiresQualityGate: true,
          description: {
            en: 'Tiled wall poster grid is quality-gated due to tile geometry and node density.',
            ar: 'اللوحة الجدارية المقسمة تتطلب فحص جودة تقسيم الأوراق.',
          },
        };
      }
      if (scope === 'selected-branch') {
        return {
          status: 'planned',
          isRuntimeSupported: false,
          isPlanned: true,
          requiresQualityGate: false,
          description: {
            en: 'Selected branch scope is planned for tiled wall.',
            ar: 'نطاق الفرع المختار مخطط للوحة المقسمة.',
          },
        };
      }
      return {
        status: 'incompatible',
        isRuntimeSupported: false,
        isPlanned: false,
        requiresQualityGate: false,
        description: {
          en: 'Tiled wall requires full-tree scope.',
          ar: 'اللوحة المقسمة تتطلب نطاق الشجرة الكاملة.',
        },
      };
    }

    if (layoutMode === 'radial-generations' && scope === 'full-tree') {
      return {
        status: 'planned',
        isRuntimeSupported: false,
        isPlanned: true,
        requiresQualityGate: false,
        description: {
          en: 'Radial tiled wall output is deferred until radial full-tree composition and tile seam evidence exist.',
          ar: 'اللوحة الشعاعية المقسمة مؤجلة حتى يتوفر تكوين شعاعي للشجرة الكاملة وأدلة سلامة حدود الأوراق.',
        },
      };
    }

    return {
      status: 'incompatible',
      isRuntimeSupported: false,
      isPlanned: false,
      requiresQualityGate: false,
      description: {
        en: 'Tiled wall is incompatible with the selected combination.',
        ar: 'اللوحة المقسمة غير متوافقة مع هذه التركيبة.',
      },
    };
  }

  return {
    status: 'incompatible',
    isRuntimeSupported: false,
    isPlanned: false,
    requiresQualityGate: false,
    description: {
      en: 'Incompatible product mode, layout mode, and scope combination.',
      ar: 'تركيبة غير متوافقة.',
    },
  };
}

/**
 * Checks whether a product/layout/scope combination requires dedicated tile geometry evaluation.
 * Does not duplicate or predict final blocked/pass verdicts; authoritative blocking decision
 * belongs to PrintQualityReport generated by tiledWallPoster.ts from real scene geometry.
 */
export function requiresDedicatedTileQualityEvaluation(
  productMode: PosterProductMode,
  layoutMode: PosterLayoutMode,
  scope: PosterTreeScope
): boolean {
  return productMode === 'tiled-wall' && layoutMode === 'tiered' && scope === 'full-tree';
}

/**
 * Evaluates print quality gate requirement flags for single-sheet products.
 * Tiled Wall and Branch Collection do not use single-sheet node count heuristics here.
 */
export function requiresPrintQualityGate(
  productMode: PosterProductMode,
  layoutMode: PosterLayoutMode,
  scope: PosterTreeScope,
  paperSize: PosterPaperSize,
  estimatedItemCount: number
): boolean {
  const capability = getPosterLayoutCombinationCapability(productMode, layoutMode, scope);
  if (capability.status !== 'runtime-supported-and-reachable' && capability.status !== 'quality-gated') {
    return false;
  }

  if (productMode === 'branch-collection') {
    return false;
  }

  if (productMode === 'tiled-wall') {
    // Tiled Wall relies on requiresDedicatedTileQualityEvaluation() and tiledWallPoster.ts PrintQualityReport
    return false;
  }

  if (productMode === 'full-tree-overview') {
    return paperSize === 'A4' || paperSize === 'A3';
  }

  if (productMode === 'detailed-poster') {
    if (scope === 'full-tree' && (paperSize === 'A4' || paperSize === 'A3')) {
      return true;
    }
    if (estimatedItemCount > 100 && (paperSize === 'A4' || paperSize === 'A3')) {
      return true;
    }
  }

  return false;
}

/**
 * Returns which UI control sections and contextual controls apply to the active state.
 */
export function getApplicableControlSections(
  productMode: PosterProductMode,
  layoutMode: PosterLayoutMode,
  scope: PosterTreeScope
): ApplicableControlSections {
  return {
    quickSetup: true,
    content: true,
    layout: true,
    cards: true,
    appearance: true,
    print: true,
    showFocalPersonControls: layoutMode === 'focus-family',
    showRadialGeometryControls: layoutMode === 'radial-generations',
    showTiledWallControls: productMode === 'tiled-wall' || scope === 'full-tree',
    showBranchCollectionControls: productMode === 'branch-collection',
  };
}
