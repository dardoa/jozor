import type {
  ManuscriptControlledPdfAdapter,
  ManuscriptPdfExportRequest,
  ManuscriptPdfExportResult,
} from './ManuscriptPdfExportService';
import { ControlledPdfFeatureFlag } from './ControlledPdfFeatureFlag';
import { ControlledPdfApiClient } from './ControlledPdfApiClient';

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
    const sanitizedMetadata = sanitizeDiagnosticsMetadata(request.metadata);

    if (!flagState.enabled) {
      return {
        mode: 'controlled-pdf',
        available: false,
        fallbackRecommended: true,
        reason: 'Controlled PDF feature flag disabled',
        requestMetadata: sanitizedMetadata,
      };
    }

    try {
      const blob = await ControlledPdfApiClient.renderManuscriptPdf(request);
      return {
        mode: 'controlled-pdf',
        available: true,
        blob,
        fileName: `${sanitizeFileName(request.title)}_manuscript.pdf`,
        requestMetadata: sanitizedMetadata,
      };
    } catch (error) {
      return {
        mode: 'controlled-pdf',
        available: false,
        fallbackRecommended: true,
        reason: error instanceof Error ? error.message : 'Controlled PDF renderer unavailable',
        requestMetadata: sanitizedMetadata,
      };
    }
  };
}

const SAFE_DIAGNOSTIC_METADATA_KEYS = new Set([
  'templateId',
  'userRole',
  'masked',
  'scopePersonCount',
  'pageEstimate',
]);

export function sanitizeDiagnosticsMetadata(
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

function sanitizeFileName(title: string): string {
  const normalized = title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9\u0600-\u06ff_-]+/gi, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  return normalized || 'family_manuscript';
}
