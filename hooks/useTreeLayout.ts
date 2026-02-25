import { useState, useEffect, useRef } from 'react';
import { Person, TreeSettings, TreeNode, TreeLink } from '../types';
import { CollapsePoint } from '../utils/treeLayout';
// Import worker using Vite's special syntax (IDE may warn, works fine at runtime)
// @ts-expect-error Vite ?worker imports are not resolvable by tsc
import LayoutWorker from '../utils/layout.worker?worker';

interface TreeLayoutResult {
    nodes: TreeNode[];
    links: TreeLink[];
    collapsePoints: CollapsePoint[];
}

export const useTreeLayout = (
    people: Record<string, Person>,
    focusId: string,
    settings: TreeSettings,
    collapsedIds: Set<string>
) => {

    const [layoutData, setLayoutData] = useState<TreeLayoutResult>({
        nodes: [],
        links: [],
        collapsePoints: [],
    });
    const [isCalculating, setIsCalculating] = useState(false);

    // Use a ref to keep the worker instance persistent
    const workerRef = useRef<Worker | null>(null);

    useEffect(() => {
        // Initialize worker
        workerRef.current = new LayoutWorker();

        // @ts-expect-error workerRef is initialised in the effect above
        workerRef.current.onmessage = (e: MessageEvent) => {
            const { type, result, error } = e.data;
            if (type === 'success') {
                setLayoutData(result);
                setIsCalculating(false);
            } else {
                console.error('Tree Layout Worker Error:', error);
                setIsCalculating(false);
            }
        };

        return () => {
            workerRef.current?.terminate();
        };
    }, []);

    const settingsKey = `${settings.chartType}-${settings.layoutMode}-${settings.isCompact}-${settings.nodeSpacingX}-${settings.nodeSpacingY}-${settings.isRtl}`;
    const collapsedIdsKey = Array.from(collapsedIds).sort().join(',');

    useEffect(() => {
        if (!workerRef.current) return;

        // Only calculate if we have data
        if (Object.keys(people).length === 0) return;

        if (!isCalculating) setTimeout(() => setIsCalculating(true), 0);

        // Auto-compact logic: Calculate safe node width based on longest name string
        let effectiveSpacingX = settings.nodeSpacingX;
        if (settings.isCompact) {
            let maxNameLen = 0;
            Object.values(people).forEach(p => {
                const len = (p.firstName?.length || 0) + (p.lastName?.length || 0) + 1;
                if (len > maxNameLen) maxNameLen = len;
            });
            // Approximate 8px per character + 40px buffer for avatar/icons, min 180, max 300
            effectiveSpacingX = Math.max(180, Math.min(300, maxNameLen * 8 + 40));
        }

        const effectiveSettings = { ...settings, nodeSpacingX: effectiveSpacingX };

        // Extract only topological and mathematical fields for the layout worker to prevent structured-cloning overhead of heavy biography/photo objects.
        const minimalPeople: Record<string, any> = {};
        Object.values(people).forEach(p => {
            minimalPeople[p.id] = {
                id: p.id,
                firstName: p.firstName, // Needed for auto-compact len calculation if done in worker later
                lastName: p.lastName,
                gender: p.gender,
                parents: p.parents || [],
                spouses: p.spouses || [],
                children: p.children || [],
                birthDate: p.birthDate,
                deathDate: p.deathDate,
                isDeceased: p.isDeceased
            };
        });

        // Pass plain data to worker. Convert Set to Array for safe messaging.
        workerRef.current.postMessage({
            people: minimalPeople,
            focusId,
            settings: effectiveSettings,
            collapsedIds: Array.from(collapsedIds),
        });

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [people, focusId, settingsKey, collapsedIdsKey]);

    return { ...layoutData, isCalculating };
};
