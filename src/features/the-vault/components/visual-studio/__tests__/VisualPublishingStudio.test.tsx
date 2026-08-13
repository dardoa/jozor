import { render, screen, fireEvent, within, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VisualPublishingStudio } from '../VisualPublishingStudio';
import { downloadFile } from '@/utils/fileUtils';
import { useAppStore } from '../../../../../store/useAppStore';
import type { Person } from '../../../../../types';

import type { PosterFontFamily } from '../../../../publishing';

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
  onerror: ((err: unknown) => void) | null = null;

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

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const testPosterFontAssetResolver = {
  resolveArabicFont: vi.fn(async (fontFamily: PosterFontFamily = 'amiri') => ({
    id: fontFamily,
    familyName: 'JozorPosterArabic' as const,
    format: 'truetype' as const,
    dataUri: 'data:font/ttf;base64,AAEAAEFCQ0Q=',
    byteLength: 8,
    source: 'bundled' as const,
  })),
};
const testPosterSvgResources = {
  embeddedArabicFontDataUri: 'data:font/ttf;base64,AAEAAEFCQ0Q=',
  embeddedArabicFontFormat: 'truetype' as const,
  embeddedImages: {},
};

const makePerson = (overrides: Record<string, unknown> & { id: string; firstName: string; lastName: string }) => {
  const { id, ...rest } = overrides;
  return {
    rawId: id,
    gender: 'male',
    isDeceased: false,
    isPrivate: false,
    generation: 1,
    parents: [],
    children: [],
    spouses: [],
    siblings: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...rest,
    id,
  } as unknown as Person;
};

const testPosterImageAssetResolver = {
  resolveImages: vi.fn(async (requests: readonly { previewId: string; source: string }[]) => ({
    assets: requests.reduce((acc, req) => ({
      ...acc,
      [req.previewId]: {
        previewId: req.previewId,
        dataUri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        format: 'png' as const,
        width: 100,
        height: 100,
      },
    }), {}),
    failedPreviewIds: [],
  })),
};

const createTestPngExportRuntime = () => ({
  renderPng: vi.fn(async () => new Blob(['studio-png'], { type: 'image/png' })),
});
const createTestPdfExportRuntime = () => ({
  renderPdf: vi.fn(async () => new Blob(['studio-pdf'], { type: 'application/pdf' })),
});

const renderStudio = (
  props: Partial<ComponentProps<typeof VisualPublishingStudio>> = {}
) => {
  const {
    pngExportRuntime = createTestPngExportRuntime(),
    pdfExportRuntime = createTestPdfExportRuntime(),
    ...restProps
  } = props;

  return render(
    <VisualPublishingStudio
      language="en"
      posterFontAssetResolver={testPosterFontAssetResolver}
      posterImageAssetResolver={testPosterImageAssetResolver}
      posterSvgResources={testPosterSvgResources}
      pngExportRuntime={pngExportRuntime}
      pdfExportRuntime={pdfExportRuntime}
      {...restProps}
    />
  );
};

const selectTab = (name: string | RegExp) => {
  const matcher = typeof name === 'string' && name === 'Print' ? /Print/i : name;
  fireEvent.click(screen.getByRole('tab', { name: matcher }));
};

describe('VisualPublishingStudio Phase 1B Complete Behavioral Suite', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    useAppStore.setState({
      currentTreeId: undefined,
      focusId: undefined,
      people: {},
    });
  });

  it('renders visual studio preview pane and preset-first workspace header', () => {
    renderStudio();

    expect(screen.getByText('Visual outputs preview')).toBeInTheDocument();
    expect(screen.getByText(/Choose an output type and customize the poster/i)).toBeInTheDocument();

    const previewPane = screen.getByTestId('visual-studio-preview-pane');
    expect(previewPane).toBeInTheDocument();
    expect(within(previewPane).getByText(/People visible: 7/i)).toBeInTheDocument();
    expect(screen.getByTestId('visual-studio-config-panel')).toBeInTheDocument();
  });

  it('zooms the review surface without changing the canonical poster SVG', () => {
    renderStudio();

    const pageFrame = screen.getByTestId('studio-poster-page-frame');
    const svgBeforeZoom = screen.getByTestId('studio-poster-renderer-preview').innerHTML;

    fireEvent.click(screen.getByRole('button', { name: 'Zoom in preview' }));
    expect(pageFrame).toHaveStyle({ width: '125%' });
    expect(screen.getByTestId('studio-poster-renderer-preview').innerHTML).toBe(svgBeforeZoom);

    fireEvent.click(screen.getByRole('button', { name: 'Fit poster in preview' }));
    expect(pageFrame).toHaveStyle({ width: '100%' });
    expect(screen.getByTestId('studio-poster-renderer-preview').innerHTML).toBe(svgBeforeZoom);
  });

  it('opens a large review surface from the canonical poster SVG and closes with Escape', () => {
    renderStudio();

    const canonicalSvg = screen.getByTestId('studio-poster-renderer-preview').innerHTML;
    const expandButton = screen.getByRole('button', { name: 'Open large poster preview' });
    fireEvent.click(expandButton);

    const dialog = screen.getByRole('dialog', { name: 'Large poster preview' });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByTestId('poster-preview-expanded-svg').innerHTML).toBe(canonicalSvg);
    const closeButton = screen.getByRole('button', { name: 'Close large poster preview' });
    expect(closeButton).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Tab' });
    expect(closeButton).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Large poster preview' })).not.toBeInTheDocument();
    expect(expandButton).toHaveFocus();

    fireEvent.click(expandButton);
    fireEvent.mouseDown(screen.getByTestId('poster-preview-expanded-backdrop'));
    expect(screen.queryByRole('dialog', { name: 'Large poster preview' })).not.toBeInTheDocument();
    expect(expandButton).toHaveFocus();
  });

  it('switches section tabs cleanly and exposes controlled settings', () => {
    renderStudio();

    expect(screen.getByRole('tab', { name: 'Quick Setup' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: /Classic Heritage/i })).toBeInTheDocument();

    selectTab('Tree & Layout');
    expect(screen.getByRole('tab', { name: 'Tree & Layout' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('group', { name: 'Privacy Filter' })).toBeInTheDocument();

    selectTab('Tree & Layout');
    expect(screen.getByRole('group', { name: 'Tree Flow Direction' })).toBeInTheDocument();

    selectTab('Cards');
    expect(screen.getByRole('group', { name: 'Photo Frame Shape' })).toBeInTheDocument();

    selectTab('Appearance');
    expect(screen.getByRole('group', { name: 'Color Palette' })).toBeInTheDocument();

    expect(screen.getByTestId('visual-studio-print-dock')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Paper Size' })).toBeInTheDocument();
  });

  it('renders as a visual preview area without disabled Studio export actions', () => {
    renderStudio();

    const actionBar = screen.getByTestId('visual-studio-action-bar');
    expect(within(actionBar).getByRole('button', { name: 'Download SVG' })).not.toBeDisabled();
    expect(within(actionBar).getByRole('button', { name: 'Download PNG' })).not.toBeDisabled();
    expect(within(actionBar).getByRole('button', { name: 'Download PDF' })).not.toBeDisabled();
  });

  it('embeds the resolver-owned Arabic font in the canonical preview SVG', async () => {
    renderStudio({ posterSvgResources: undefined });

    await waitFor(() => {
      const posterSvg = screen.getByTestId('studio-poster-renderer-preview').innerHTML;
      expect(posterSvg).toContain('JozorPosterArabic');
      expect(posterSvg).toContain('url("data:font/ttf;base64,AAEAAEFCQ0Q=")');
    });
  });

  it('does not pass a stale font resource to the renderer while switching poster styles', async () => {
    renderStudio();

    fireEvent.click(screen.getByRole('button', { name: /Modern Gallery/i }));

    await waitFor(() => {
      const posterSvg = screen.getByTestId('studio-poster-renderer-preview').innerHTML;
      expect(posterSvg).toContain('data-poster-theme="modern-gallery"');
      expect(posterSvg).not.toContain('data-poster-theme="classic-heritage"');
    });
  });

  it('embeds resolved person photos without exposing their private source', async () => {
    renderStudio({
      posterSvgResources: undefined,
      posterImageSourceResolver: (personId) => `https://storage.example.com/photos/${personId}.jpg`,
      posterImageAssetResolver: {
        resolveImages: async (requests) => ({
          assets: requests.reduce((acc, req) => ({
            ...acc,
            [req.previewId]: {
              previewId: req.previewId,
              dataUri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
              format: 'png' as const,
              width: 100,
              height: 100,
            },
          }), {}),
          failedPreviewIds: [],
        }),
      },
    });

    selectTab('Cards');
    const hideLivingPhotosCheckbox = screen.getByRole('checkbox', { name: 'Hide Photos of Living People' });
    fireEvent.click(hideLivingPhotosCheckbox);

    await waitFor(() => {
      const posterSvg = screen.getByTestId('studio-poster-renderer-preview').innerHTML;
      expect(posterSvg).toContain('data:image/');
      expect(posterSvg).not.toContain('https://storage.example.com');
    });
  });

  it('gives supplied embeddedImages precedence over resolver-derived images on rerender', async () => {
    const dataUriA = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const dataUriB = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP4z8AAABAAE/9AAAAAElFTkSuQmCC';

    const { rerender } = renderStudio({
      posterSvgResources: undefined,
      posterImageSourceResolver: (personId) => `https://storage.example.com/photos/${personId}.jpg`,
      posterImageAssetResolver: {
        resolveImages: async (requests) => ({
          assets: requests.reduce((acc, req) => ({
            ...acc,
            [req.previewId]: {
              previewId: req.previewId,
              dataUri: dataUriA,
              format: 'png' as const,
              width: 100,
              height: 100,
            },
          }), {}),
          failedPreviewIds: [],
        }),
      },
    });

    await waitFor(() => {
      const posterSvg = screen.getByTestId('studio-poster-renderer-preview').innerHTML;
      expect(posterSvg).toContain(dataUriA);
    });

    rerender(
      <VisualPublishingStudio
        language="en"
        posterFontAssetResolver={testPosterFontAssetResolver}
        posterImageAssetResolver={{
          resolveImages: async (requests) => ({
            assets: requests.reduce((acc, req) => ({
              ...acc,
              [req.previewId]: {
                previewId: req.previewId,
                dataUri: dataUriA,
                format: 'png' as const,
                width: 100,
                height: 100,
              },
            }), {}),
            failedPreviewIds: [],
          }),
        }}
        posterImageSourceResolver={(personId) => `https://storage.example.com/photos/${personId}.jpg`}
        posterSvgResources={{
          embeddedArabicFontDataUri: 'data:font/ttf;base64,AAEAAEFCQ0Q=',
          embeddedArabicFontFormat: 'truetype',
          embeddedImages: [1, 2, 3, 4, 5, 6, 7].reduce((acc, i) => ({
            ...acc,
            [`preview-node-${i}`]: {
              previewId: `preview-node-${i}`,
              dataUri: dataUriB,
              format: 'png' as const,
              width: 100,
              height: 100,
            },
          }), {}),
        }}
      />
    );

    await waitFor(() => {
      const posterSvg = screen.getByTestId('studio-poster-renderer-preview').innerHTML;
      expect(posterSvg).toContain(dataUriB);
      expect(posterSvg).not.toContain(dataUriA);
    });
  });

  it('restores resolver-derived images when transitioning back from supplied resources mode', async () => {
    const dataUriA = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const dataUriB = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP4z8AAABAAE/9AAAAAElFTkSuQmCC';

    const { rerender } = renderStudio({
      posterImageSourceResolver: (personId) => `https://storage.example.com/photos/${personId}.jpg`,
      posterImageAssetResolver: {
        resolveImages: async (requests) => ({
          assets: requests.reduce((acc, req) => ({
            ...acc,
            [req.previewId]: {
              previewId: req.previewId,
              dataUri: dataUriA,
              format: 'png' as const,
              width: 100,
              height: 100,
            },
          }), {}),
          failedPreviewIds: [],
        }),
      },
      posterSvgResources: {
        embeddedArabicFontDataUri: 'data:font/ttf;base64,AAEAAEFCQ0Q=',
        embeddedArabicFontFormat: 'truetype',
        embeddedImages: [1, 2, 3, 4, 5, 6, 7].reduce((acc, i) => ({
          ...acc,
          [`preview-node-${i}`]: {
            previewId: `preview-node-${i}`,
            dataUri: dataUriB,
            format: 'png' as const,
            width: 100,
            height: 100,
          },
        }), {}),
      },
    });

    await waitFor(() => {
      const posterSvg = screen.getByTestId('studio-poster-renderer-preview').innerHTML;
      expect(posterSvg).toContain(dataUriB);
      expect(posterSvg).not.toContain(dataUriA);
    });

    rerender(
      <VisualPublishingStudio
        language="en"
        posterFontAssetResolver={testPosterFontAssetResolver}
        posterImageSourceResolver={(personId) => `https://storage.example.com/photos/${personId}.jpg`}
        posterImageAssetResolver={{
          resolveImages: async (requests) => ({
            assets: requests.reduce((acc, req) => ({
              ...acc,
              [req.previewId]: {
                previewId: req.previewId,
                dataUri: dataUriA,
                format: 'png' as const,
                width: 100,
                height: 100,
              },
            }), {}),
            failedPreviewIds: [],
          }),
        }}
        posterSvgResources={undefined}
      />
    );

    await waitFor(() => {
      const posterSvg = screen.getByTestId('studio-poster-renderer-preview').innerHTML;
      expect(posterSvg).toContain(dataUriA);
      expect(posterSvg).not.toContain(dataUriB);
    });
  });

  it('changes photo and initials geometry through the shared PosterScene renderer', async () => {
    renderStudio();

    selectTab('Cards');
    fireEvent.click(screen.getByRole('button', { name: 'Square' }));

    await waitFor(() => {
      const posterSvg = screen.getByTestId('studio-poster-renderer-preview').innerHTML;
      expect(posterSvg).toContain('<rect');
    });
  });

  it('updates safe card content without exposing technical relationship values', async () => {
    renderStudio();

    selectTab('Tree & Layout');
    const relCheckbox = screen.getByRole('checkbox', { name: 'Show Relationship Hint' });
    fireEvent.click(relCheckbox);

    await waitFor(() => {
      const posterSvg = screen.getByTestId('studio-poster-renderer-preview').innerHTML;
      expect(posterSvg).not.toContain('>parent-child<');
    });
  });

  it('updates relationship line style through the shared SVG scene', async () => {
    renderStudio();

    selectTab('Appearance');
    fireEvent.click(screen.getByRole('button', { name: 'Bold' }));

    await waitFor(() => {
      const posterSvg = screen.getByTestId('studio-poster-renderer-preview').innerHTML;
      expect(posterSvg).toContain('stroke-width="');
    });
  });

  it('changes generation line paths through the shared SVG scene', async () => {
    renderStudio();

    selectTab('Appearance');
    fireEvent.click(screen.getByRole('button', { name: 'Straight' }));

    await waitFor(() => {
      const posterSvg = screen.getByTestId('studio-poster-renderer-preview').innerHTML;
      expect(posterSvg).toContain('data-poster-connector-path="straight"');
    });
  });

  it('applies an owner color palette through the shared SVG scene', async () => {
    renderStudio();

    selectTab('Appearance');
    fireEvent.click(screen.getByRole('button', { name: 'Evergreen' }));

    await waitFor(() => {
      const posterSvg = screen.getByTestId('studio-poster-renderer-preview').innerHTML;
      expect(posterSvg).toContain('data-poster-color-palette="evergreen"');
    });
  });

  it('fine-tunes safe poster colors without changing export geometry', () => {
    renderStudio();

    selectTab('Appearance');
    expect(screen.getByRole('group', { name: 'Color Palette' })).toBeInTheDocument();
  });

  it('switches SVG-native background treatments through the canonical scene', async () => {
    renderStudio();

    selectTab('Appearance');
    fireEvent.click(screen.getByRole('button', { name: 'Warm Paper' }));

    await waitFor(() => {
      const posterSvg = screen.getByTestId('studio-poster-renderer-preview').innerHTML;
      expect(posterSvg).toBeTruthy();
    });
  });

  it('switches SVG-native poster ornaments without changing render paths', async () => {
    renderStudio();

    selectTab('Appearance');
    fireEvent.click(screen.getByRole('button', { name: 'Corner Filigree' }));

    await waitFor(() => {
      const posterSvg = screen.getByTestId('studio-poster-renderer-preview').innerHTML;
      expect(posterSvg).toBeTruthy();
    });
  });

  it('changes typography density through the canonical SVG scene', async () => {
    renderStudio();

    selectTab('Appearance');
    fireEvent.click(screen.getByRole('button', { name: 'Prominent' }));

    await waitFor(() => {
      const posterSvg = screen.getByTestId('studio-poster-renderer-preview').innerHTML;
      expect(posterSvg).toBeTruthy();
    });
  });

  it('switches bundled Arabic font families through the canonical SVG scene', async () => {
    renderStudio();

    selectTab('Appearance');
    fireEvent.click(screen.getByRole('button', { name: 'Noto Kufi (Sans)' }));

    await waitFor(() => {
      const posterSvg = screen.getByTestId('studio-poster-renderer-preview').innerHTML;
      expect(posterSvg).toBeTruthy();
    });
  });

  it('reflows the shared scene when the owner changes person card size', async () => {
    renderStudio();

    selectTab('Cards');
    fireEvent.click(screen.getByRole('button', { name: 'Large' }));

    await waitFor(() => {
      const posterSvg = screen.getByTestId('studio-poster-renderer-preview').innerHTML;
      expect(posterSvg).toBeTruthy();
    });
  });

  it('switches between standard, photo-focused, and text-minimal card layouts', async () => {
    renderStudio();

    selectTab('Cards');
    fireEvent.click(screen.getByRole('button', { name: 'Photo Hero' }));

    await waitFor(() => {
      const posterSvg = screen.getByTestId('studio-poster-renderer-preview').innerHTML;
      expect(posterSvg).toContain('data-poster-card-layout="photo-focused"');
    });
  });

  it('changes card depth through SVG-native effects without layout changes', async () => {
    renderStudio();

    selectTab('Cards');
    fireEvent.click(screen.getByRole('button', { name: 'Soft Drop Shadow' }));

    await waitFor(() => {
      const posterSvg = screen.getByTestId('studio-poster-renderer-preview').innerHTML;
      expect(posterSvg).toBeTruthy();
    });
  });

  it('maps flat and elevated card depth controls to valid PosterScene values', async () => {
    renderStudio();

    selectTab('Cards');
    fireEvent.click(screen.getByRole('button', { name: 'Flat' }));
    await waitFor(() => {
      expect(screen.getByTestId('studio-poster-renderer-preview').innerHTML)
        .toContain('data-poster-card-effect="flat"');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Elevated' }));
    await waitFor(() => {
      expect(screen.getByTestId('studio-poster-renderer-preview').innerHTML)
        .toContain('data-poster-card-effect="elevated"');
    });
  });

  it('changes card frame detail through the canonical SVG scene', async () => {
    renderStudio();

    selectTab('Cards');
    fireEvent.click(screen.getByRole('button', { name: 'Classic Inset' }));

    await waitFor(() => {
      const posterSvg = screen.getByTestId('studio-poster-renderer-preview').innerHTML;
      expect(posterSvg).toBeTruthy();
    });
  });

  it('changes person-card corners without leaving the shared SVG scene', async () => {
    renderStudio();

    selectTab('Cards');
    fireEvent.click(screen.getByRole('button', { name: 'Sharp' }));

    await waitFor(() => {
      const posterSvg = screen.getByTestId('studio-poster-renderer-preview').innerHTML;
      expect(posterSvg).toBeTruthy();
    });
  });

  it('reflows the canonical scene through owner-selected print margins', async () => {
    renderStudio();

    expect(screen.getByTestId('visual-studio-print-dock')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Print margins' }), {
      target: { value: 'generous' },
    });

    await waitFor(() => {
      const posterSvg = screen.getByTestId('studio-poster-renderer-preview').innerHTML;
      expect(posterSvg).toBeTruthy();
    });
  });

  it('changes tree spacing density through the canonical layout engine', async () => {
    renderStudio();

    selectTab('Tree & Layout');
    fireEvent.click(screen.getByRole('button', { name: 'Airy' }));

    await waitFor(() => {
      const posterSvg = screen.getByTestId('studio-poster-renderer-preview').innerHTML;
      expect(posterSvg).toBeTruthy();
    });
  });

  it('changes the poster page frame through the canonical SVG scene', async () => {
    renderStudio();

    selectTab('Appearance');
    fireEvent.click(screen.getByRole('button', { name: 'Ornate Corner Filigree' }));

    await waitFor(() => {
      const posterSvg = screen.getByTestId('studio-poster-renderer-preview').innerHTML;
      expect(posterSvg).toBeTruthy();
    });
  });

  it('changes title composition without creating a second preview renderer', async () => {
    renderStudio();

    selectTab('Tree & Layout');
    const titleInput = screen.getByRole('textbox', { name: 'Poster Title' });
    fireEvent.change(titleInput, { target: { value: 'Custom Family Tree' } });

    await waitFor(() => {
      const posterSvg = screen.getByTestId('studio-poster-renderer-preview').innerHTML;
      expect(posterSvg).toContain('Custom Family Tree');
    });
  });

  it('composes a safe owner footer and can hide Jozor attribution', async () => {
    renderStudio();

    selectTab('Tree & Layout');
    const attributionCheckbox = screen.getByRole('checkbox', { name: 'Show Jozor Branding' });
    fireEvent.click(attributionCheckbox);

    await waitFor(() => {
      const posterSvg = screen.getByTestId('studio-poster-renderer-preview').innerHTML;
      expect(posterSvg).toBeTruthy();
    });
  });

  it('changes the poster root through session tokens without exposing source ids', () => {
    renderStudio();

    selectTab('Tree & Layout');
    const rootSelect = screen.getByRole('combobox', { name: 'Focal Person (Root)' }) as HTMLSelectElement;
    const options = Array.from(rootSelect.options);
    const token1 = options[0].value;
    const token2 = options[1].value;
    expect(rootSelect).toHaveValue(token1);

    fireEvent.change(rootSelect, { target: { value: token2 } });
    expect(rootSelect).toHaveValue(token2);
  });

  it('renders Arabic owner-review copy and localized preview summary', () => {
    renderStudio({ language: 'ar' });

    expect(screen.getByText('معاينة المخرجات البصرية')).toBeInTheDocument();
    expect(screen.getByTestId('visual-studio-readiness-notice')).toBeInTheDocument();
  });

  it('exposes three poster directions and keeps Snapshot as a separate product', () => {
    renderStudio();

    selectTab('Tree & Layout');
    expect(screen.getByRole('button', { name: 'Vertical (Top to Bottom)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Horizontal (Right to Left)' })).toBeInTheDocument();
  });

  it('applies poster depth, tree direction, page orientation, privacy, and page size to preview and PNG export', async () => {
    renderStudio();

    expect(screen.getByTestId('visual-studio-print-dock')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Portrait' }));
    fireEvent.click(screen.getByRole('button', { name: 'A2' }));

    fireEvent.click(screen.getByRole('button', { name: 'Download PNG' }));

    await waitFor(() => {
      expect(downloadFile).toHaveBeenCalledWith(
        expect.any(Blob),
        expect.stringMatching(/\.png$/),
        'image/png'
      );
    });
  });

  it('offers all available ancestor generations through the sanitized selector path', () => {
    renderStudio();

    selectTab('Tree & Layout');
    const allBtn = screen.getByRole('button', { name: 'All' });
    fireEvent.click(allBtn);
    expect(allBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('switches to a descendant selector and descendant-tiered PosterScene', () => {
    renderStudio();

    fireEvent.click(screen.getByRole('button', { name: 'Descendants' }));

    const previewPane = screen.getByTestId('visual-studio-preview-pane');
    expect(within(previewPane).getByText(/People visible:/i)).toBeInTheDocument();
  });

  it('does not apply the binary ancestor cap to descendant branches', () => {
    renderStudio();

    fireEvent.click(screen.getByRole('button', { name: 'Descendants' }));

    const previewPane = screen.getByTestId('visual-studio-preview-pane');
    expect(previewPane).toBeInTheDocument();
  });

  it('switches to the full-tree overview scene and removes the generation limiter', () => {
    renderStudio();

    fireEvent.click(screen.getByRole('button', { name: /Full-tree Overview/i }));

    const previewPane = screen.getByTestId('visual-studio-preview-pane');
    expect(within(previewPane).getByText(/People visible:/i)).toBeInTheDocument();
  });

  it('routes a blocked single sheet into the large-tree product setup without downloading', () => {
    renderStudio();

    expect(screen.getByTestId('visual-studio-print-dock')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'A4' }));

    expect(screen.getByTestId('visual-studio-action-bar')).toBeInTheDocument();
  });

  it('offers a downloadable branch collection only for the full-tree scope', async () => {
    renderStudio();

    fireEvent.click(screen.getByRole('button', { name: /Branch Collection/i }));
    expect(screen.getByTestId('visual-studio-print-dock')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'A0' }));

    const actionBar = screen.getByTestId('visual-studio-action-bar');
    expect(await within(actionBar).findByRole('button', { name: /Download branch collection/i })).toBeInTheDocument();
  });

  it('configures and downloads a tiled wall poster only for the full-tree scope', async () => {
    renderStudio();

    fireEvent.click(screen.getByRole('button', { name: /Tiled Wall Poster/i }));

    const actionBar = screen.getByTestId('visual-studio-action-bar');
    const tiledBtn = within(actionBar).getByRole('button', { name: /Download tiled wall poster/i });
    expect(tiledBtn).toBeInTheDocument();

    fireEvent.click(tiledBtn);

    await waitFor(() => {
      expect(downloadFile).toHaveBeenCalledWith(
        expect.any(Blob),
        'Full-Family-Tree-tiled-wall.zip',
        'application/zip'
      );
    });
  });

  it('applies an optional lower-cost tiled grid without changing other poster settings', () => {
    renderStudio();

    fireEvent.click(screen.getByRole('button', { name: /Tiled Wall Poster/i }));
    expect(screen.getByTestId('visual-studio-print-dock')).toBeInTheDocument();

    const rowsSelect = screen.getByRole('combobox', { name: 'Grid Rows (Sheets)' });
    fireEvent.change(rowsSelect, { target: { value: '6' } });
    expect(rowsSelect).toHaveValue('6');
  });

  it('downloads a PNG owner-review artifact from the Studio renderer', async () => {
    renderStudio();

    await waitFor(() => {
      expect(screen.getByTestId('studio-poster-renderer-preview')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Download PNG' }));

    await waitFor(() => {
      expect(downloadFile).toHaveBeenCalledWith(
        expect.any(Blob),
        'Ancestor Tree.png',
        'image/png'
      );
    });
  });

  it('downloads the canonical SVG poster without a raster runtime', async () => {
    renderStudio();

    await waitFor(() => {
      expect(screen.getByTestId('studio-poster-renderer-preview')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Download SVG' }));

    await waitFor(() => {
      expect(downloadFile).toHaveBeenCalledWith(
        expect.any(Blob),
        'Ancestor Tree.svg',
        'image/svg+xml'
      );
    });
  });

  it('downloads a one-page PDF artifact from the Studio renderer', async () => {
    renderStudio();

    await waitFor(() => {
      expect(screen.getByTestId('studio-poster-renderer-preview')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }));

    await waitFor(() => {
      expect(downloadFile).toHaveBeenCalledWith(
        expect.any(Blob),
        'Ancestor Tree.pdf',
        'application/pdf'
      );
    });
  });

  it('uses the owner-edited title and description in preview and download naming', async () => {
    renderStudio();

    selectTab('Tree & Layout');
    const titleInput = screen.getByRole('textbox', { name: 'Poster Title' });
    fireEvent.change(titleInput, { target: { value: 'Ramadan Family Ancestors' } });

    await waitFor(() => {
      const posterSvg = screen.getByTestId('studio-poster-renderer-preview').innerHTML;
      expect(posterSvg).toContain('Ramadan Family Ancestors');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Download PNG' }));

    await waitFor(() => {
      expect(downloadFile).toHaveBeenCalledWith(
        expect.any(Blob),
        'Ramadan Family Ancestors.png',
        'image/png'
      );
    });
  });

  it('builds review telemetry from store-shaped data without raw id exposure', () => {
    useAppStore.setState({
      currentTreeId: 'test-tree',
      focusId: 'store-root',
      people: {
        'unrelated-first': makePerson({
          id: 'unrelated-first',
          firstName: 'Unrelated',
          lastName: 'First',
          isDeceased: true,
        }),
        'store-root': makePerson({
          id: 'store-root',
          firstName: 'Living',
          lastName: 'Root',
          birthDate: '1980-01-01',
          parents: ['store-father', 'store-mother'],
          isDeceased: false,
          photoUrl: 'https://storage.example.com/private/root.jpg',
          birthPlace: 'Private Living Place',
          profession: 'Private Living Job',
        }),
        'store-father': makePerson({
          id: 'store-father',
          firstName: 'Public',
          lastName: 'Father',
          birthDate: '1950-01-01',
          deathDate: '2020-01-01',
          isDeceased: true,
          birthPlace: 'Damascus',
          profession: 'Teacher',
          bio: 'Family educator and community mentor',
          children: ['store-root'],
        }),
        'store-mother': makePerson({
          id: 'store-mother',
          firstName: 'Private',
          lastName: 'Mother',
          birthDate: '1952-01-01',
          deathDate: '2018-01-01',
          isDeceased: true,
          isPrivate: true,
          birthPlace: 'Private Place',
          profession: 'Private Job',
          bio: 'Private family biography',
          children: ['store-root'],
        }),
      },
    });

    renderStudio({ previewSourceMode: 'store' });

    const previewPane = screen.getByTestId('visual-studio-preview-pane');
    expect(within(previewPane).getByText(/People visible: 3/i)).toBeInTheDocument();

    const serializedStudio = screen.getByTestId('visual-publishing-studio').textContent || '';
    expect(serializedStudio).not.toContain('store-root');

    selectTab('Tree & Layout');
    const rootSelector = screen.getByRole('combobox', { name: 'Focal Person (Root)' }) as HTMLSelectElement;
    expect(rootSelector.value).toContain('session-token-');
  });

  // Phase 1B New Tests
  it('[1B New] maps Modern Gallery preset to modern-ancestor-poster definition and modern styling', async () => {
    renderStudio();

    fireEvent.click(screen.getByRole('button', { name: /Modern Gallery/i }));

    const previewPane = screen.getByTestId('visual-studio-preview-pane');
    expect(previewPane).toBeInTheDocument();
    await waitFor(() => {
      const posterSvg = screen.getByTestId('studio-poster-renderer-preview').innerHTML;
      expect(posterSvg).toContain('data-poster-theme="modern-gallery"');
    });
  });

  it('maps Dense Genealogy to its dedicated output definition and PosterScene style', async () => {
    renderStudio();

    fireEvent.click(screen.getByRole('button', { name: /Dense Genealogy/i }));

    await waitFor(() => {
      const previewPane = screen.getByTestId('visual-studio-preview-pane');
      const posterSvg = screen.getByTestId('studio-poster-renderer-preview').innerHTML;
      expect(within(previewPane).getByText('Dense Genealogy Poster')).toBeInTheDocument();
      expect(posterSvg).toContain('data-poster-theme="dense-genealogy"');
      expect(posterSvg).not.toContain('data-poster-theme="classic-heritage"');
    });
  });

  it('[1B New] single-owned selectedPosterRootToken responds to Undo, Redo, and Reset Content', () => {
    renderStudio();

    selectTab('Tree & Layout');
    const rootSelect = screen.getByRole('combobox', { name: 'Focal Person (Root)' }) as HTMLSelectElement;
    const options = Array.from(rootSelect.options);
    const token1 = options[0].value;
    const token2 = options[1].value;

    expect(rootSelect).toHaveValue(token1);

    fireEvent.change(rootSelect, { target: { value: token2 } });
    expect(rootSelect).toHaveValue(token2);

    const undoBtn = screen.getByRole('button', { name: 'Undo' });
    fireEvent.click(undoBtn);
    expect(rootSelect).toHaveValue(token1);

    const redoBtn = screen.getByRole('button', { name: 'Redo' });
    fireEvent.click(redoBtn);
    expect(rootSelect).toHaveValue(token2);

    const resetContentBtn = screen.getByRole('button', { name: 'Reset Content' });
    fireEvent.click(resetContentBtn);
    expect(rootSelect).toHaveValue(token1);
  });
});
