import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it } from 'vitest';
import { VisualPublishingStudio } from '../VisualPublishingStudio';

describe('VisualPublishingStudio Registry Integration Defaults', () => {
  it('renders classic-ancestor-poster defaults in English correctly', () => {
    render(<VisualPublishingStudio language="en" />);

    // Main title
    expect(screen.getByText('Visual Publishing Studio')).toBeInTheDocument();

    // Preview Pane displays classic-ancestor-poster title & description from registry
    const previewPane = screen.getByTestId('visual-studio-preview-pane');
    expect(within(previewPane).getByText('Classic Ancestor Poster')).toBeInTheDocument();
    expect(
      within(previewPane).getByText('Traditional cozy poster design featuring warm vintage tones (4 generations), perfect for print and framing.')
    ).toBeInTheDocument();
    expect(within(previewPane).getByText(/Preview type: placeholder/i)).toBeInTheDocument();

    // Config Panel displays registry fields
    expect(screen.getByTestId('visual-studio-config-panel')).toBeInTheDocument();
    expect(screen.getByText('Product Type')).toBeInTheDocument();
    expect(screen.getByText('poster')).toBeInTheDocument();
    expect(screen.getByText('Template ID')).toBeInTheDocument();
    expect(screen.getByText('classic-ancestor')).toBeInTheDocument();
    expect(screen.getByText('Layout Engine')).toBeInTheDocument();
    expect(screen.getByText('poster-layout')).toBeInTheDocument();
    expect(screen.getByText('Reading Strategy')).toBeInTheDocument();
    expect(screen.getByText('ancestor')).toBeInTheDocument();
    expect(screen.getByText('Supported Sizes')).toBeInTheDocument();
    expect(screen.getByText('A4, A3, A2, A1, A0')).toBeInTheDocument();
    expect(screen.getByText('Supported Scopes')).toBeInTheDocument();
    expect(screen.getByText('selected-root, ancestor-line')).toBeInTheDocument();

    // Action Bar displays disabled buttons
    expect(screen.getByTestId('visual-studio-action-bar')).toBeInTheDocument();
    const previewBtn = screen.getByRole('button', { name: /Studio Preview/i });
    const pngBtn = screen.getByRole('button', { name: /Export PNG/i });
    const pdfBtn = screen.getByRole('button', { name: /Export PDF/i });

    expect(previewBtn).toBeDisabled();
    expect(pngBtn).toBeDisabled();
    expect(pdfBtn).toBeDisabled();
  });

  it('renders classic-ancestor-poster defaults in Arabic correctly', () => {
    render(<VisualPublishingStudio language="ar" />);

    // Main title
    expect(screen.getByText('استوديو النشر البصري')).toBeInTheDocument();

    // Preview Pane displays Arabic display name & description from registry
    const previewPane = screen.getByTestId('visual-studio-preview-pane');
    expect(within(previewPane).getByText('شجرة الأسلاف الكلاسيكية الدافئة')).toBeInTheDocument();
    expect(
      within(previewPane).getByText('تصميم بوستر تقليدي مريح للعين، يعتمد على نبرات لونية هادئة (4 أجيال)، ملائم للطباعة الورقية والتأطير.')
    ).toBeInTheDocument();
    expect(within(previewPane).getByText(/نوع المعاينة: placeholder/i)).toBeInTheDocument();

    // Config Panel displays Arabic titles with registry values
    expect(screen.getByText('نوع المنتج')).toBeInTheDocument();
    expect(screen.getByText('القالب المعرف')).toBeInTheDocument();
    expect(screen.getByText('محرك التخطيط')).toBeInTheDocument();
    expect(screen.getByText('استراتيجية القراءة')).toBeInTheDocument();
  });

  it('updates state dynamically when selecting templates', () => {
    render(<VisualPublishingStudio language="en" />);

    const previewPane = screen.getByTestId('visual-studio-preview-pane');
    const selectors = screen.getByTestId('visual-studio-template-selectors');

    // Click on "Modern Ancestor Poster" button inside template selectors
    const modernBtn = within(selectors).getByRole('button', { name: 'Modern Ancestor Poster' });
    fireEvent.click(modernBtn);

    // Verify it updates Preview Pane title and description
    expect(within(previewPane).getByText('Modern Ancestor Poster')).toBeInTheDocument();
    expect(within(previewPane).getByText(/Modern dark-themed poster design utilizing contrasting elements/i)).toBeInTheDocument();
    expect(screen.getByText('modern-ancestor')).toBeInTheDocument();

    // Click on "Current Tree Snapshot" button inside template selectors
    const snapshotBtn = within(selectors).getByRole('button', { name: 'Current Tree Snapshot' });
    fireEvent.click(snapshotBtn);

    // Verify it updates fields to snapshot specs
    expect(within(previewPane).getByText('Current Tree Snapshot')).toBeInTheDocument();
    expect(screen.getByText('tree-layout')).toBeInTheDocument();
    expect(screen.getByText('narrative')).toBeInTheDocument();
    expect(screen.getByText('viewport')).toBeInTheDocument();

    // Verify buttons remain disabled
    const pngBtn = screen.getByRole('button', { name: /Export PNG/i });
    expect(pngBtn).toBeDisabled();
  });

  it('hides Action Bar when isPreviewOnly is true', () => {
    render(<VisualPublishingStudio language="en" isPreviewOnly={true} />);

    expect(screen.queryByTestId('visual-studio-action-bar')).not.toBeInTheDocument();
  });
});
