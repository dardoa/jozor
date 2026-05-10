/**
 * Design Tokens for Jozor 1.1
 * Centralized constants for UI consistency.
 */

export const DURATIONS = {
    short: 150,
    base: 300,
    long: 500,
    extraLong: 800,
};

export const EASING = {
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
    decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
    accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
    sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
    outQuint: 'cubic-bezier(0.23, 1, 0.32, 1)',
    inOutBack: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',
};

export const RADII = {
    none: '0px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    full: '9999px',
};

export const SHADOWS = {
    sm: '0 2px 8px rgba(91, 77, 61, 0.08)',
    base: '0 12px 28px rgba(91, 77, 61, 0.12)',
    lg: '0 24px 48px rgba(91, 77, 61, 0.16)',
    glass: '0 18px 40px rgba(91, 77, 61, 0.14)',
    glassDeep: '0 28px 56px rgba(91, 77, 61, 0.18)',
};

export const TOKENS = {
    ANIMATIONS: DURATIONS,
    EASING,
    RADIUS: RADII,
    SHADOWS,
};
