import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { getVisualOutputDefinition, type PrintQualityReport } from '../../../../publishing';
import { VisualOutputActionBar } from '../VisualOutputActionBar';

const definition = getVisualOutputDefinition('classic-ancestor-poster');

function quality(status: PrintQualityReport['status']): PrintQualityReport {
  return {
    status,
    evaluated: status !== 'not-evaluated',
    warnings: status === 'pass' ? [] : ['poster.quality.fixture'],
    metrics: {},
  };
}

describe('VisualOutputActionBar print-quality gate', () => {
  it('keeps poster downloads available when print quality passes', () => {
    render(
      <VisualOutputActionBar
        language="en"
        selectedDefinition={definition}
        quality={quality('pass')}
        onExportSvg={vi.fn()}
        onExportPng={vi.fn()}
        onExportPdf={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Download SVG' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Download PNG' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Download PDF' })).toBeEnabled();
    expect(screen.getByTestId('poster-format-guidance')).toHaveTextContent(
      'Choose SVG for large-format vector printing'
    );
    expect(screen.getByRole('button', { name: 'Download SVG' })).toHaveAttribute(
      'aria-describedby',
      'poster-format-guidance'
    );
    expect(screen.queryByTestId('poster-print-quality-notice')).not.toBeInTheDocument();
    expect(screen.getByTestId('visual-studio-export-status-live-region')).toHaveTextContent(
      'Studio ready for export'
    );
  });

  it('explains the three formats in Arabic without presenting the PDF as vector', () => {
    render(
      <VisualOutputActionBar
        language="ar"
        selectedDefinition={definition}
        quality={quality('pass')}
        onExportSvg={vi.fn()}
        onExportPng={vi.fn()}
        onExportPdf={vi.fn()}
      />
    );

    expect(screen.getByTestId('poster-format-guidance')).toHaveTextContent(
      'اختر SVG للطباعة الكبيرة والدقة المتجهة'
    );
    expect(screen.getByTestId('poster-format-guidance')).toHaveTextContent(
      'PDF نسخة نقطية من نفس التصميم'
    );
    expect(screen.getByRole('button', { name: 'تنزيل SVG' })).toHaveAttribute(
      'title',
      'الأفضل للطباعة الكبيرة'
    );
  });

  it('renders all 5 large-tree action buttons when available in full-tree scope', () => {
    const onExportSvg = vi.fn();
    const onExportPng = vi.fn();
    const onExportPdf = vi.fn();
    const onExportBranchCollection = vi.fn();
    const onExportTiledWall = vi.fn();

    render(
      <VisualOutputActionBar
        language="ar"
        selectedDefinition={definition}
        quality={quality('pass')}
        branchCollectionAvailable={true}
        tiledWallAvailable={true}
        onExportSvg={onExportSvg}
        onExportPng={onExportPng}
        onExportPdf={onExportPdf}
        onExportBranchCollection={onExportBranchCollection}
        onExportTiledWall={onExportTiledWall}
      />
    );

    expect(screen.getByRole('button', { name: 'تنزيل SVG' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'تنزيل PNG' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'تنزيل PDF' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'تنزيل مجموعة الفروع' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'تنزيل لوحة مقسمة' })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'تنزيل مجموعة الفروع' }));
    expect(onExportBranchCollection).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole('button', { name: 'تنزيل لوحة مقسمة' }));
    expect(onExportTiledWall).toHaveBeenCalledOnce();
  });

  it('blocks downloads and explains an unreadable print layout without technical codes', () => {
    render(
      <VisualOutputActionBar
        language="en"
        selectedDefinition={definition}
        quality={quality('blocked')}
        onExportSvg={vi.fn()}
        onExportPng={vi.fn()}
        onExportPdf={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Download SVG' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Download PNG' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Download PDF' })).toBeDisabled();
    expect(screen.getByTestId('poster-print-quality-notice')).toHaveTextContent(
      'Reduce generations or choose a larger page'
    );
    expect(screen.getByTestId('poster-print-quality-notice')).not.toHaveTextContent('poster.quality');
    expect(screen.getByTestId('visual-studio-export-status-live-region')).toHaveTextContent(
      'Poster export is blocked until the print quality issue is resolved'
    );
    expect(screen.getByTestId('visual-studio-export-status-live-region')).not.toHaveTextContent(
      'Studio ready for export'
    );
  });

  it('offers reversible preview routes without starting an export', () => {
    const onUseDensePreset = vi.fn();
    const onUseLargestPage = vi.fn();
    const onSetUpLargeTreeProducts = vi.fn();
    const onExportPng = vi.fn();

    render(
      <VisualOutputActionBar
        language="en"
        selectedDefinition={definition}
        quality={quality('blocked')}
        onExportPng={onExportPng}
        onExportPdf={vi.fn()}
        onUseDensePreset={onUseDensePreset}
        onUseLargestPage={onUseLargestPage}
        onSetUpLargeTreeProducts={onSetUpLargeTreeProducts}
      />
    );

    expect(screen.getByTestId('poster-large-tree-guidance')).toHaveTextContent(
      'only adjust the preview settings'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Use Dense Genealogy' }));
    fireEvent.click(screen.getByRole('button', { name: 'Try A0 landscape' }));
    fireEvent.click(screen.getByRole('button', { name: 'Set up large-tree products' }));

    expect(onUseDensePreset).toHaveBeenCalledOnce();
    expect(onUseLargestPage).toHaveBeenCalledOnce();
    expect(onSetUpLargeTreeProducts).toHaveBeenCalledOnce();
    expect(onExportPng).not.toHaveBeenCalled();
  });
});
