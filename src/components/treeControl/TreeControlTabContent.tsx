import React from 'react';
import { TreeControlCenterOverview } from './TreeControlCenterOverview';
import { TreeControlPlaceholder } from './TreeControlCenterShared';
import type { TreeControlContentProps } from './TreeControlCenterTypes';

const TreeControlAccessPanel = React.lazy(() =>
  import('./panels/TreeControlAccessPanel').then((module) => ({ default: module.TreeControlAccessPanel }))
);

const TreeControlActivityPanel = React.lazy(() =>
  import('./panels/TreeControlActivityPanel').then((module) => ({ default: module.TreeControlActivityPanel }))
);

const TreeControlVersionsPanel = React.lazy(() =>
  import('./panels/TreeControlVersionsPanel').then((module) => ({ default: module.TreeControlVersionsPanel }))
);

const TreeControlSettingsPanel = React.lazy(() =>
  import('./panels/TreeControlSettingsPanel').then((module) => ({ default: module.TreeControlSettingsPanel }))
);

const TreeControlDiagnosticsPanel = React.lazy(() =>
  import('./panels/TreeControlDiagnosticsPanel').then((module) => ({ default: module.TreeControlDiagnosticsPanel }))
);

const TreeControlMaintenancePanel = React.lazy(() =>
  import('./panels/TreeControlMaintenancePanel').then((module) => ({ default: module.TreeControlMaintenancePanel }))
);

const TreeControlDangerPanel = React.lazy(() =>
  import('./panels/TreeControlDangerPanel').then((module) => ({ default: module.TreeControlDangerPanel }))
);

export const TreeControlTabContent: React.FC<TreeControlContentProps> = ({
  activeTab,
  text,
  treeId,
  ownerId,
  ownerEmail,
  language,
  roleLabel,
  peopleCount,
  people,
  currentRootName,
  currentRootId,
  hasPendingSync,
  googleSync,
  onRootChanged,
  onTreeRenamed,
  onOpenShare,
  onOpenDiagnostics,
  treeName,
}) => {
  const content = (() => {
    switch (activeTab) {
    case 'overview':
      return (
        <TreeControlCenterOverview
          text={text}
          roleLabel={roleLabel}
          peopleCount={peopleCount}
          currentRootName={currentRootName}
          hasPendingSync={hasPendingSync}
          treeId={treeId}
          onOpenShare={onOpenShare}
          onOpenDiagnostics={onOpenDiagnostics}
        />
      );
    case 'access':
      return (
        <TreeControlAccessPanel
          text={text}
          treeId={treeId}
          ownerId={ownerId}
          ownerEmail={ownerEmail}
          language={language}
        />
      );
    case 'activity':
      return <TreeControlActivityPanel text={text} treeId={treeId} language={language} />;
    case 'versions':
      return <TreeControlVersionsPanel text={text} treeId={treeId} language={language} googleSync={googleSync} />;
    case 'settings':
      return (
        <TreeControlSettingsPanel
          text={text}
          treeId={treeId}
          treeName={treeName}
          ownerId={ownerId}
          ownerEmail={ownerEmail}
          people={people}
          currentRootId={currentRootId}
          onRootChanged={onRootChanged}
          onTreeRenamed={onTreeRenamed}
        />
      );
    case 'diagnostics':
      return <TreeControlDiagnosticsPanel text={text} />;
    case 'maintenance':
      return <TreeControlMaintenancePanel text={text} />;
    case 'danger':
      return (
        <TreeControlDangerPanel
          text={text}
          treeId={treeId}
          ownerId={ownerId}
          ownerEmail={ownerEmail}
          people={people}
        />
      );
    default:
      return null;
    }
  })();

  if (activeTab === 'overview') {
    return content;
  }

  return (
    <React.Suspense
      fallback={
        <TreeControlPlaceholder
          title={text.tabs[activeTab]}
          body={text.sections[`${activeTab}Desc` as keyof typeof text.sections] || text.tabs[activeTab]}
        />
      }
    >
      {content}
    </React.Suspense>
  );
};
