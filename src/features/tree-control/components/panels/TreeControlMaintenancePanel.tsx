import React from 'react';
import { DiagnosticsPanels } from '../../../../features/diagnostics';
import { TreeControlSectionIntro } from '../TreeControlCenterShared';

type MaintenanceText = {
  sections: {
    maintenanceTitle: string;
    maintenanceDesc: string;
  };
};

export const TreeControlMaintenancePanel: React.FC<{ text: MaintenanceText }> = ({ text }) => (
  <section className="space-y-4">
    <TreeControlSectionIntro title={text.sections.maintenanceTitle} description={text.sections.maintenanceDesc} />
    <DiagnosticsPanels includeTelemetry={false} includeMaintenance />
  </section>
);
