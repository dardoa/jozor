import { TreeSettings } from '../types';

/**
 * Generates a unique key representing the physical geometry/layout constraints of the tree.
 * Used for caching and triggering recalculations when layout-impacting settings change.
 */
export function generateGeometryKey(params: {
    focusId: string;
    settings: TreeSettings;
    peopleVersion: number;
    collapsedIds: string[];
}): string {
    const {
        focusId,
        settings,
        peopleVersion,
        collapsedIds,
    } = params;
    
    // Mobile optimization logic for key generation
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const effectiveGenLimit = isMobile ? Math.min(settings.generationLimit, 3) : settings.generationLimit;

    const routingAndFeatureInputs = {
        chartType: settings.chartType,
    };

    const layoutGeometrySettings = {
        layoutMode: settings.layoutMode,
        isCompact: settings.isCompact,
        nodeSpacingX: settings.nodeSpacingX,
        nodeSpacingY: settings.nodeSpacingY,
        generationLimit: effectiveGenLimit,
    };

    const geometrySettings = {
        ...routingAndFeatureInputs,
        ...layoutGeometrySettings,
    };

    return JSON.stringify({
        focusId,
        settings: geometrySettings,
        peopleVersion,
        collapsedIds: collapsedIds.sort() // Ensure stable order
    });
}
