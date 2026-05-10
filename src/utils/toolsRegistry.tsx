import React from 'react';
import {
  Calculator, Activity, ShieldCheck,
  Calendar, Route
} from 'lucide-react';
import { ModalType } from '../types';

export interface ToolDefinition {
  id: ModalType;
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
  category: 'view' | 'analysis';
  color: 'green' | 'blue' | 'emerald' | 'orange' | 'indigo' | 'slate';
  descriptionKey?: string;
}

export const TOOLS_REGISTRY: ToolDefinition[] = [
  {
    id: 'migrationMap',
    icon: Route,
    labelKey: 'migrationMap',
    category: 'view',
    color: 'indigo',
  },
  {
    id: 'timeline',
    icon: Calendar,
    labelKey: 'familyTimelineHeader',
    category: 'view',
    color: 'blue',
  },
  // Category: Analysis & Insights
  {
    id: 'stats',
    icon: Activity,
    labelKey: 'familyStatistics',
    category: 'analysis',
    color: 'emerald',
  },
  {
    id: 'consistency',
    icon: ShieldCheck,
    labelKey: 'consistencyChecker',
    category: 'analysis',
    color: 'orange',
  },
  {
    id: 'calculator',
    icon: Calculator,
    labelKey: 'relationshipCalculator',
    category: 'analysis',
    color: 'indigo',
  }
];
