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
          q: 'Basic Navigation & Viewing Modes',
          a: 'Toggle between Descendant and Pedigree views using the icon on the right side. Zoom out dynamically and pan across to explore different branches seamlessly. In mobile, use the floating Action Bar to access tools directly.'
        },
        {
          q: 'Adding Your First People',
          a: 'Use the sidebar on the left to start adding people. Click any node to open their detailed profile modal and assign spouses, children, or parents visually without reloading the page.'
        }
      ]
    },
    toolsFeatures: {
      title: 'Tools & Features',
      desc: 'Deep-dive into Jozor\'s premium interactive ecosystem.',
      items: [
        {
          q: 'Smart Auto-Saving & History Logging',
          a: 'Your tree saves instantly. Use the Activity Log (clock icon) to review all major additions and restorations visually tracked through time.'
        },
        {
          q: 'Interactive Fan Chart Mode',
          a: 'Visualize a person\'s direct ancestry in a 360-degree colorful fan chart. Perfect for exploring deep ancestral roots up to 7 generations back.'
        }
      ]
    },
    privacySharing: {
      title: 'Privacy & Data Control',
      desc: 'Ensure your legacy data remains safe and strictly yours.',
      items: [
        {
          q: 'Exporting & Local Backups',
          a: 'Click the "Export" button to download a full `.jozor` file encoded with all metadata. GEDCOM export is also fully supported for historical archiving.'
        },
        {
          q: 'Security and Authentication',
          a: 'All data is cryptographically isolated using Row-Level Security (RLS). Only defined collaborators in the Share menu can modify the specific family tree.'
        }
      ]
    }
  },
  contactSupport: 'Contact Developer Support',
  supportEmail: 'Contact us via email: jozor@jozor.com',
  goHome: 'Go to Home Screen'
};
