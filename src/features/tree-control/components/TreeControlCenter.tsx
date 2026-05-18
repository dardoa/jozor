import React, { useMemo, useState } from 'react';
import { useTranslation } from '../../../context/TranslationContext';
import { TreeControlCenterShell } from './TreeControlCenterShell';
import { TreeControlTabContent } from './TreeControlTabContent';
import { buildTreeControlTabs } from './treeControlTabs';
import type { TreeControlCenterProps, TreeControlTab, TreeControlText } from '../types';

export const TreeControlCenter: React.FC<TreeControlCenterProps> = ({
  isOpen,
  onClose,
  people = [],
  ...props
}) => {
  const [activeTab, setActiveTab] = useState<TreeControlTab>('overview');
  const { t } = useTranslation();

  const text = t.treeControlCenter as TreeControlText;
  const tabs = useMemo(() => buildTreeControlTabs(text), [text]);

  return (
    <TreeControlCenterShell
      isOpen={isOpen}
      onClose={onClose}
      treeName={props.treeName}
      text={text}
      tabs={tabs}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
    >
      <TreeControlTabContent activeTab={activeTab} text={text} people={people} {...props} />
    </TreeControlCenterShell>
  );
};
