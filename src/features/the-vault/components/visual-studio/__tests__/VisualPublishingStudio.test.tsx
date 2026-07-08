import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it } from 'vitest';
import { VisualPublishingStudio } from '../VisualPublishingStudio';

describe('VisualPublishingStudio Shell Scaffolding', () => {
  it('renders all sections and texts in English correctly', () => {
    render(<VisualPublishingStudio language="en" />);

    // Main title & desc
    expect(screen.getByText('Visual Publishing Studio')).toBeInTheDocument();
    expect(screen.getByText(/Design and configure family tree charts/i)).toBeInTheDocument();

    // Readiness notice
    expect(screen.getByTestId('visual-studio-readiness-notice')).toBeInTheDocument();
    expect(screen.getByText(/Studio shell preview. Current exports remain available below./i)).toBeInTheDocument();

    // Preview Pane
    expect(screen.getByTestId('visual-studio-preview-pane')).toBeInTheDocument();
    expect(screen.getByText('Visual preview will appear here')).toBeInTheDocument();

    // Config Panel
    expect(screen.getByTestId('visual-studio-config-panel')).toBeInTheDocument();
    expect(screen.getByText('Product')).toBeInTheDocument();
    expect(screen.getByText('Template')).toBeInTheDocument();
    expect(screen.getByText('Layout')).toBeInTheDocument();
    expect(screen.getByText('Scope')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();

    // Action Bar
    expect(screen.getByTestId('visual-studio-action-bar')).toBeInTheDocument();
    expect(screen.getByText('Studio actions are not active yet')).toBeInTheDocument();

    // Buttons are disabled
    const previewBtn = screen.getByRole('button', { name: /Studio Preview/i });
    const pngBtn = screen.getByRole('button', { name: /Export PNG/i });
    const pdfBtn = screen.getByRole('button', { name: /Export PDF/i });

    expect(previewBtn).toBeDisabled();
    expect(pngBtn).toBeDisabled();
    expect(pdfBtn).toBeDisabled();
  });

  it('renders all sections and texts in Arabic correctly', () => {
    render(<VisualPublishingStudio language="ar" />);

    // Main title
    expect(screen.getByText('استوديو النشر البصري')).toBeInTheDocument();

    // Readiness notice
    expect(screen.getByText(/معاينة هيكل الاستوديو. التصديرات الحالية ما زالت متاحة أدناه./i)).toBeInTheDocument();

    // Preview Pane
    expect(screen.getByText('ستظهر المعاينة البصرية هنا')).toBeInTheDocument();

    // Config Panel
    expect(screen.getByText('المنتج')).toBeInTheDocument();
    expect(screen.getByText('القالب')).toBeInTheDocument();
    expect(screen.getByText('التخطيط')).toBeInTheDocument();
    expect(screen.getByText('النطاق')).toBeInTheDocument();
    expect(screen.getByText('المحتوى')).toBeInTheDocument();

    // Action Bar
    expect(screen.getByText('إجراءات الاستوديو غير مفعلة بعد')).toBeInTheDocument();
  });

  it('hides Action Bar when isPreviewOnly is true', () => {
    render(<VisualPublishingStudio language="en" isPreviewOnly={true} />);

    expect(screen.queryByTestId('visual-studio-action-bar')).not.toBeInTheDocument();
  });
});
