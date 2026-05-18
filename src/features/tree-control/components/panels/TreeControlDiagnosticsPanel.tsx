import React from 'react';
import { DiagnosticsPanels } from '../../../../features/diagnostics';
import { TreeControlSectionIntro } from '../TreeControlCenterShared';

type DiagnosticsText = {
  sections: {
    diagnosticsTitle: string;
    diagnosticsDesc: string;
  };
};

export const TreeControlDiagnosticsPanel: React.FC<{ text: DiagnosticsText }> = ({ text }) => (
  <section className="space-y-4">
    <TreeControlSectionIntro title={text.sections.diagnosticsTitle} description={text.sections.diagnosticsDesc} />
    <DiagnosticsPanels />
  </section>
);
