import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ConfidenceBadge } from '../components/ConfidenceBadge';

describe('ConfidenceBadge', () => {
  it('renders the strong match label', () => {
    render(<ConfidenceBadge matchLevel="strong" />);

    expect(screen.getByText('تطابق قوي')).toBeInTheDocument();
  });

  it('renders the medium match label', () => {
    render(<ConfidenceBadge matchLevel="medium" />);

    expect(screen.getByText('نتيجة قريبة')).toBeInTheDocument();
  });
});
