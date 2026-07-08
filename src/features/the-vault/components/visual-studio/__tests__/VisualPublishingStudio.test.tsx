import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it } from 'vitest';
import { VisualPublishingStudio } from '../VisualPublishingStudio';

describe('VisualPublishingStudio Registry Integration Defaults', () => {
  it('renders classic-ancestor-poster defaults in English correctly with preview telemetry', () => {
    render(<VisualPublishingStudio language="en" />);

    // Main title
    expect(screen.getByText('Visual Publishing Studio')).toBeInTheDocument();

    // Preview Pane displays classic-ancestor-poster title & description from registry
    const previewPane = screen.getByTestId('visual-studio-preview-pane');
    expect(within(previewPane).getByRole('heading', { level: 5, name: 'Classic Ancestor Poster' })).toBeInTheDocument();
    expect(
      within(previewPane).getByText('Traditional cozy poster design featuring warm vintage tones (4 generations), perfect for print and framing.')
    ).toBeInTheDocument();

    // Verify preview frame accessibility and mockup structure
    const previewFrame = screen.getByTestId('visual-preview-frame');
    expect(previewFrame).toBeInTheDocument();
    expect(previewFrame).toHaveAttribute('aria-label', 'Preview of Classic Ancestor Poster');
    expect(screen.getByTestId('poster-preview-composition')).toBeInTheDocument();

    // Verify Telemetry counts and truncation badges in the Preview Pane
    expect(within(previewPane).getByText(/Preview nodes: 5/i)).toBeInTheDocument();
    expect(within(previewPane).getByText(/Preview limited/i)).toBeInTheDocument();

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

    // Verify Telemetry Panel specifications inside Config Panel
    expect(screen.getByTestId('visual-studio-telemetry-panel')).toBeInTheDocument();
    expect(screen.getByText('Preview Mode')).toBeInTheDocument();
    expect(screen.getByText('static-mock')).toBeInTheDocument();
    expect(screen.getByText('Privacy Level')).toBeInTheDocument();
    expect(screen.getByText('masked')).toBeInTheDocument();
    expect(screen.getByText('Rendered Nodes')).toBeInTheDocument();
    expect(screen.getByText('Truncation Status')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();

    // Verify Telemetry warning list
    expect(screen.getByTestId('visual-studio-telemetry-warnings')).toBeInTheDocument();
    expect(screen.getByText(/Preview nodes count truncated/i)).toBeInTheDocument();

    // Action Bar displays disabled buttons
    expect(screen.getByTestId('visual-studio-action-bar')).toBeInTheDocument();
    const previewBtn = screen.getByRole('button', { name: /Studio Preview/i });
    const pngBtn = screen.getByRole('button', { name: /Export PNG/i });
    const pdfBtn = screen.getByRole('button', { name: /Export PDF/i });

    expect(previewBtn).toBeDisabled();
    expect(pngBtn).toBeDisabled();
    expect(pdfBtn).toBeDisabled();
  });

  it('renders classic-ancestor-poster defaults in Arabic correctly with telemetry', () => {
    render(<VisualPublishingStudio language="ar" />);

    // Main title
    expect(screen.getByText('استوديو النشر البصري')).toBeInTheDocument();

    // Preview Pane displays Arabic display name & description from registry
    const previewPane = screen.getByTestId('visual-studio-preview-pane');
    expect(within(previewPane).getByRole('heading', { level: 5, name: 'شجرة الأسلاف الكلاسيكية الدافئة' })).toBeInTheDocument();
    expect(
      within(previewPane).getByText('تصميم بوستر تقليدي مريح للعين، يعتمد على نبرات لونية هادئة (4 أجيال)، ملائم للطباعة الورقية والتأطير.')
    ).toBeInTheDocument();

    // Verify Arabic accessibility alt mapping
    const previewFrame = screen.getByTestId('visual-preview-frame');
    expect(previewFrame).toHaveAttribute('aria-label', 'معاينة بوستر الأسلاف الكلاسيكي');

    // Verify Arabic Telemetry in Preview Pane
    expect(within(previewPane).getByText(/العقد في المعاينة: 5/i)).toBeInTheDocument();
    expect(within(previewPane).getByText(/المعاينة محدودة/i)).toBeInTheDocument();

    // Config Panel displays Arabic titles with registry values
    expect(screen.getByText('نوع المنتج')).toBeInTheDocument();
    expect(screen.getByText('القالب المعرف')).toBeInTheDocument();
    expect(screen.getByText('محرك التخطيط')).toBeInTheDocument();
    expect(screen.getByText('استراتيجية القراءة')).toBeInTheDocument();

    // Verify Arabic Telemetry Panel
    expect(screen.getByText('وضع المعاينة')).toBeInTheDocument();
    expect(screen.getByText('مستوى الخصوصية')).toBeInTheDocument();
    expect(screen.getByText('العقد المعروضة')).toBeInTheDocument();
    expect(screen.getByText('حالة الاقتصاص')).toBeInTheDocument();
    expect(screen.getByText('نعم')).toBeInTheDocument();
  });

  it('updates state dynamically and changes telemetry counts when selecting templates', () => {
    render(<VisualPublishingStudio language="en" />);

    const previewPane = screen.getByTestId('visual-studio-preview-pane');
    const selectors = screen.getByTestId('visual-studio-template-selectors');
    const previewFrame = screen.getByTestId('visual-preview-frame');

    // Click on "Modern Ancestor Poster" button inside template selectors
    const modernBtn = within(selectors).getByRole('button', { name: 'Modern Ancestor Poster' });
    fireEvent.click(modernBtn);

    // Verify it updates Preview Pane title and description
    expect(within(previewPane).getByRole('heading', { level: 5, name: 'Modern Ancestor Poster' })).toBeInTheDocument();
    expect(within(previewPane).getByText(/Modern dark-themed poster design utilizing contrasting elements/i)).toBeInTheDocument();
    expect(screen.getByText('modern-ancestor')).toBeInTheDocument();
    expect(screen.getByTestId('poster-preview-composition')).toBeInTheDocument();
    expect(previewFrame).toHaveAttribute('aria-label', 'Preview of Modern Ancestor Poster');

    // Verify Modern Poster Telemetry (still truncated to 5)
    expect(within(previewPane).getByText(/Preview nodes: 5/i)).toBeInTheDocument();
    expect(within(previewPane).getByText(/Preview limited/i)).toBeInTheDocument();

    // Click on "Current Tree Snapshot" button inside template selectors
    const snapshotBtn = within(selectors).getByRole('button', { name: 'Current Tree Snapshot' });
    fireEvent.click(snapshotBtn);

    // Verify it updates fields to snapshot specs
    expect(within(previewPane).getByRole('heading', { level: 5, name: 'Current Tree Snapshot' })).toBeInTheDocument();
    expect(screen.getByText('tree-layout')).toBeInTheDocument();
    expect(screen.getByText('narrative')).toBeInTheDocument();
    expect(screen.getByText('viewport')).toBeInTheDocument();
    expect(screen.getByTestId('snapshot-preview-composition')).toBeInTheDocument();
    expect(previewFrame).toHaveAttribute('aria-label', 'Preview of Current Tree Snapshot');

    // Verify Snapshot Telemetry (3 nodes < 5 cap, so NOT truncated)
    expect(within(previewPane).getByText(/Preview nodes: 3/i)).toBeInTheDocument();
    expect(within(previewPane).queryByText(/Preview limited/i)).not.toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument(); // Truncation Status is No

    // Verify buttons remain disabled
    const pngBtn = screen.getByRole('button', { name: /Export PNG/i });
    expect(pngBtn).toBeDisabled();
  });

  it('hides Action Bar when isPreviewOnly is true', () => {
    render(<VisualPublishingStudio language="en" isPreviewOnly={true} />);

    expect(screen.queryByTestId('visual-studio-action-bar')).not.toBeInTheDocument();
  });
});
