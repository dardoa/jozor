import { AppearanceState } from '../store/useTreeAppearanceStore';
import { TreeSettings } from '../types';
import { normalizeChartType } from './chartTypeAdapter';

export const mapAppearanceLabStateToTreeSettings = (
    appearanceState: AppearanceState
): Partial<TreeSettings> => {
    const { coreEngine, layout, contentVisibility, advanced } = appearanceState;
    const treeMode = normalizeChartType(coreEngine.treeMode);
    const expectedLayoutMode = treeMode === 'radial' ? 'radial' : coreEngine.orientation;

    return {
        chartType: treeMode,
        layoutMode: expectedLayoutMode,
        nodeWidth: layout.zoom,
        nodeSpacingX: layout.horizontalSpread,
        nodeSpacingY: layout.verticalSpread,

        showMaidenName: false,
        showPrefix: false,

        showPhotos: contentVisibility.photos,
        showDates: contentVisibility.dates.enabled,
        showBirthDate: contentVisibility.dates.birth,
        showDeathDate: contentVisibility.dates.death,
        showMarriageDate: contentVisibility.dates.marriage,
        showBirthPlace: contentVisibility.places.birthPlace,
        showMarriagePlace: contentVisibility.places.marriagePlace,
        showBurialPlace: contentVisibility.places.burialPlace,
        showFirstName: contentVisibility.names.showBaseName,
        showLastName: contentVisibility.names.showBaseName,
        showMiddleName: contentVisibility.names.showMiddleName,
        showNickname: contentVisibility.names.showNickname,
        showSuffix: contentVisibility.names.showSuffix,

        textSize: advanced.nodeDetails.textSize,
        generationLimit: advanced.nodeDetails.generationLimit,
        isCompact: advanced.nodeDetails.compactNodes,
        lineStyle: advanced.nodeDetails.lineStyle,
        lineThickness: advanced.nodeDetails.lineThickness,
        boxColorLogic: advanced.nodeDetails.boxColorLogic,
        highlightBranch: advanced.layoutEngine.highlightBranch,
        highlightedBranchRootId: advanced.layoutEngine.highlightedBranchRootId,
    };
};
