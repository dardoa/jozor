import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it } from 'vitest';
import { VisualPublishingStudio } from '../VisualPublishingStudio';

describe('VisualPublishingStudio Registry Integration Defaults', () => {
  it('renders classic-ancestor-poster defaults in English correctly', () => {
    render(<VisualPublishingStudio language="en" />);

    // Main title
    expect(screen.getByText('Visual Publishing Studio')).toBeInTheDocument();

    // Preview Pane displays classic-ancestor-poster title & description from registry
    expect(screen.getByTestId('visual-studio-preview-pane')).toBeInTheDocument();
    expect(screen.getByText('Classic Ancestor Poster')).toBeInTheDocument();
    expect(
      screen.getByText('Traditional cozy poster design featuring warm vintage tones (4 generations), perfect for print and framing.')
    ).toBeInTheDocument();
    expect(screen.getByText(/Preview type: placeholder/i)).toBeInTheDocument();

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
    expect(screen.getByText('شجرة الأسلاف الكلاسيكية الدافئة')).toBeInTheDocument();
    expect(
      screen.getByText('تصميم بوستر تقليدي مريح للعين، يعتمد على نبرات لونية هادئة (4 أجيال)، ملائم للطباعة الورقية والتأطير.')
    ).toBeInTheDocument();
    expect(screen.getByText(/نوع المعاينة: placeholder/i)).toBeInTheDocument();

    // Config Panel displays Arabic titles with registry values
    expect(screen.getByText('نوع المنتج')).toBeInTheDocument();
    expect(screen.getByText('القالب المعرف')).toBeInTheDocument();
    expect(screen.getByText('محرك التخطيط')).toBeInTheDocument();
    expect(screen.getByText('استراتيجية القراءة')).toBeInTheDocument();
  });

  it('hides Action Bar when isPreviewOnly is true', () => {
    render(<VisualPublishingStudio language="en" isPreviewOnly={true} />);

    expect(screen.queryByTestId('visual-studio-action-bar')).not.toBeInTheDocument();
  });
});
