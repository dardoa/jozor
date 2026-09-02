import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';

import { helpAr } from '../../utils/translations/ar/help';
import { HelpCenter } from '../HelpCenter';

vi.mock('../../context/TranslationContext', () => ({
  useTranslation: () => ({ t: { help: helpAr } }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('../info/InfoPageLayout', () => ({
  InfoPageLayout: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

describe('HelpCenter', () => {
  it('documents current tree controls with auditable topic metadata', () => {
    render(<HelpCenter />);

    const viewModes = screen.getByRole('button', { name: 'التنقل وطرق العرض الأساسية' });
    expect(viewModes).toHaveAttribute('data-help-topic', 'tree-view-modes');
    expect(viewModes).toHaveAttribute('data-help-route', '/tree/:treeId');
    expect(viewModes).toHaveAttribute('data-help-control', 'visual-preferences-trigger');
    expect(viewModes).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(viewModes);

    expect(viewModes).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/اختيار «التركيز»/)).toBeInTheDocument();
    expect(screen.getByText(/«إعادة الضبط»/)).toBeInTheDocument();
    expect(screen.queryByText(/عرض "السلالة"/)).not.toBeInTheDocument();
  });
});
