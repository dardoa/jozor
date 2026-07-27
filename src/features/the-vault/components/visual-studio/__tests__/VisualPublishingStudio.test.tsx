import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VisualPublishingStudio } from '../VisualPublishingStudio';
import { useAppStore } from '../../../../../store/useAppStore';
import { downloadFile } from '../../../../../utils/fileUtils';
import type { Person } from '../../../../../types';

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
    queueMicrotask(() => this.onload?.());
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

vi.mock('../../../../../utils/fileUtils', () => ({
  downloadFile: vi.fn(),
}));

vi.mock('../../../../../utils/showToast', () => ({
  showToast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const AR_PREVIEW_TITLE = '\u0645\u0639\u0627\u064a\u0646\u0629 \u0627\u0644\u0645\u062e\u0631\u062c\u0627\u062a \u0627\u0644\u0628\u0635\u0631\u064a\u0629';
const AR_CHOOSE_OUTPUT = '\u0627\u062e\u062a\u0631 \u0646\u0648\u0639 \u0627\u0644\u0645\u062e\u0631\u062c';
const AR_PEOPLE_VISIBLE = '\u0627\u0644\u0623\u0634\u062e\u0627\u0635 \u0627\u0644\u0638\u0627\u0647\u0631\u0648\u0646';
const AR_RELATIONSHIPS_VISIBLE = '\u0627\u0644\u0639\u0644\u0627\u0642\u0627\u062a \u0627\u0644\u0638\u0627\u0647\u0631\u0629';

const testPosterFontAssetResolver = {
  resolveArabicFont: vi.fn(async () => ({
    id: 'amiri' as const,
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
};

const renderStudio = (
  props: Partial<ComponentProps<typeof VisualPublishingStudio>> = {}
) => render(
  <VisualPublishingStudio
    language="en"
    {...props}
    posterFontAssetResolver={testPosterFontAssetResolver}
    posterSvgResources={testPosterSvgResources}
  />
);

const makePerson = (overrides: Partial<Person> & Pick<Person, 'id' | 'firstName' | 'lastName'>): Person => {
  const base: Person = {
    id: overrides.id,
    title: '',
    firstName: overrides.firstName,
    middleName: '',
    lastName: overrides.lastName,
    birthName: '',
    nickName: '',
    suffix: '',
    gender: 'male',
    birthDate: '',
    birthPlace: '',
    birthSource: '',
    deathDate: '',
    deathPlace: '',
    deathSource: '',
    burialPlace: '',
    residence: '',
    isDeceased: false,
    profession: '',
    company: '',
    interests: '',
    bio: '',
    gallery: [],
    voiceNotes: [],
    sources: [],
    events: [],
    email: '',
    website: '',
    blog: '',
    address: '',
    parents: [],
    spouses: [],
    children: [],
  };

  return { ...base, ...overrides };
};

describe('VisualPublishingStudio aligned review area', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders as a visual preview area without disabled Studio export actions', () => {
    renderStudio();

    expect(screen.getByText('Visual outputs preview')).toBeInTheDocument();
    expect(screen.getByText(/Choose an output type and customize the poster/i)).toBeInTheDocument();
    expect(screen.getByText(/download poster SVG, PNG, and PDF files from the Studio/i)).toBeInTheDocument();

    const previewPane = screen.getByTestId('visual-studio-preview-pane');
    expect(within(previewPane).getByRole('heading', { level: 5, name: 'Classic Ancestor Poster' })).toBeInTheDocument();
    expect(
      within(previewPane).getByText('Warm print-first family poster for ancestor, descendant, or complete-tree layouts with owner-controlled photos.')
    ).toBeInTheDocument();

    const previewFrame = screen.getByTestId('visual-preview-frame');
    expect(previewFrame).toHaveAttribute('aria-label', 'Preview of Classic Ancestor Poster');
    const posterSvgPreview = screen.getByTestId('studio-poster-renderer-preview');
    expect(posterSvgPreview).toHaveAttribute('data-poster-renderer', 'svg-v1');
    expect(posterSvgPreview.innerHTML).toContain('data-poster-renderer="svg-v1"');
    expect(posterSvgPreview.innerHTML).toContain('<svg');
    expect(posterSvgPreview.innerHTML).not.toContain('<script');
    expect(within(previewPane).getByText(/People visible: 7/i)).toBeInTheDocument();
    expect(within(previewPane).getByText(/Relationships visible: 6/i)).toBeInTheDocument();
    expect(within(previewPane).queryByText(/Preview simplified/i)).not.toBeInTheDocument();

    expect(screen.getByTestId('visual-studio-config-panel')).toBeInTheDocument();
    expect(screen.getByText('Choose output type')).toBeInTheDocument();
    expect(screen.getByTestId('visual-studio-poster-settings')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Poster root' })).toHaveValue('preview-root-1');
    expect(screen.getByRole('textbox', { name: 'Poster title' })).toHaveValue('Ancestor Tree');
    expect(screen.getByRole('textbox', { name: 'Short description' })).toHaveValue('4 generations from the family record');
    expect(screen.getByRole('combobox', { name: 'Page size' })).toHaveValue('A3');
    expect(screen.getByRole('checkbox', { name: 'Hide living and private people' })).toBeChecked();
    expect(within(screen.getByTestId('poster-depth-control')).getByRole('button', { name: '1' })).toBeEnabled();
    expect(within(screen.getByTestId('poster-depth-control')).getByRole('button', { name: 'All' })).toBeEnabled();
    expect(within(screen.getByTestId('poster-scope-control')).getByRole('button', { name: 'Ancestors' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(screen.getByTestId('poster-scope-control')).getByRole('button', { name: 'Descendants' })).toBeEnabled();
    expect(within(screen.getByTestId('poster-direction-control')).getByRole('button', { name: 'Horizontal' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(screen.getByTestId('poster-orientation-control')).getByRole('button', { name: 'Landscape' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('checkbox', { name: 'Show person photos' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Hide photos of living people' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Show birth and death years' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Show relationship to the tree' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Show birth place' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Show occupation' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Show short descriptive line' })).not.toBeChecked();
    expect(screen.getByRole('textbox', { name: 'Footer phrase' })).toHaveValue('');
    expect(screen.getByRole('checkbox', { name: /Created in Jozor/i })).toBeChecked();
    expect(within(screen.getByTestId('poster-photo-shape-control')).getByRole('button', { name: 'Circular' }))
      .toHaveAttribute('aria-pressed', 'true');
    expect(within(screen.getByTestId('poster-connector-style-controls')).getByRole('button', { name: 'Classic' }))
      .toHaveAttribute('aria-pressed', 'true');
    expect(within(screen.getByTestId('poster-connector-path-controls')).getByRole('button', { name: 'Style default' }))
      .toHaveAttribute('aria-pressed', 'true');
    expect(within(screen.getByTestId('poster-color-palette-controls')).getByRole('button', { name: 'Style default' }))
      .toHaveAttribute('aria-pressed', 'true');
    expect(within(screen.getByTestId('poster-decoration-controls')).getByRole('button', { name: 'Style default' }))
      .toHaveAttribute('aria-pressed', 'true');
    expect(within(screen.getByTestId('poster-typography-controls')).getByRole('button', { name: 'Balanced' }))
      .toHaveAttribute('aria-pressed', 'true');
    expect(within(screen.getByTestId('poster-card-scale-controls')).getByRole('button', { name: 'Standard' }))
      .toHaveAttribute('aria-pressed', 'true');
    expect(within(screen.getByTestId('poster-card-effect-controls')).getByRole('button', { name: 'Style default' }))
      .toHaveAttribute('aria-pressed', 'true');
    expect(within(screen.getByTestId('poster-card-frame-controls')).getByRole('button', { name: 'Style default' }))
      .toHaveAttribute('aria-pressed', 'true');
    expect(within(screen.getByTestId('poster-page-frame-controls')).getByRole('button', { name: 'Style default' }))
      .toHaveAttribute('aria-pressed', 'true');
    expect(within(screen.getByTestId('poster-header-controls')).getByRole('button', { name: 'Style default' }))
      .toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('studio-poster-renderer-preview').innerHTML)
      .toContain('data-poster-color-palette="heritage-warm"');
    expect(screen.getByTestId('studio-poster-renderer-preview').innerHTML)
      .toContain('data-poster-header="ceremonial"');
    expect(screen.getByTestId('studio-poster-renderer-preview').innerHTML)
      .toContain('data-poster-decoration="paper-grain"');

    expect(screen.queryByTestId('visual-studio-telemetry-panel')).not.toBeInTheDocument();
    expect(screen.queryByText('Review Summary')).not.toBeInTheDocument();

    expect(screen.queryByText('Visual Publishing Studio')).not.toBeInTheDocument();
    expect(screen.queryByText('Studio shell preview. Current exports remain available below.')).not.toBeInTheDocument();
    expect(screen.queryByText('Preview Mode')).not.toBeInTheDocument();
    expect(screen.queryByText('Privacy Level')).not.toBeInTheDocument();
    expect(screen.queryByText('Product Type')).not.toBeInTheDocument();
    expect(screen.queryByText('Template ID')).not.toBeInTheDocument();
    expect(screen.queryByText('Layout Engine')).not.toBeInTheDocument();
    expect(screen.queryByText('sanitized-data')).not.toBeInTheDocument();
    expect(screen.queryByText('masked')).not.toBeInTheDocument();
    expect(screen.getByTestId('visual-studio-action-bar')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Studio Preview/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download PNG/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Download PDF/i })).toBeEnabled();
  }, 15_000);

  it('embeds the resolver-owned Arabic font in the canonical preview SVG', async () => {
    render(
      <VisualPublishingStudio
        language="ar"
        posterFontAssetResolver={testPosterFontAssetResolver}
      />
    );

    await waitFor(() => {
      const svg = screen.getByTestId('studio-poster-renderer-preview').innerHTML;
      expect(svg).toContain('@font-face');
      expect(svg).toContain('data:font/ttf;base64,AAEAAEFCQ0Q=');
      expect(svg).not.toContain('/fonts/Amiri-Regular.ttf');
      expect(svg).not.toMatch(/(?:href|src)=['"]https?:|url\(['"]?https?:/);
    });
    expect(testPosterFontAssetResolver.resolveArabicFont).toHaveBeenCalledTimes(1);
  });

  it('does not pass a stale font resource to the renderer while switching poster styles', async () => {
    const familyAwareResolver = {
      resolveArabicFont: vi.fn(async (fontFamily: 'amiri' | 'noto-sans-arabic' | 'noto-kufi-arabic' = 'amiri') => {
        const encodedFixture = fontFamily === 'amiri'
          ? 'QU1JUkk='
          : fontFamily === 'noto-sans-arabic'
            ? 'Tk9UTw=='
            : 'S1VGSQ==';
        return {
          id: fontFamily,
          familyName: 'JozorPosterArabic' as const,
          format: 'truetype' as const,
          dataUri: `data:font/ttf;base64,${encodedFixture}`,
          byteLength: 8,
          source: 'bundled' as const,
        };
      }),
    };

    render(
      <VisualPublishingStudio
        language="ar"
        posterFontAssetResolver={familyAwareResolver}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('studio-poster-renderer-preview').innerHTML)
        .toContain('data-poster-font-family="amiri"');
    });

    const selectors = screen.getByTestId('visual-studio-template-selectors');
    expect(() => {
      fireEvent.click(within(selectors).getByRole('button', { name: 'لوحة العائلة العصرية' }));
    }).not.toThrow();

    await waitFor(() => {
      const svg = screen.getByTestId('studio-poster-renderer-preview').innerHTML;
      expect(svg).toContain('data-poster-font-family="noto-sans-arabic"');
      expect(svg).toContain('data:font/ttf;base64,Tk9UTw==');
    });
    expect(familyAwareResolver.resolveArabicFont).toHaveBeenCalledWith('amiri');
    expect(familyAwareResolver.resolveArabicFont).toHaveBeenCalledWith('noto-sans-arabic');
  });

  it('embeds resolved person photos without exposing their private source', async () => {
    const privateSource = 'https://storage.example.com/private/father.jpg?token=secret';
    const posterImageAssetResolver = {
      resolveImages: vi.fn(async (requests: readonly { previewId: string; source: string }[]) => ({
        assets: Object.fromEntries(requests.map((request) => [request.previewId, {
          previewId: request.previewId,
          mimeType: 'image/jpeg' as const,
          dataUri: 'data:image/jpeg;base64,/9j/AA==',
          byteLength: 4,
        }])),
        failedPreviewIds: [],
      })),
    };

    renderStudio({
      posterImageAssetResolver,
      posterImageSourceResolver: (personId) => personId === 'fixture-father' ? privateSource : undefined,
    });

    await waitFor(() => {
      const svg = screen.getByTestId('studio-poster-renderer-preview').innerHTML;
      expect(svg).toContain('data-preview-photo="preview-node-2"');
      expect(svg).toContain('data:image/jpeg;base64,/9j/AA==');
      expect(svg).not.toContain('storage.example.com');
      expect(svg).not.toContain('token=secret');
      expect(svg).not.toContain('fixture-father');
    });
    expect(posterImageAssetResolver.resolveImages).toHaveBeenCalledWith([
      { previewId: 'preview-node-2', source: privateSource },
    ]);

    fireEvent.click(screen.getByRole('checkbox', { name: 'Show person photos' }));
    await waitFor(() => {
      expect(screen.getByTestId('studio-poster-renderer-preview').innerHTML).not.toContain('data-preview-photo');
    });
  });

  it('changes photo and initials geometry through the shared PosterScene renderer', () => {
    renderStudio();

    const shapeControl = screen.getByTestId('poster-photo-shape-control');
    fireEvent.click(within(shapeControl).getByRole('button', { name: 'Square' }));
    let svg = screen.getByTestId('studio-poster-renderer-preview').innerHTML;
    expect(svg).toContain('data-poster-photo-shape="square"');
    expect(svg).toContain('<rect class="poster-avatar"');
    expect(within(shapeControl).getByRole('button', { name: 'Square' }))
      .toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(within(shapeControl).getByRole('button', { name: 'Soft corners' }));
    svg = screen.getByTestId('studio-poster-renderer-preview').innerHTML;
    expect(svg).toContain('data-poster-photo-shape="rounded"');
    expect(svg).toMatch(/poster-avatar"[^>]+rx="[1-9][\d.]*"/);
  });

  it('updates safe card content without exposing technical relationship values', () => {
    renderStudio();

    const preview = screen.getByTestId('studio-poster-renderer-preview');
    expect(preview.innerHTML).toContain('class="poster-years"');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Show birth and death years' }));
    expect(preview.innerHTML).not.toContain('class="poster-years"');

    fireEvent.click(screen.getByRole('checkbox', { name: 'Show relationship to the tree' }));
    expect(preview.innerHTML).toContain('data-card-field="relationship"');
    expect(preview.innerHTML).toContain('Root person');
    expect(preview.innerHTML).toContain('Ancestor');
    expect(preview.innerHTML).not.toContain('relationshipHint');
  });

  it('updates relationship line style through the shared SVG scene', () => {
    renderStudio();

    const controls = screen.getByTestId('poster-connector-style-controls');
    fireEvent.click(within(controls).getByRole('button', { name: 'Bold' }));

    const preview = screen.getByTestId('studio-poster-renderer-preview').innerHTML;
    expect(within(controls).getByRole('button', { name: 'Bold' }))
      .toHaveAttribute('aria-pressed', 'true');
    expect(preview).toContain('data-poster-connector-style="bold"');
    expect(preview).toContain('stroke-width:4.2');
  });

  it('changes generation line paths through the shared SVG scene', () => {
    renderStudio();

    const controls = screen.getByTestId('poster-connector-path-controls');
    const previewElement = screen.getByTestId('studio-poster-renderer-preview');
    fireEvent.click(within(controls).getByRole('button', { name: 'Straight' }));
    let preview = previewElement.innerHTML;
    expect(preview).toContain('data-poster-connector-path="straight"');

    fireEvent.click(within(controls).getByRole('button', { name: 'Stepped corners' }));
    preview = previewElement.innerHTML;
    expect(preview).toContain('data-poster-connector-path="orthogonal"');

    fireEvent.click(within(controls).getByRole('button', { name: 'Curved' }));
    expect(previewElement.innerHTML).toContain('data-poster-connector-path="curved"');
  });

  it('applies an owner color palette through the shared SVG scene', () => {
    renderStudio();

    const controls = screen.getByTestId('poster-color-palette-controls');
    fireEvent.click(within(controls).getByRole('button', { name: 'Print monochrome' }));

    const preview = screen.getByTestId('studio-poster-renderer-preview').innerHTML;
    expect(within(controls).getByRole('button', { name: 'Print monochrome' }))
      .toHaveAttribute('aria-pressed', 'true');
    expect(preview).toContain('data-poster-color-palette="monochrome-print"');
    expect(preview).toContain('fill="#f7f7f5"');
  });

  it('fine-tunes safe poster colors without changing export geometry', () => {
    renderStudio();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Customize poster colors' }));
    fireEvent.change(screen.getByLabelText('Poster background'), { target: { value: '#112233' } });
    fireEvent.change(screen.getByLabelText('Card color'), { target: { value: '#fefefe' } });
    fireEvent.change(screen.getByLabelText('Accent and frame'), { target: { value: '#cc5500' } });
    fireEvent.change(screen.getByLabelText('Relationship lines'), { target: { value: '#008877' } });

    const preview = screen.getByTestId('studio-poster-renderer-preview').innerHTML;
    expect(preview).toContain('data-poster-custom-colors="true"');
    expect(preview).toContain('fill="#112233"');
    expect(preview).toContain('.poster-card{fill:#fefefe;stroke:#cc5500');
    expect(preview).toContain('.poster-connector{fill:none;stroke:#008877');
    expect(preview).toContain('.poster-node{color:#171717;}');

    fireEvent.click(screen.getByRole('button', { name: 'Restore palette colors' }));
    expect(screen.getByTestId('studio-poster-renderer-preview').innerHTML)
      .toContain('data-poster-custom-colors="false"');
  });

  it('switches SVG-native background treatments through the canonical scene', () => {
    renderStudio();

    const controls = screen.getByTestId('poster-decoration-controls');
    fireEvent.click(within(controls).getByRole('button', { name: 'Clean' }));
    let preview = screen.getByTestId('studio-poster-renderer-preview').innerHTML;
    expect(preview).toContain('data-poster-decoration="clean"');
    expect(preview).not.toContain('class="poster-decoration');

    fireEvent.click(within(controls).getByRole('button', { name: 'Subtle lineage grid' }));
    preview = screen.getByTestId('studio-poster-renderer-preview').innerHTML;
    expect(within(controls).getByRole('button', { name: 'Subtle lineage grid' }))
      .toHaveAttribute('aria-pressed', 'true');
    expect(preview).toContain('data-poster-decoration="lineage-grid"');
    expect(preview).toContain('poster-decoration-lineage-grid');
  });

  it('switches SVG-native poster ornaments without changing render paths', () => {
    renderStudio();

    const controls = screen.getByTestId('poster-ornament-controls');
    const previewElement = screen.getByTestId('studio-poster-renderer-preview');
    expect(within(controls).getByRole('button', { name: 'Style default' }))
      .toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(within(controls).getByRole('button', { name: 'Corner branches' }));
    expect(previewElement.innerHTML).toContain('data-poster-ornament="corner-branches"');
    expect(previewElement.innerHTML).toContain('poster-ornament-branches');

    fireEvent.click(within(controls).getByRole('button', { name: 'No ornament' }));
    expect(previewElement.innerHTML).toContain('data-poster-ornament="none"');
    expect(previewElement.innerHTML).not.toContain('<g class="poster-ornament');
  });

  it('changes typography density through the canonical SVG scene', () => {
    renderStudio();

    const controls = screen.getByTestId('poster-typography-controls');
    fireEvent.click(within(controls).getByRole('button', { name: 'Larger names' }));
    let preview = screen.getByTestId('studio-poster-renderer-preview').innerHTML;
    expect(preview).toContain('data-poster-typography="prominent"');
    expect(within(controls).getByRole('button', { name: 'Larger names' }))
      .toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(within(controls).getByRole('button', { name: 'Compact' }));
    preview = screen.getByTestId('studio-poster-renderer-preview').innerHTML;
    expect(preview).toContain('data-poster-typography="compact"');
  });

  it('switches bundled Arabic font families through the canonical SVG scene', () => {
    renderStudio();

    const controls = screen.getByTestId('poster-font-family-controls');
    const previewElement = screen.getByTestId('studio-poster-renderer-preview');
    expect(within(controls).getByRole('button', { name: 'Style default' }))
      .toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(within(controls).getByRole('button', { name: 'Noto Sans Arabic' }));
    expect(previewElement.innerHTML).toContain('data-poster-font-family="noto-sans-arabic"');

    fireEvent.click(within(controls).getByRole('button', { name: 'Noto Kufi Arabic' }));
    expect(previewElement.innerHTML).toContain('data-poster-font-family="noto-kufi-arabic"');

    fireEvent.click(within(controls).getByRole('button', { name: 'Amiri Heritage' }));
    expect(previewElement.innerHTML).toContain('data-poster-font-family="amiri"');
  });

  it('reflows the shared scene when the owner changes person card size', () => {
    renderStudio();

    const controls = screen.getByTestId('poster-card-scale-controls');
    const previewElement = screen.getByTestId('studio-poster-renderer-preview');
    const standardSvg = previewElement.innerHTML;
    fireEvent.click(within(controls).getByRole('button', { name: 'Large' }));
    const largeSvg = previewElement.innerHTML;

    expect(largeSvg).toContain('data-poster-card-scale="large"');
    expect(within(controls).getByRole('button', { name: 'Large' }))
      .toHaveAttribute('aria-pressed', 'true');
    expect(largeSvg).not.toBe(standardSvg);

    fireEvent.click(within(controls).getByRole('button', { name: 'Small' }));
    expect(previewElement.innerHTML).toContain('data-poster-card-scale="compact"');
  });

  it('switches between standard, photo-focused, and text-minimal card layouts', () => {
    renderStudio();

    const controls = screen.getByTestId('poster-card-layout-controls');
    const previewElement = screen.getByTestId('studio-poster-renderer-preview');
    expect(within(controls).getByRole('button', { name: 'Style default' }))
      .toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(within(controls).getByRole('button', { name: 'Photo-focused' }));
    let preview = previewElement.innerHTML;
    expect(preview).toContain('data-poster-card-layout="photo-focused"');
    expect(preview).toContain('class="poster-avatar"');

    fireEvent.click(within(controls).getByRole('button', { name: 'Text-minimal' }));
    preview = previewElement.innerHTML;
    expect(preview).toContain('data-poster-card-layout="text-minimal"');
    expect(preview).not.toContain('class="poster-avatar"');

    fireEvent.click(within(controls).getByRole('button', { name: 'Standard' }));
    expect(previewElement.innerHTML).toContain('data-poster-card-layout="standard"');
  });

  it('changes card depth through SVG-native effects without layout changes', () => {
    renderStudio();

    const controls = screen.getByTestId('poster-card-effect-controls');
    const previewElement = screen.getByTestId('studio-poster-renderer-preview');
    fireEvent.click(within(controls).getByRole('button', { name: 'Flat' }));
    let preview = previewElement.innerHTML;
    expect(preview).toContain('data-poster-card-effect="flat"');
    expect(preview).toContain('.poster-card-shadow{fill:#4b2f1c;opacity:0;');

    fireEvent.click(within(controls).getByRole('button', { name: 'Elevated' }));
    preview = previewElement.innerHTML;
    expect(preview).toContain('data-poster-card-effect="elevated"');
    expect(preview).toContain('dy="12" stdDeviation="14"');
  });

  it('changes card frame detail through the canonical SVG scene', () => {
    renderStudio();

    const controls = screen.getByTestId('poster-card-frame-controls');
    const previewElement = screen.getByTestId('studio-poster-renderer-preview');
    fireEvent.click(within(controls).getByRole('button', { name: 'Minimal' }));
    let preview = previewElement.innerHTML;
    expect(preview).toContain('data-poster-card-frame="minimal"');
    expect(preview).not.toContain('class="poster-card-inner-frame"');

    fireEvent.click(within(controls).getByRole('button', { name: 'Lightly ornate' }));
    preview = previewElement.innerHTML;
    expect(preview).toContain('data-poster-card-frame="ornate"');
    expect(preview).toContain('class="poster-card-inner-frame"');
  });

  it('changes person-card corners without leaving the shared SVG scene', () => {
    renderStudio();

    const controls = screen.getByTestId('poster-card-corner-controls');
    const previewElement = screen.getByTestId('studio-poster-renderer-preview');
    expect(within(controls).getByRole('button', { name: 'Style default' }))
      .toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(within(controls).getByRole('button', { name: 'Square' }));
    let preview = previewElement.innerHTML;
    expect(preview).toContain('data-poster-card-corner="square"');
    expect(preview).toMatch(/class="poster-card"[^>]+rx="0"/);

    fireEvent.click(within(controls).getByRole('button', { name: 'Rounded' }));
    preview = previewElement.innerHTML;
    expect(preview).toContain('data-poster-card-corner="rounded"');
    expect(preview).toMatch(/class="poster-card"[^>]+rx="[1-9][\d.]*"/);
  });

  it('reflows the canonical scene through owner-selected print margins', () => {
    renderStudio();

    const controls = screen.getByTestId('poster-margin-controls');
    const previewElement = screen.getByTestId('studio-poster-renderer-preview');
    expect(within(controls).getByRole('button', { name: 'Balanced' }))
      .toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(within(controls).getByRole('button', { name: 'Compact' }));
    expect(previewElement.innerHTML).toContain('data-poster-margin-preset="compact"');

    fireEvent.click(within(controls).getByRole('button', { name: 'Generous' }));
    expect(previewElement.innerHTML).toContain('data-poster-margin-preset="generous"');
  });

  it('changes tree spacing density through the canonical layout engine', () => {
    renderStudio();

    const controls = screen.getByTestId('poster-spacing-controls');
    const previewElement = screen.getByTestId('studio-poster-renderer-preview');
    expect(within(controls).getByRole('button', { name: 'Style default' }))
      .toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(within(controls).getByRole('button', { name: 'Compact' }));
    expect(previewElement.innerHTML).toContain('data-poster-spacing="compact"');

    fireEvent.click(within(controls).getByRole('button', { name: 'Airy' }));
    expect(previewElement.innerHTML).toContain('data-poster-spacing="airy"');
  });

  it('changes the poster page frame through the canonical SVG scene', () => {
    renderStudio();

    const controls = screen.getByTestId('poster-page-frame-controls');
    const previewElement = screen.getByTestId('studio-poster-renderer-preview');
    fireEvent.click(within(controls).getByRole('button', { name: 'No frame' }));
    let preview = previewElement.innerHTML;
    expect(preview).toContain('data-poster-page-frame="none"');
    expect(preview).not.toContain('class="poster-frame');

    fireEvent.click(within(controls).getByRole('button', { name: 'Modern gallery' }));
    preview = previewElement.innerHTML;
    expect(preview).toContain('data-poster-page-frame="gallery"');
    expect(preview).toContain('class="poster-frame poster-frame-modern"');
  });

  it('changes title composition without creating a second preview renderer', () => {
    renderStudio();

    const controls = screen.getByTestId('poster-header-controls');
    const previewElement = screen.getByTestId('studio-poster-renderer-preview');
    fireEvent.click(within(controls).getByRole('button', { name: 'Gallery rail' }));
    let preview = previewElement.innerHTML;
    expect(preview).toContain('data-poster-header="gallery-rail"');
    expect(preview).toContain('class="poster-header poster-header-gallery-rail"');

    fireEvent.click(within(controls).getByRole('button', { name: 'Compact registry' }));
    preview = previewElement.innerHTML;
    expect(preview).toContain('data-poster-header="registry"');
    expect(preview).toContain('class="poster-header poster-header-registry"');
    expect(preview).toContain('7 people');
  });

  it('composes a safe owner footer and can hide Jozor attribution', () => {
    renderStudio();

    fireEvent.change(screen.getByRole('textbox', { name: 'Footer phrase' }), {
      target: { value: '<Family & memory>' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: /Created in Jozor/i }));

    const preview = screen.getByTestId('studio-poster-renderer-preview').innerHTML;
    expect(preview).toContain('poster-custom-footer');
    expect(preview).toContain('&lt;Family &amp; memory&gt;');
    expect(preview).not.toContain('<script');
    expect(preview).not.toContain('Created in Jozor');
    expect(preview).toContain('poster-scope');
  });

  it('changes the poster root through session tokens without exposing source ids', () => {
    renderStudio();

    const rootSelector = screen.getByRole('combobox', { name: 'Poster root' });
    fireEvent.change(rootSelector, { target: { value: 'preview-root-2' } });

    const previewPane = screen.getByTestId('visual-studio-preview-pane');
    expect(within(previewPane).getByText(/People visible: 3/i)).toBeInTheDocument();
    expect(screen.getByTestId('studio-poster-renderer-preview').innerHTML).toContain('Preview Father');
    expect(screen.getByRole('textbox', { name: 'Poster title' })).toHaveValue('Preview Father Ancestor Tree');
    expect(rootSelector.outerHTML).not.toContain('fixture-father');
  });

  it('renders Arabic owner-review copy and localized preview summary', () => {
    renderStudio({ language: 'ar' });

    expect(screen.getByText(AR_PREVIEW_TITLE)).toBeInTheDocument();
    expect(
      screen.getByText(/\u0627\u062e\u062a\u0631 \u0646\u0648\u0639 \u0627\u0644\u0645\u062e\u0631\u062c \u0648\u062e\u0635\u0635 \u0627\u0644\u0628\u0648\u0633\u062a\u0631/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/\u064a\u0645\u0643\u0646\u0643 \u062a\u0646\u0632\u064a\u0644 \u0627\u0644\u0628\u0648\u0633\u062a\u0631 \u0628\u0635\u064a\u063a SVG \u0648PNG \u0648PDF/i)
    ).toBeInTheDocument();

    expect(screen.getByText(AR_CHOOSE_OUTPUT)).toBeInTheDocument();
    const previewPane = screen.getByTestId('visual-studio-preview-pane');
    expect(within(previewPane).getByText(new RegExp(AR_PEOPLE_VISIBLE))).toBeInTheDocument();
    expect(within(previewPane).getByText(new RegExp(AR_RELATIONSHIPS_VISIBLE))).toBeInTheDocument();
    expect(screen.queryByText(/sanitized-data|masked/i)).not.toBeInTheDocument();
    expect(screen.getByTestId('visual-studio-action-bar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /تنزيل SVG/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /تنزيل PNG/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /تنزيل PDF/i })).toBeEnabled();
  });

  it('exposes three poster directions and keeps Snapshot as a separate product', () => {
    renderStudio();

    const previewPane = screen.getByTestId('visual-studio-preview-pane');
    const selectors = screen.getByTestId('visual-studio-template-selectors');
    const previewFrame = screen.getByTestId('visual-preview-frame');

    expect(within(selectors).getByRole('button', { name: 'Classic Ancestor Poster' })).toBeInTheDocument();
    expect(within(selectors).getByRole('button', { name: 'Modern Gallery Poster' })).toBeInTheDocument();
    expect(within(selectors).getByRole('button', { name: 'Dense Genealogy Poster' })).toBeInTheDocument();

    fireEvent.click(within(selectors).getByRole('button', { name: 'Modern Gallery Poster' }));
    expect(screen.getByTestId('studio-poster-renderer-preview').innerHTML)
      .toContain('data-poster-theme="modern-gallery"');
    expect(screen.getByTestId('studio-poster-renderer-preview').innerHTML)
      .toContain('poster-frame-modern');

    fireEvent.click(within(selectors).getByRole('button', { name: 'Dense Genealogy Poster' }));
    expect(screen.getByTestId('studio-poster-renderer-preview').innerHTML)
      .toContain('data-poster-theme="dense-genealogy"');
    expect(screen.getByTestId('studio-poster-renderer-preview').innerHTML)
      .toContain('poster-frame-dense');

    fireEvent.click(within(selectors).getByRole('button', { name: 'Current Tree Snapshot' }));

    expect(within(previewPane).getByRole('heading', { level: 5, name: 'Current Tree Snapshot' })).toBeInTheDocument();
    expect(screen.queryByText('tree-layout')).not.toBeInTheDocument();
    expect(screen.queryByText('narrative')).not.toBeInTheDocument();
    expect(screen.queryByText('viewport')).not.toBeInTheDocument();
    expect(screen.getByTestId('snapshot-preview-composition')).toBeInTheDocument();
    expect(previewFrame).toHaveAttribute('aria-label', 'Preview of Current Tree Snapshot');
    expect(within(previewPane).getByText(/People visible: 3/i)).toBeInTheDocument();
    expect(within(previewPane).queryByText(/Preview simplified/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Full preview')).not.toBeInTheDocument();
    expect(screen.queryByTestId('visual-studio-poster-settings')).not.toBeInTheDocument();

    expect(screen.queryByTestId('visual-studio-action-bar')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Download PNG/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Download PDF/i })).not.toBeInTheDocument();
  });

  it('applies poster depth, tree direction, page orientation, privacy, and page size to preview and PNG export', async () => {
    renderStudio();

    const depthControl = screen.getByTestId('poster-depth-control');
    fireEvent.click(within(depthControl).getByRole('button', { name: '2' }));

    const previewPane = screen.getByTestId('visual-studio-preview-pane');
    expect(within(previewPane).getByText(/People visible: 3/i)).toBeInTheDocument();
    expect(within(previewPane).getByText(/Relationships visible: 2/i)).toBeInTheDocument();

    const directionControl = screen.getByTestId('poster-direction-control');
    fireEvent.click(within(directionControl).getByRole('button', { name: 'Horizontal' }));
    expect(screen.getByTestId('studio-poster-renderer-preview').innerHTML)
      .toContain('data-poster-layout-direction="horizontal"');

    const orientationControl = screen.getByTestId('poster-orientation-control');
    fireEvent.click(within(orientationControl).getByRole('button', { name: 'Landscape' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Page size' }), { target: { value: 'A4' } });
    expect(screen.getByTestId('studio-poster-page-frame')).toHaveClass('w-full');
    expect(screen.getByTestId('studio-poster-page-frame')).toHaveStyle({ maxWidth: '760px' });
    expect(screen.getByTestId('studio-poster-renderer-preview').innerHTML)
      .toContain('data-physical-width-mm="297"');
    expect(screen.getByTestId('studio-poster-renderer-preview').innerHTML)
      .toContain('data-physical-height-mm="210"');

    fireEvent.click(screen.getByRole('checkbox', { name: 'Hide living and private people' }));
    const posterSvg = screen.getByTestId('studio-poster-renderer-preview').innerHTML;
    expect(posterSvg).toContain('Preview Root');
    expect(posterSvg).toContain('class="poster-avatar"');
    expect(posterSvg).toContain('PR');
    expect(posterSvg).toContain('1950 - 2010');

    fireEvent.change(screen.getByRole('combobox', { name: 'Page size' }), { target: { value: 'A3' } });
    fireEvent.click(screen.getByRole('button', { name: /Download PNG/i }));

    await waitFor(() => expect(downloadFile).toHaveBeenCalled());
    expect(screen.getByTestId('studio-poster-renderer-preview').innerHTML)
      .toContain('data-physical-width-mm="420"');
    expect(screen.getByTestId('studio-poster-renderer-preview').innerHTML)
      .toContain('data-physical-height-mm="297"');
  });

  it('offers all available ancestor generations through the sanitized selector path', () => {
    renderStudio();

    fireEvent.click(
      within(screen.getByTestId('poster-depth-control')).getByRole('button', { name: 'All' })
    );

    expect(screen.getByRole('textbox', { name: 'Short description' })).toHaveValue(
      'All available generations from the family record'
    );
    expect(within(screen.getByTestId('visual-studio-preview-pane')).getByText(/People visible: 7/i))
      .toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download PNG/i })).toBeEnabled();
  });

  it('switches to a descendant selector and descendant-tiered PosterScene', () => {
    renderStudio();

    fireEvent.click(
      within(screen.getByTestId('poster-scope-control')).getByRole('button', { name: 'Descendants' })
    );

    expect(screen.getByRole('textbox', { name: 'Poster title' })).toHaveValue('Descendant Tree');
    expect(screen.getByTestId('studio-poster-renderer-preview').innerHTML)
      .toContain('data-poster-layout-engine="descendant-tiered"');
    expect(screen.getByTestId('studio-poster-renderer-preview').innerHTML)
      .toContain('Scope: descendants');
    expect(within(screen.getByTestId('visual-studio-preview-pane')).getByText(/People visible: 1/i))
      .toBeInTheDocument();
  });

  it('does not apply the binary ancestor cap to descendant branches', () => {
    const childIds = Array.from({ length: 20 }, (_, index) => `store-child-${index + 1}`);
    useAppStore.setState({
      currentTreeId: 'descendant-test-tree',
      focusId: 'store-root',
      people: {
        'store-root': makePerson({
          id: 'store-root',
          firstName: 'Public',
          lastName: 'Root',
          isDeceased: true,
          children: childIds,
        }),
        ...Object.fromEntries(childIds.map((id, index) => [id, makePerson({
          id,
          firstName: `Child ${index + 1}`,
          lastName: 'Branch',
          isDeceased: true,
          parents: ['store-root'],
        })])),
      },
    });

    renderStudio({ previewSourceMode: 'store' });
    fireEvent.click(
      within(screen.getByTestId('poster-scope-control')).getByRole('button', { name: 'Descendants' })
    );

    expect(within(screen.getByTestId('visual-studio-preview-pane')).getByText(/People visible: 21/i))
      .toBeInTheDocument();
    expect(within(screen.getByTestId('visual-studio-preview-pane')).queryByText(/Preview simplified/i))
      .not.toBeInTheDocument();
  });

  it('switches to the full-tree overview scene and removes the generation limiter', () => {
    renderStudio();

    fireEvent.click(
      within(screen.getByTestId('poster-scope-control')).getByRole('button', { name: 'Full tree' })
    );

    expect(screen.getByRole('textbox', { name: 'Poster title' })).toHaveValue('Full Family Tree');
    expect(screen.getByRole('textbox', { name: 'Short description' })).toHaveValue(
      'All people and relationships recorded in the tree'
    );
    expect(screen.queryByTestId('poster-depth-control')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Layout anchor' })).toBeInTheDocument();
    expect(screen.getByTestId('studio-poster-renderer-preview').innerHTML)
      .toContain('data-poster-layout-engine="full-tree-overview"');
    expect(screen.getByTestId('studio-poster-renderer-preview').innerHTML)
      .toContain('poster-overview-node');
    expect(screen.getByTestId('studio-poster-renderer-preview').innerHTML)
      .toContain('Scope: all relationships');
    expect(within(screen.getByTestId('visual-studio-preview-pane')).getByText(/People visible: 7/i))
      .toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: 'Page size' }), { target: { value: 'A0' } });
    const largeSvg = screen.getByTestId('studio-poster-renderer-preview').innerHTML;
    expect(largeSvg).toContain('data-physical-width-mm="1189"');
    expect(largeSvg).toContain('data-physical-height-mm="841"');
    expect(screen.getByTestId('poster-print-quality-notice')).toHaveTextContent(
      'Review poster density and text readability before printing.'
    );
    expect(screen.getByRole('button', { name: /Download PNG/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Download PDF/i })).toBeEnabled();
  });

  it('routes a blocked single sheet into the large-tree product setup without downloading', () => {
    const childIds = Array.from({ length: 49 }, (_, index) => `dense-child-${index + 1}`);
    useAppStore.setState({
      currentTreeId: 'dense-routing-tree',
      focusId: 'dense-root',
      people: {
        'dense-root': makePerson({
          id: 'dense-root',
          firstName: 'Dense',
          lastName: 'Root',
          children: childIds,
          isDeceased: true,
        }),
        ...Object.fromEntries(childIds.map((id, index) => [id, makePerson({
          id,
          firstName: `Relative ${index + 1}`,
          lastName: 'Branch',
          parents: ['dense-root'],
          isDeceased: true,
        })])),
      },
    });

    renderStudio({ previewSourceMode: 'store' });

    fireEvent.click(
      within(screen.getByTestId('poster-scope-control')).getByRole('button', { name: 'Full tree' })
    );
    expect(screen.getByTestId('poster-print-quality-notice')).toHaveTextContent(
      'One sheet is too small for this tree.'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Use Dense Genealogy' }));
    expect(screen.getByRole('button', { name: 'Dense Genealogy Poster' })).toHaveAttribute(
      'aria-label',
      'Dense Genealogy Poster'
    );
    expect(screen.getByTestId('studio-poster-renderer-preview').innerHTML)
      .toContain('data-poster-theme="dense-overview"');
    expect(screen.getByTestId('studio-poster-renderer-preview').innerHTML)
      .toContain('data-poster-color-palette="evergreen"');
    expect(downloadFile).not.toHaveBeenCalled();
  });

  it('offers a downloadable branch collection only for the full-tree scope', async () => {
    useAppStore.setState({
      currentTreeId: 'branch-tree',
      focusId: 'branch-root',
      people: {
        'branch-root': makePerson({
          id: 'branch-root',
          firstName: 'Family',
          lastName: 'Root',
          children: ['branch-one', 'branch-two'],
          isDeceased: true,
        }),
        'branch-one': makePerson({
          id: 'branch-one',
          firstName: 'First',
          lastName: 'Branch',
          parents: ['branch-root'],
          children: ['branch-grandchild'],
          isDeceased: true,
        }),
        'branch-two': makePerson({
          id: 'branch-two',
          firstName: 'Second',
          lastName: 'Branch',
          parents: ['branch-root'],
          isDeceased: true,
        }),
        'branch-grandchild': makePerson({
          id: 'branch-grandchild',
          firstName: 'Next',
          lastName: 'Generation',
          parents: ['branch-one'],
          isDeceased: true,
        }),
      },
    });
    renderStudio({ previewSourceMode: 'store' });

    expect(screen.queryByRole('button', { name: /Download branch collection/i }))
      .not.toBeInTheDocument();

    fireEvent.click(
      within(screen.getByTestId('poster-scope-control')).getByRole('button', { name: 'Full tree' })
    );
    fireEvent.click(screen.getByRole('button', { name: /Download branch collection/i }));

    await waitFor(() => {
      expect(downloadFile).toHaveBeenCalledWith(
        expect.any(Blob),
        'Full-Family-Tree-branch-collection.zip',
        'application/zip'
      );
    });
  });

  it('configures and downloads a tiled wall poster only for the full-tree scope', async () => {
    renderStudio();

    expect(screen.queryByTestId('tiled-wall-poster-settings')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Download tiled wall poster/i }))
      .not.toBeInTheDocument();

    fireEvent.click(
      within(screen.getByTestId('poster-scope-control')).getByRole('button', { name: 'Full tree' })
    );
    expect(screen.getByTestId('tiled-wall-poster-settings')).toBeInTheDocument();
    expect(screen.getByTestId('tiled-wall-quality-summary')).toHaveTextContent('9 sheets');
    expect(screen.getByTestId('tiled-wall-quality-summary')).toHaveTextContent('Print readable');
    expect(screen.getByTestId('tiled-wall-quality-summary')).toHaveTextContent(/\d+\.\d \u00d7 \d+\.\d cm/);
    expect(screen.getByTestId('tiled-wall-quality-summary')).not.toHaveTextContent('\\u00d7');
    fireEvent.change(screen.getByRole('combobox', { name: 'Tile rows' }), { target: { value: '2' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Tile columns' }), { target: { value: '4' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Tile sheet size' }), { target: { value: 'A4' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Tile overlap' }), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: /Download tiled wall poster/i }));

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

    fireEvent.click(
      within(screen.getByTestId('poster-scope-control')).getByRole('button', { name: 'Full tree' })
    );
    fireEvent.change(screen.getByRole('combobox', { name: 'Tile rows' }), { target: { value: '6' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Tile columns' }), { target: { value: '5' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Tile sheet size' }), { target: { value: 'A2' } });

    const recommendationButton = screen.getByRole('button', { name: 'Apply lower-cost grid' });
    expect(recommendationButton).toBeInTheDocument();
    fireEvent.click(recommendationButton);

    expect(screen.getByRole('combobox', { name: 'Tile rows' })).not.toHaveValue('6');
    expect(screen.getByRole('combobox', { name: 'Tile columns' })).not.toHaveValue('5');
    expect(screen.getByRole('combobox', { name: 'Tile sheet size' })).toHaveValue('A2');
    expect(screen.getByRole('combobox', { name: 'Tile overlap' })).toHaveValue('8');
  });

  it('downloads a PNG owner-review artifact from the Studio renderer', async () => {
    renderStudio();

    fireEvent.click(screen.getByRole('button', { name: /Download PNG/i }));

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

    fireEvent.click(screen.getByRole('button', { name: /Download SVG/i }));

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

    fireEvent.click(screen.getByRole('button', { name: /Download PDF/i }));

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

    fireEvent.change(screen.getByRole('textbox', { name: 'Poster title' }), {
      target: { value: 'Ramadan Family Ancestors' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Short description' }), {
      target: { value: 'A family record across four generations' },
    });

    const posterSvg = screen.getByTestId('studio-poster-renderer-preview').innerHTML;
    expect(posterSvg).toContain('Ramadan Family Ancestors');
    expect(posterSvg).toContain('A family record across four generations');

    fireEvent.click(screen.getByRole('button', { name: /Download PNG/i }));

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
    expect(within(previewPane).queryByText(/Preview simplified/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Review Summary')).not.toBeInTheDocument();
    expect(screen.queryByText('sanitized-data')).not.toBeInTheDocument();

    const serializedStudio = screen.getByTestId('visual-publishing-studio').textContent || '';
    expect(serializedStudio).not.toContain('store-root');
    expect(serializedStudio).not.toContain('storage.example.com');
    const rootSelector = screen.getByRole('combobox', { name: 'Poster root' });
    expect(rootSelector).toHaveValue('preview-root-2');
    expect(rootSelector.outerHTML).not.toContain('store-root');
    expect(rootSelector.outerHTML).not.toContain('unrelated-first');
    expect(screen.getByRole('textbox', { name: 'Poster title' })).toHaveValue('Ancestor Tree');
    expect(screen.getByTestId('studio-poster-renderer-preview').innerHTML).not.toContain('Living Root Ancestor Tree');

    fireEvent.click(screen.getByRole('checkbox', { name: 'Show birth place' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Show occupation' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Show short descriptive line' }));
    const detailedPosterSvg = screen.getByTestId('studio-poster-renderer-preview').innerHTML;
    expect(detailedPosterSvg).toContain('Damascus \u00b7 Teacher');
    expect(detailedPosterSvg).not.toContain('Private Living Place');
    expect(detailedPosterSvg).not.toContain('Private Living Job');
    expect(detailedPosterSvg).not.toContain('Private Place');
    expect(detailedPosterSvg).not.toContain('Private Job');
    expect(detailedPosterSvg).toContain('Family educator and community mentor');
    expect(detailedPosterSvg).not.toContain('Private family biography');

    fireEvent.click(screen.getByRole('checkbox', { name: 'Hide living and private people' }));
    expect(screen.getByRole('textbox', { name: 'Poster title' })).toHaveValue('Living Root Ancestor Tree');
  });
});
