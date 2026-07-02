import type {
  ManuscriptControlledPdfAdapter,
  ManuscriptPdfExportRequest,
  ManuscriptPdfExportResult,
} from './ManuscriptPdfExportService';
import { ControlledPdfFeatureFlag } from './ControlledPdfFeatureFlag';

export interface ControlledManuscriptPdfAdapterStatus {
  readonly available: boolean;
  readonly reason?: string;
}

export class ControlledManuscriptPdfAdapter {
  public static getStatus(): ControlledManuscriptPdfAdapterStatus {
    const flagState = ControlledPdfFeatureFlag.getState();
    if (!flagState.enabled) {
      return {
        available: false,
        reason: 'Controlled PDF feature flag disabled',
      };
    }

    return {
      available: false,
      reason: 'Controlled PDF export is not configured yet.',
    };
  }

  public static readonly exportPdf: ManuscriptControlledPdfAdapter = async (
    request: ManuscriptPdfExportRequest
  ): Promise<ManuscriptPdfExportResult> => {
    const flagState = ControlledPdfFeatureFlag.getState();
    if (!flagState.enabled) {
      return {
        mode: 'controlled-pdf',
        available: false,
        fallbackRecommended: true,
        reason: 'Controlled PDF feature flag disabled',
        requestMetadata: sanitizeDiagnosticsMetadata(request.metadata),
      };
    }

    return {
      mode: 'controlled-pdf',
      available: false,
      fallbackRecommended: true,
      reason: 'Controlled PDF export is not configured yet.',
      requestMetadata: sanitizeDiagnosticsMetadata(request.metadata),
    };
  };
}

const SAFE_DIAGNOSTIC_METADATA_KEYS = new Set([
  'templateId',
  'treeId',
  'rootPersonId',
  'userRole',
  'masked',
  'scopePersonCount',
  'pageEstimate',
  'generatedAt',
]);

function sanitizeDiagnosticsMetadata(
  metadata: Readonly<Record<string, unknown>> | undefined
): Readonly<Record<string, unknown>> {
  if (!metadata) return {};

  return Object.fromEntries(
    Object.entries(metadata).filter(([key, value]) => (
      SAFE_DIAGNOSTIC_METADATA_KEYS.has(key) && isSafeDiagnosticValue(value)
    ))
  );
}

function isSafeDiagnosticValue(value: unknown): boolean {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null
  );
}
