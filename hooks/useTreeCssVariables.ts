import { useShallow } from 'zustand/react/shallow';
import { useTreeAppearanceStore } from '../store/useTreeAppearanceStore';

type TreeThemeVariant = 'heritage' | 'modernPure' | 'artistic' | 'custom';

type TreeVisualBaseContract = {
    nodeRadius: string;
    lineWidth: string;
    borderWidth: string;
    nodeShadow: string;
    canvasOverlay: string;
};

type TreeThemeTokens = {
    canvasBg: string;
    nodeBg: string;
    nodeBorder: string;
    lineColor: string;
    avatarBorder: string;
    avatarBg: string;
    textPrimary: string;
    textSecondary: string;
    badgeBg: string;
    badgeText: string;
    collapseBg: string;
    collapseBorder: string;
    collapseIcon: string;
    shadowFlavor: string;
};

const BASE_VISUAL_CONTRACT: TreeVisualBaseContract = {
    // Base Default Visual System: shared structure across all themes.
    nodeRadius: '14px',
    lineWidth: '1.5px',
    borderWidth: '1px',
    nodeShadow: '0 10px 24px rgba(31, 23, 16, 0.08)',
    canvasOverlay: 'radial-gradient(circle at top, rgba(255,255,255,0.32), transparent 52%)',
};

const TREE_THEME_VARIANTS: Record<Exclude<TreeThemeVariant, 'custom'>, TreeThemeTokens> = {
    heritage: {
        canvasBg: '#F5EFE6',
        nodeBg: '#FBF6EF',
        nodeBorder: '#D9C8B5',
        lineColor: '#C8AE93',
        avatarBorder: '#D9C8B5',
        avatarBg: '#F1E7D8',
        textPrimary: '#3E2F24',
        textSecondary: '#7C695A',
        badgeBg: '#A98559',
        badgeText: '#FFFDF8',
        collapseBg: '#F4EBDD',
        collapseBorder: '#C8AE93',
        collapseIcon: '#8A6A43',
        shadowFlavor: '0 8px 18px rgba(109, 82, 56, 0.08)',
    },
    modernPure: {
        canvasBg: '#F7FAFC',
        nodeBg: '#FFFFFF',
        nodeBorder: '#D9E2EC',
        lineColor: '#B8C7D8',
        avatarBorder: '#D9E2EC',
        avatarBg: '#F2F7FB',
        textPrimary: '#102133',
        textSecondary: '#60758A',
        badgeBg: '#2F6FED',
        badgeText: '#FFFFFF',
        collapseBg: '#FFFFFF',
        collapseBorder: '#C6D4E3',
        collapseIcon: '#3564B5',
        shadowFlavor: '0 14px 28px rgba(15, 23, 42, 0.10)',
    },
    artistic: {
        canvasBg: '#F7F1FA',
        nodeBg: '#FFF8FC',
        nodeBorder: '#DDBCE9',
        lineColor: '#B98FCC',
        avatarBorder: '#DDBCE9',
        avatarBg: '#F6EAF7',
        textPrimary: '#4E325D',
        textSecondary: '#8A689A',
        badgeBg: '#7B57C8',
        badgeText: '#FFFFFF',
        collapseBg: '#F8ECFF',
        collapseBorder: '#C79DDA',
        collapseIcon: '#7B57C8',
        shadowFlavor: '0 16px 30px rgba(123, 87, 200, 0.14)',
    },
};

const resolveThemeTokens = (themeStyle: TreeThemeVariant): TreeThemeTokens => {
    if (themeStyle === 'custom') {
        return TREE_THEME_VARIANTS.heritage;
    }

    return TREE_THEME_VARIANTS[themeStyle];
};

/**
 * Base + Variant mapper for tree-scoped visual tokens.
 *
 * Ownership boundary:
 * - Base contract: fixed card/avatar/badge/connector language
 * - Theme variant: color identity only
 * - Layout / geometry: explicitly excluded
 */
export const useTreeCssVariables = (): React.CSSProperties => {
    return useTreeAppearanceStore(
        useShallow(({ theme, advanced, appearance }) => {
            const variant = resolveThemeTokens(theme.themeStyle);
            const nodeRadius = appearance.cornerRadius
                ? `${appearance.cornerRadius}px`
                : BASE_VISUAL_CONTRACT.nodeRadius;

            return {
                '--tree-canvas-bg': variant.canvasBg,
                '--tree-canvas-overlay': BASE_VISUAL_CONTRACT.canvasOverlay,
                '--tree-node-bg': variant.nodeBg,
                '--tree-node-border': variant.nodeBorder,
                '--tree-node-border-width': BASE_VISUAL_CONTRACT.borderWidth,
                '--tree-line-color': variant.lineColor,
                '--tree-line-width': `${advanced.nodeDetails.lineThickness || 1.5}px`,
                '--tree-node-radius': nodeRadius,
                '--tree-node-shadow': variant.shadowFlavor || BASE_VISUAL_CONTRACT.nodeShadow,
                '--tree-avatar-border': variant.avatarBorder,
                '--tree-avatar-bg': variant.avatarBg,
                '--tree-text-primary': variant.textPrimary,
                '--tree-text-secondary': variant.textSecondary,
                '--tree-badge-bg': variant.badgeBg,
                '--tree-badge-text': variant.badgeText,
                '--tree-collapse-bg': variant.collapseBg,
                '--tree-collapse-border': variant.collapseBorder,
                '--tree-collapse-icon': variant.collapseIcon,
            } as React.CSSProperties;
        })
    );
};
