import { HelpTranslations } from '../../../types';

export const helpEn: HelpTranslations = {
  title: 'Help & Knowledge Base',
  description: 'Everything you need to master your family tree, from basic controls to advanced data management.',
  categories: {
    gettingStarted: {
      title: 'Getting Started',
      desc: 'Learn the essentials of navigating your canvas and adding people to your tree.',
      items: [
        {
          id: 'tree-view-modes',
          route: '/tree/:treeId',
          controlId: 'visual-preferences-trigger',
          q: 'Navigate the Tree and Choose a View',
          a: 'Use Visual Preferences to choose Focus for a family neighborhood around one person or Radial for ancestry and descendant rings. Use Fit to see the whole rendered tree, and Reset to return to the selected person at a readable scale.'
        },
        {
          id: 'add-relatives',
          route: '/tree/:treeId',
          controlId: 'primary-add-action',
          q: 'Adding Your First People',
          a: 'Use the central Add action, or open a person card and choose a parent, spouse, or child action. Selecting a card opens the person details drawer, where identity, relationships, events, media, and sources can be reviewed.'
        }
      ]
    },
    toolsFeatures: {
      title: 'Tools & Features',
      desc: 'Deep-dive into Jozor\'s premium interactive ecosystem.',
      items: [
        {
          id: 'saving-and-history',
          route: '/tree/:treeId',
          controlId: 'sync-status',
          q: 'Smart Auto-Saving & History Logging',
          a: 'Tree edits synchronize with the Jozor database and any pending local changes appear in the sync status. Google Drive is a separate optional backup. Open The Vault for Activity History, cloud backup files, and recovery actions.'
        },
        {
          id: 'focus-and-radial',
          route: '/tree/:treeId',
          controlId: 'visual-preferences-layout-mode',
          q: 'Focus and Radial Views',
          a: 'Focus centers a selected person with configurable ancestors, descendants, spouses, and siblings. Radial displays ancestor or descendant generations as a 180-degree fan or 360-degree circle. The available depth depends on the active tree and layout capacity.'
        }
      ]
    },
    privacySharing: {
      title: 'Privacy & Data Control',
      desc: 'Ensure your legacy data remains safe and strictly yours.',
      items: [
        {
          id: 'exports-and-backups',
          route: '/tree/:treeId#vault-cloud',
          controlId: 'vault-export-navigation',
          q: 'Exporting & Local Backups',
          a: 'Open The Vault, then Publishing & Backup. Portable Data provides owner archives and GEDCOM exchange files, Visual Outputs creates printable posters, and Cloud Backup manages optional Google Drive copies.'
        },
        {
          id: 'sharing-and-permissions',
          route: '/tree/:treeId#vault-members',
          controlId: 'vault-members-navigation',
          q: 'Security and Authentication',
          a: 'Use The Vault > Members to invite collaborators with a tracked viewer or editor role. Copying the canonical tree address does not grant access by itself. Tree data is protected by authentication and row-level authorization.'
        }
      ]
    }
  },
  contactSupport: 'Contact Developer Support',
  supportEmail: 'Contact us via email: jozor@jozor.com',
  goHome: 'Go to Home Screen',
  restartTour: 'Restart Interactive Tour',
  zoomIn: 'Zoom In',
  zoomOut: 'Zoom Out',
  resetZoom: 'Reset Zoom',
  fitToScreen: 'Fit to Screen',
  advancedSettings: 'Preferences',
};
