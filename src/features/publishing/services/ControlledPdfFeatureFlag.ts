export interface ControlledPdfFeatureFlagState {
  readonly enabled: boolean;
  readonly reason: string;
}

let testOverride: boolean | null = null;

export class ControlledPdfFeatureFlag {
  public static getState(): ControlledPdfFeatureFlagState {
    if (testOverride !== null) {
      return {
        enabled: testOverride,
        reason: testOverride
          ? 'Controlled PDF feature flag enabled'
          : 'Controlled PDF feature flag disabled',
      };
    }

    let envEnabled = false;

    try {
      // Check Vite environment metadata safely without crash fallbacks
      if (typeof import.meta !== 'undefined' && import.meta.env) {
        envEnabled = import.meta.env.VITE_ENABLE_CONTROLLED_PDF === 'true';
      }
    } catch {
      // Return disabled state if environment checks throw or are unavailable
    }

    if (envEnabled) {
      return {
        enabled: true,
        reason: 'Controlled PDF is enabled via configuration.',
      };
    }

    return {
      enabled: false,
      reason: 'Controlled PDF is disabled by default.',
    };
  }

  public static setTestOverrideForTests(value: boolean | null): void {
    if (value !== null && !isTestMode()) return;
    testOverride = value;
  }
}

function isTestMode(): boolean {
  try {
    return typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test';
  } catch {
    return false;
  }
}
