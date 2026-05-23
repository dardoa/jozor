import { describe, expect, it } from 'vitest';
import { normalizeChartType } from '../chartTypeAdapter';

describe('normalizeChartType legacy normalization', () => {
    it('normalizes legacy "descendant" chart type to "focus"', () => {
        expect(normalizeChartType('descendant')).toBe('focus');
    });

    it('normalizes legacy "force" chart type to "focus"', () => {
        expect(normalizeChartType('force')).toBe('focus');
    });

    it('normalizes "radial" to "radial"', () => {
        expect(normalizeChartType('radial')).toBe('radial');
    });

    it('normalizes "focus" to "focus"', () => {
        expect(normalizeChartType('focus')).toBe('focus');
    });

    it('handles undefined/null and defaults to "focus"', () => {
        expect(normalizeChartType(undefined)).toBe('focus');
        expect(normalizeChartType(null)).toBe('focus');
    });
});
