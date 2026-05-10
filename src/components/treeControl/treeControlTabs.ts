import {
  Activity,
  AlertTriangle,
  Clock3,
  FolderTree,
  Settings,
  ShieldCheck,
  Stethoscope,
  Wrench,
} from 'lucide-react';
import type { TreeControlNavTab } from './TreeControlCenterNav';
import type { TreeControlTab, TreeControlText } from './TreeControlCenterTypes';

const TREE_CONTROL_TAB_IDS: TreeControlTab[] = [
  'overview',
  'access',
  'activity',
  'versions',
  'settings',
  'diagnostics',
  'maintenance',
  'danger',
];

const TREE_CONTROL_TAB_ICONS = {
  overview: FolderTree,
  access: ShieldCheck,
  activity: Activity,
  versions: Clock3,
  settings: Settings,
  diagnostics: Stethoscope,
  maintenance: Wrench,
  danger: AlertTriangle,
} satisfies Record<TreeControlTab, TreeControlNavTab['icon']>;

export const buildTreeControlTabs = (text: TreeControlText): TreeControlNavTab<TreeControlTab>[] =>
  TREE_CONTROL_TAB_IDS.map((id) => ({
    id,
    label: text.tabs[id],
    icon: TREE_CONTROL_TAB_ICONS[id],
  }));
