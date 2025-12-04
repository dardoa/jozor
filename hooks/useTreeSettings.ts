import { useState, useEffect } from 'react';
import { TreeSettings } from '../types';

const DEFAULT_TREE_SETTINGS: TreeSettings = {
  showPhotos: true,
  showDates: true,
  showMiddleName: false,
  showLastName: true,
  showMinimap: false, // Changed to false
  layoutMode: 'vertical',
  isCompact: false,
  chartType: 'descendant',
  theme: 'modern',
  enableForcePhysics: true,
};

export const useTreeSettings = () => {
  const [treeSettings, setTreeSettings] = useState<TreeSettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedSettings = localStorage.getItem('treeSettings');
        if (savedSettings) {
          return { ...DEFAULT_TREE_SETTINGS, ...JSON.parse(savedSettings) };
        }
      } catch (e) {
        console.error("Failed to load tree settings from localStorage", e);
      }
    }
    return DEFAULT_TREE_SETTINGS;
  });

  // Persist settings to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('treeSettings', JSON.stringify(treeSettings));
    }
  }, [treeSettings]);

  return { treeSettings, setTreeSettings };
};