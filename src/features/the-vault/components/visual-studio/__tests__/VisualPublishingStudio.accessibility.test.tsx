import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { getVisualOutputDefinition, createInitialPosterDesignState } from '../../../../publishing';
import { VisualPublishingStudio } from '../VisualPublishingStudio';
import { VisualOutputActionBar } from '../VisualOutputActionBar';
import { VisualOutputConfigPanel } from '../VisualOutputConfigPanel';
import { VisualOutputDiagramSelector } from '../VisualOutputDiagramSelector';

const posterCanvasContext = {
  drawImage: vi.fn(),
  fillRect: vi.fn(),
  fillStyle: '',
};

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  configurable: true,
  value: vi.fn(() => posterCanvasContext),
});
Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
  configurable: true,
  value: vi.fn((callback: BlobCallback) => callback(new Blob(['studio-png'], { type: 'image/png' }))),
});
Object.defineProperty(URL, 'createObjectURL', {
  configurable: true,
  value: vi.fn(() => 'blob:poster-svg'),
});
Object.defineProperty(URL, 'revokeObjectURL', {
  configurable: true,
  value: vi.fn(),
});

class MockPosterImage {
  decoding = 'sync';
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  set src(_value: string) {
    this.onload?.();
  }
}

vi.stubGlobal('Image', MockPosterImage);

vi.mock('jspdf', () => ({
  jsPDF: class MockJsPdf {
    addImage() {}
    output() {
      return new Blob(['studio-pdf'], { type: 'application/pdf' });
    }
  },
}));

vi.mock('@/utils/fileUtils', () => ({
  downloadFile: vi.fn(),
}));

const classicDefinition = getVisualOutputDefinition('classic-ancestor-poster')!;

describe('VisualPublishingStudio Accessibility & Interaction Suite', () => {
  vi.setConfig({ testTimeout: 15000 });

  beforeEach(() => {
    cleanup();
  });

  it('renders a live status region for export state announcements and transitions correctly', () => {
    const { rerender } = render(
      <VisualOutputActionBar
        language="ar"
        exportingFormat={undefined}
        selectedDefinition={classicDefinition}
      />
    );

    const liveRegion = screen.getByTestId('visual-studio-export-status-live-region');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    expect(liveRegion).toHaveAttribute('role', 'status');
    expect(liveRegion).toHaveTextContent('الاستوديو جاهز للتصدير');

    rerender(
      <VisualOutputActionBar
        language="ar"
        exportingFormat="svg"
        selectedDefinition={classicDefinition}
      />
    );
    expect(liveRegion).toHaveTextContent('جاري تصدير svg...');

    rerender(
      <VisualOutputActionBar
        language="ar"
        exportingFormat={undefined}
        selectedDefinition={classicDefinition}
      />
    );
    expect(liveRegion).toHaveTextContent('الاستوديو جاهز للتصدير');
  });

  it('provides explicit accessible names in Arabic and English for all download buttons', () => {
    const { rerender } = render(
      <VisualOutputActionBar
        language="ar"
        onExportSvg={vi.fn()}
        onExportPng={vi.fn()}
        onExportPdf={vi.fn()}
        selectedDefinition={classicDefinition}
      />
    );

    expect(screen.getByRole('button', { name: 'تنزيل SVG' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'تنزيل PNG' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'تنزيل PDF' })).toBeInTheDocument();

    rerender(
      <VisualOutputActionBar
        language="en"
        onExportSvg={vi.fn()}
        onExportPng={vi.fn()}
        onExportPdf={vi.fn()}
        selectedDefinition={classicDefinition}
      />
    );

    expect(screen.getByRole('button', { name: 'Download SVG' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download PNG' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download PDF' })).toBeInTheDocument();
  });

  it('links format guidance to export buttons via aria-describedby', () => {
    render(
      <VisualOutputActionBar
        language="ar"
        onExportSvg={vi.fn()}
        selectedDefinition={classicDefinition}
      />
    );

    const svgButton = screen.getByRole('button', { name: 'تنزيل SVG' });
    expect(svgButton).toHaveAttribute('aria-describedby', 'poster-format-guidance');
  });

  it('declares toggle, segmented button, and checkbox states using aria-pressed and checked', () => {
    const state = createInitialPosterDesignState('classic-heritage');
    render(
      <>
        <VisualOutputDiagramSelector
          language="ar"
          state={state}
          onSelectDiagramType={vi.fn()}
          onSwitchProductMode={vi.fn()}
          onSwitchScope={vi.fn()}
          onUpdateRadial={vi.fn()}
        />
        <VisualOutputConfigPanel
          language="ar"
          selectedDefinitionId="classic-ancestor-poster"
          selectedDefinition={classicDefinition}
          definitions={[classicDefinition]}
          state={state}
          posterRootOptions={[{ token: 'father', label: 'محمد بن علي' }]}
          selectedPosterRootToken="father"
        />
      </>
    );

    const ancestorsBtn = screen.getByRole('button', { name: 'الأسلاف' });
    const descendantsBtn = screen.getByRole('button', { name: 'الأحفاد' });

    expect(ancestorsBtn).toHaveAttribute('aria-pressed', 'true');
    expect(descendantsBtn).toHaveAttribute('aria-pressed', 'false');

    const cardsTab = screen.getByRole('tab', { name: 'البطاقات' });
    fireEvent.click(cardsTab);

    const yearsCheckbox = screen.getByRole('checkbox', { name: 'عرض سنوات الميلاد والوفاة' });
    const birthPlaceCheckbox = screen.getByRole('checkbox', { name: 'عرض مكان الميلاد' });

    expect(yearsCheckbox).toBeChecked();
    expect(birthPlaceCheckbox).not.toBeChecked();
  });

  it('renders semantic group containers with explicit accessible names', () => {
    render(
      <VisualPublishingStudio
        language="ar"
        previewSourceMode="fixture"
        posterFontAssetResolver={{ resolveArabicFont: async () => ({ id: 'amiri', familyName: 'JozorPosterArabic', format: 'truetype', dataUri: 'data:font/ttf;base64,AAEAAEFCQ0Q=', byteLength: 8, source: 'bundled' }) }}
        posterImageAssetResolver={{ resolveImages: async () => ({ assets: {}, failedPreviewIds: [] }) }}
        posterSvgResources={{
          embeddedArabicFontDataUri: 'data:font/ttf;base64,AAEAAEFCQ0Q=',
          embeddedArabicFontFormat: 'truetype',
          embeddedImages: {},
        }}
      />
    );

    const diagramGroup = screen.getByRole('group', { name: /كيف تريد عرض عائلتك/i });
    expect(diagramGroup).toBeInTheDocument();

    const scopeGroup = screen.getByTestId('poster-scope-group');
    expect(scopeGroup).toHaveAttribute('role', 'group');
    expect(scopeGroup).toHaveAccessibleName(/نطاق الشجرة/i);

    const actionGroup = screen.getByTestId('visual-studio-action-group');
    expect(actionGroup).toHaveAttribute('role', 'group');
    expect(actionGroup).toHaveAccessibleName(/إجراءات التنزيل والتصدير/i);
  });

  it('disables all export buttons during an active export to prevent double activation', () => {
    render(
      <VisualOutputActionBar
        language="ar"
        exportingFormat="svg"
        onExportSvg={vi.fn()}
        onExportPng={vi.fn()}
        onExportPdf={vi.fn()}
        selectedDefinition={classicDefinition}
      />
    );

    expect(screen.getByRole('button', { name: 'تنزيل SVG' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'تنزيل PNG' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'تنزيل PDF' })).toBeDisabled();
  });
});
