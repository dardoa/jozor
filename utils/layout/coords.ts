import * as d3 from 'd3';
import { Person, TreeSettings } from '../../types';
import { getBirthYear } from './helpers';

export interface CustomHierarchyDatum {
    id: string;
    person: Person;
    children?: CustomHierarchyDatum[];
    groupIndex?: number;
    staggerLevel?: number;
    gridRow?: number;
    gridCol?: number;
    familyPodId?: string;
    motherId?: string;
    isReference?: boolean;
}

export const getPointCoords = (
    d: d3.HierarchyPointNode<CustomHierarchyDatum>,
    settings: TreeSettings,
    oldestBirthYear: number,
    offsetX = 0,
    offsetY = 0,
    totalBreadth = 1,
    minX = 0
): { x: number; y: number } => {
    const isVertical = settings.layoutMode === 'vertical';
    const isRadial = settings.layoutMode === 'radial';
    const timeScaleFactor = settings.timeScaleFactor || 5;

    let finalX: number;
    let finalY: number;

    if (isRadial) {
        // Dynamic radial map avoiding magic numbers.
        // Normalize d.x into an angle around the circle.
        const normalizedX = d.x - minX;
        const angle = (normalizedX / totalBreadth) * 2 * Math.PI - Math.PI / 2; // Start from top

        // Dynamic radius based on depth
        const levelDistance = settings.isCompact ? 180 : 250;
        const radius = d.depth * levelDistance + 100; // Inner offset of 100

        finalX = Math.cos(angle) * (radius + offsetY) + offsetX;
        finalY = Math.sin(angle) * (radius + offsetY);
    } else if (isVertical) {
        finalX = d.x + offsetX;
        finalY = d.y + offsetY;
    } else {
        // Horizontal: swap x and y, and invert X for RTL
        finalX = (settings.isRtl ? -d.y : d.y) + offsetY;
        finalY = d.x + offsetX;
    }

    if (settings.enableTimeOffset && !isRadial) {
        const personBirthYear = getBirthYear(d.data.person);
        if (personBirthYear !== 9999 && oldestBirthYear !== Infinity) {
            // Ensure spacing is numeric to prevent logic errors
            const vSpacing = Number(settings.nodeSpacingY) || 300;

            // scalePerYear: Sliders usually range 20-500. 
            // We want a clear separation. 10px per year is a good baseline.
            const scalePerYear = vSpacing / 50;

            let timeOffset = (personBirthYear - oldestBirthYear) * scalePerYear;

            // Safety rail: Prevent NaN or infinite offsets from breaking the render
            if (isNaN(timeOffset) || !isFinite(timeOffset)) timeOffset = 0;

            if (isVertical) {
                // Ensure generational depth (d.y) is at least partially respected or buffered
                // so that we don't get total overlap if many people share a birth year.
                // We space out people in the same year by using a fraction of their d.x
                const layoutBuffer = (d.x % 100); // Unique shift based on their horizontal hierarchy position
                finalY = timeOffset + offsetY + layoutBuffer;
            } else {
                const layoutBuffer = (d.y % 100);
                finalX = (settings.isRtl ? -timeOffset : timeOffset) + offsetX + (settings.isRtl ? -layoutBuffer : layoutBuffer);
            }
        }
    }

    return { x: finalX, y: finalY };
};
