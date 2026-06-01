import { lazy } from 'react';

export const LinkPersonModal = lazy(() =>
  import('../../features/tree-control').then((module) => ({ default: module.LinkPersonModal }))
);
export const CleanTreeOptionsModal = lazy(() =>
  import('../CleanTreeOptionsModal').then((module) => ({ default: module.CleanTreeOptionsModal }))
);
export const GoogleSyncChoiceModal = lazy(() =>
  import('../GoogleSyncChoiceModal').then((module) => ({ default: module.GoogleSyncChoiceModal }))
);
export const SharedTreePromptModal = lazy(() =>
  import('../../features/sharing').then((module) => ({ default: module.SharedTreePromptModal }))
);
export const RelationshipModal = lazy(() =>
  import('../../features/tree-control').then((module) => ({ default: module.RelationshipModal }))
);
export const StatisticsDashboard = lazy(() =>
  import('../../features/statistics').then((module) => ({ default: module.StatisticsDashboard }))
);
export const TimelineModal = lazy(() =>
  import('../../features/activity-log').then((module) => ({ default: module.TimelineModal }))
);
export const ShareModal = lazy(() =>
  import('../../features/sharing').then((module) => ({ default: module.ShareModal }))
);
export const GeographicJourneyModal = lazy(() =>
  import('../../features/geography').then((module) => ({ default: module.GeographicJourneyModal }))
);
export const UnifiedLoginModal = lazy(() =>
  import('../modals/UnifiedLoginModal').then((module) => ({ default: module.UnifiedLoginModal }))
);
export const GlobalSettingsModal = lazy(() =>
  import('../modals/GlobalSettingsModal').then((module) => ({ default: module.GlobalSettingsModal }))
);
export const PaywallModal = lazy(() =>
  import('./PaywallModal').then((module) => ({ default: module.PaywallModal }))
);
