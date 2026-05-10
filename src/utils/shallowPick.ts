/**
 * shallowPickEqual — compares only the specified keys of two objects using strict equality.
 *
 * Preferred over a full shallow-equal when only a known subset of keys
 * are relevant (e.g. the fields that trigger a re-render in NodeComponent).
 *
 * TypeScript will error if any key in `keys` does not exist on type `T`,
 * giving us compile-time safety against forgotten fields.
 *
 * @example
 * const NODE_KEYS = ['showPhotos', 'textSize'] as const satisfies ReadonlyArray<keyof TreeSettings>;
 * const isEqual = shallowPickEqual(prev, next, NODE_KEYS);
 */
export const shallowPickEqual = <T extends object>(
    prev: T,
    next: T,
    keys: ReadonlyArray<keyof T>,
): boolean => keys.every(k => prev[k] === next[k]);
