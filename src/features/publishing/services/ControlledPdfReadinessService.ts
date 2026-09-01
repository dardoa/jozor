import { ControlledManuscriptPdfAdapter } from './ControlledManuscriptPdfAdapter';
import { ControlledPdfApiClient } from './ControlledPdfApiClient';
import type { ManuscriptPdfExportRequest, ManuscriptPdfExportResult } from './ManuscriptPdfExportService';
import { ControlledPdfFeatureFlag } from './ControlledPdfFeatureFlag';

export interface ControlledPdfReadinessResult {
  readonly available: boolean;
  readonly recommendedMode: 'controlled-pdf' | 'browser-print-fallback';
  readonly reasons: string[];
  readonly diagnostics: Readonly<Record<string, unknown>>;
}

export interface ControlledPdfReadinessOptions {
  readonly renderer?: (request: ManuscriptPdfExportRequest) => Promise<ManuscriptPdfExportResult>;
}

export class ControlledPdfReadinessService {
  public static async evaluateReadiness(
    options: ControlledPdfReadinessOptions = {}
  ): Promise<ControlledPdfReadinessResult> {
    const activeRenderer = options.renderer ?? ControlledManuscriptPdfAdapter.exportPdf;
    const reasons: string[] = [];
    const diagnostics: Record<string, unknown> = {
      renderer: 'controlled-api',
      probe: options.renderer ? 'synthetic-render' : 'configuration',
    };

    const flagState = ControlledPdfFeatureFlag.getState();
    diagnostics.featureFlagEnabled = flagState.enabled;

    if (!flagState.enabled) {
      reasons.push('Controlled PDF feature flag disabled');
      return {
        available: false,
        recommendedMode: 'browser-print-fallback',
        reasons,
        diagnostics,
      };
    }

    try {
      if (!options.renderer) {
        await ControlledPdfApiClient.checkReadiness();
        diagnostics.availableResult = true;
      } else {
        // Injected renderers still receive a synthetic payload for deterministic contract tests.
        const result = await activeRenderer({
          html: '<html><body>Readiness Probe</body></html>',
          title: 'Controlled PDF Readiness Probe',
          language: 'en',
          metadata: {
            templateId: 'readiness-test-template',
            scopePersonCount: 1,
          },
        });

        diagnostics.mode = result.mode;
        diagnostics.availableResult = result.available;

        if (result.available && result.blob) {
          diagnostics.outputType = result.blob.type;
          diagnostics.outputSize = result.blob.size;

          if (result.blob.type !== 'application/pdf') {
            reasons.push(`Invalid output MIME type: expected application/pdf but got ${result.blob.type}`);
          }
          if (result.blob.size === 0) {
            reasons.push('Output PDF blob is empty (size is 0 bytes)');
          }
        } else {
          reasons.push(result.reason ?? 'Renderer returned unavailable status.');
        }
      }
    } catch (error) {
      reasons.push(error instanceof Error ? error.message : 'Readiness probe crashed during render execution.');
    }

    // Explicitly enforce fallback mode if the flag is disabled
    const recommendedMode = reasons.length === 0
      ? 'controlled-pdf'
      : 'browser-print-fallback';

    return {
      available: reasons.length === 0,
      recommendedMode,
      reasons,
      diagnostics,
    };
  }
}
