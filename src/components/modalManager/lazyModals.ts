import { lazy } from 'react';

export const LinkPersonModal = lazy(() =>
  import('../LinkPersonModal').then((module) => ({ default: module.LinkPersonModal }))
);
export const CleanTreeOptionsModal = lazy(() =>
  import('../CleanTreeOptionsModal').then((module) => ({ default: module.CleanTreeOptionsModal }))
);
export const GoogleSyncChoiceModal = lazy(() =>
  import('../GoogleSyncChoiceModal').then((module) => ({ default: module.GoogleSyncChoiceModal }))
);
export const SharedTreePromptModal = lazy(() =>
  import('../SharedTreePromptModal').then((module) => ({ default: module.SharedTreePromptModal }))
);
export const RelationshipModal = lazy(() =>
  import('../RelationshipModal').then((module) => ({ default: module.RelationshipModal }))
);
export const StatisticsDashboard = lazy(() =>
  import('../statistics/StatisticsDashboard').then((module) => ({ default: module.StatisticsDashboard }))
);
export const TimelineModal = lazy(() =>
  import('../TimelineModal').then((module) => ({ default: module.TimelineModal }))
);
export const ShareModal = lazy(() =>
  import('../ShareModal').then((module) => ({ default: module.ShareModal }))
);
export const GeographicJourneyModal = lazy(() =>
  import('../GeographicJourneyModal').then((module) => ({ default: module.GeographicJourneyModal }))
);
export const UnifiedLoginModal = lazy(() =>
  import('../modals/UnifiedLoginModal').then((module) => ({ default: module.UnifiedLoginModal }))
);
export const SnapshotHistoryModal = lazy(() =>
  import('../SnapshotHistoryModal').then((module) => ({ default: module.SnapshotHistoryModal }))
);
export const GlobalSettingsModal = lazy(() =>
  import('../modals/GlobalSettingsModal').then((module) => ({ default: module.GlobalSettingsModal }))
);
export const DriveFileManagerModal = lazy(() =>
  import('../DriveFileManagerModal').then((module) => ({ default: module.DriveFileManagerModal }))
);
export const TreeManagerModal = lazy(() =>
  import('../modals/TreeManagerModal').then((module) => ({ default: module.TreeManagerModal }))
);
