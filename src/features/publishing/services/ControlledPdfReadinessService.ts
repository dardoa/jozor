import { LocalControlledPdfRenderer } from './LocalControlledPdfRenderer';
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
    const activeRenderer = options.renderer ?? LocalControlledPdfRenderer.renderPdf;
    const reasons: string[] = [];
    const diagnostics: Record<string, unknown> = {
      renderer: 'local-controlled',
      probe: true,
    };

    const flagState = ControlledPdfFeatureFlag.getState();
    diagnostics.featureFlagEnabled = flagState.enabled;

    if (!flagState.enabled) {
      reasons.push('Controlled PDF feature flag disabled');
    }

    try {
      // Execute with a small synthetic probe request completely free of raw personal data
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

        // Perform practical verification of the PDF output
        if (result.blob.type !== 'application/pdf') {
          reasons.push(`Invalid output MIME type: expected application/pdf but got ${result.blob.type}`);
        }
        if (result.blob.size === 0) {
          reasons.push('Output PDF blob is empty (size is 0 bytes)');
        }
      } else {
        reasons.push(result.reason ?? 'Renderer returned unavailable status.');
      }
    } catch (error) {
      reasons.push(error instanceof Error ? error.message : 'Readiness probe crashed during render execution.');
    }

    // Explicitly enforce fallback mode if the flag is disabled
    const recommendedMode = flagState.enabled && reasons.length === 0
      ? 'controlled-pdf'
      : 'browser-print-fallback';

    return {
      available: flagState.enabled && reasons.length === 0,
      recommendedMode,
      reasons,
      diagnostics,
    };
  }
}
