import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VisualOutputPreviewPane } from '../VisualOutputPreviewPane';

describe('VisualOutputPreviewPane presentation semantics', () => {
  it('keeps the active scene title when layout capacity prevents PosterScene creation', () => {
    render(
      <VisualOutputPreviewPane
        language="ar"
        presentationTitle="شجرة الأحفاد الشعاعية"
        unavailableReason="تجاوز التخطيط سعة الصفحة."
      />
    );

    expect(screen.getByTestId('visual-preview-frame')).toHaveAccessibleName('معاينة شجرة الأحفاد الشعاعية');
    expect(screen.getByTestId('poster-preview-unavailable')).toBeInTheDocument();
    expect(screen.getByText('تجاوز التخطيط سعة الصفحة.')).toBeInTheDocument();
  });
});
