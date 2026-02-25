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
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '20px',
    full: '9999px',
};

export const SHADOWS = {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    glass: '0 4px 20px -5px rgba(0, 0, 0, 0.1), 0 2px 10px -5px rgba(0, 0, 0, 0.05)',
    glassDeep: '0 20px 40px -10px rgba(0, 0, 0, 0.3)',
};

export const TOKENS = {
    ANIMATIONS: DURATIONS,
    EASING,
    RADIUS: RADII,
    SHADOWS,
};
