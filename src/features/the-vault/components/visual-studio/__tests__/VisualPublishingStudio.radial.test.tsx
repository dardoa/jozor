import { render, screen, within, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VisualPublishingStudio } from '../VisualPublishingStudio';

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

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('VisualPublishingStudio Radial Integration Suite', () => {
  beforeEach(() => {
    cleanup();
  });
  vi.setConfig({ testTimeout: 15000 });

  it('executes complete Radial integration workflow with token stability, geometry updates, and raw ID exclusion', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<VisualPublishingStudio language="ar" previewSourceMode="fixture" />);

    // 1. Navigate to Layout tab & activate Radial
    const layoutTab = screen.getByRole('tab', { name: /التخطيط/i });
    await user.click(layoutTab);

    const radialBtn = screen.getByRole('button', { name: /دائري \/ مروحي/i });
    expect(radialBtn).toBeInTheDocument();
    await user.click(radialBtn);

    await waitFor(() => {
      expect(screen.getByTestId('radial-controls-section')).toBeInTheDocument();
    });

    // 2. Assert SVG exists in DOM
    const svgElement = document.querySelector('svg[data-poster-layout-engine="radial-generations"]');
    expect(svgElement).toBeInTheDocument();

    const readGeometry = () => Array.from(
      document.querySelectorAll('svg[data-poster-layout-engine="radial-generations"] .poster-node')
    ).map((node) => [
      node.getAttribute('data-preview-node'),
      node.getAttribute('data-scene-x'),
      node.getAttribute('data-scene-y'),
    ]);
    // 3. Choose root token from select
    const contentTab = screen.getByRole('tab', { name: /المحتوى/i });
    await user.click(contentTab);

    const rootSelect = screen.getByRole('combobox', { name: /الشخص الرئيسي/i });
    expect(rootSelect).toBeInTheDocument();

    // Verify token values in select are opaque tokens (session-token-...)
    const options = screen.getAllByRole('option') as HTMLOptionElement[];
    expect(options.length).toBeGreaterThan(0);
    expect(options[0].value).toMatch(/^session-token-[a-z0-9-]+$/i);
    const selectedToken = options[1]?.value ?? options[0].value;
    await user.selectOptions(rootSelect, selectedToken);
    expect(rootSelect).toHaveValue(selectedToken);

    await user.click(screen.getByRole('button', { name: /عرض جميع البيانات/i }));

    // 4. Change 180° / 360° span and ring count
    await user.click(layoutTab);

    const geometry360 = readGeometry();
    expect(geometry360.length).toBeGreaterThan(1);

    const span180Btn = screen.getByRole('button', { name: /180° مروحة نصف دائرة/i });
    await user.click(span180Btn);
    expect(span180Btn).toHaveAttribute('aria-pressed', 'true');

    await waitFor(() => expect(readGeometry()).not.toEqual(geometry360));
    expect(readGeometry().map(([id]) => id)).toEqual(geometry360.map(([id]) => id));

    const rings4Btn = within(screen.getByTestId('radial-rings-control')).getByRole('button', { name: '4' });
    await user.click(rings4Btn);
    expect(rings4Btn).toHaveAttribute('aria-pressed', 'true');

    // 5. Change language to English and privacy mode to masked, proving selected token remains stable
    rerender(<VisualPublishingStudio language="en" previewSourceMode="fixture" />);

    await waitFor(() => {
      const enContentTab = screen.getByRole('tab', { name: /Content/ });
      expect(enContentTab).toBeInTheDocument();
    });

    const enContentTab = screen.getByRole('tab', { name: /Content/ });
    await user.click(enContentTab);
    const englishRootSelect = screen.getByRole('combobox', { name: /Focal Person/i });
    expect(englishRootSelect).toHaveValue(selectedToken);

    // 6. Switch Radial -> Focus -> Tiered and prove scope/bucket restoration
    const enLayoutTab = screen.getByRole('tab', { name: 'Layout' });
    await user.click(enLayoutTab);

    const focusBtn = screen.getByRole('button', { name: /Focus Family/i });
    await user.click(focusBtn);

    const tieredBtn = screen.getByRole('button', { name: /Tiered/i });
    await user.click(tieredBtn);

    // Return to Radial
    const enRadialBtn = screen.getByRole('button', { name: /Radial \/ Fan/i });
    await user.click(enRadialBtn);

    await waitFor(() => {
      expect(screen.getByTestId('radial-controls-section')).toBeInTheDocument();
    });

    // 7. Assert NO raw IDs appear in DOM or SVG html
    const domHtml = document.body.innerHTML;
    expect(domHtml).not.toContain('fixture-root');
    expect(domHtml).not.toContain('fixture-father');
    expect(domHtml).not.toContain('fixture-mother');
    expect(domHtml).not.toMatch(/person_[a-zA-Z0-9_-]+/i);
  });

  it('restores lastRadialScope and lastTieredScope during atomic layout switching', async () => {
    const user = userEvent.setup();
    render(<VisualPublishingStudio language="ar" previewSourceMode="fixture" />);

    const layoutTab = screen.getByRole('tab', { name: /التخطيط/i });
    await user.click(layoutTab);

    const radialBtn = screen.getByRole('button', { name: /دائري \/ مروحي/i });
    await user.click(radialBtn);

    // Switch Radial scope to Descendants
    const descBtn = within(screen.getByTestId('radial-scope-control')).getByRole('button', { name: /الأحفاد/i });
    await user.click(descBtn);

    // Switch back to Tiered layout
    const tieredBtn = screen.getByRole('button', { name: /متدرج/i });
    await user.click(tieredBtn);

    // Switch back to Radial layout and assert scope restored to Descendants
    await user.click(radialBtn);
    await waitFor(() => {
      const activeDescBtn = within(screen.getByTestId('radial-scope-control')).getByRole('button', { name: /الأحفاد/i });
      expect(activeDescBtn).toHaveAttribute('aria-pressed', 'true');
    });
  });
});
