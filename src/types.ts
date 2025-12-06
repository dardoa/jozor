export interface Person {
  id: string;
  name: string;
  gender: 'male' | 'female';
  parents: string[];
  spouses: string[];
  children: string[];
  photoURL?: string;
  displayName?: string;
  // Add other person properties as needed
}

export interface FamilyActionsProps {
  onAddParent: (gender: Gender) => void;
  onAddSpouse: (gender: Gender) => void;
  onAddChild: (gender: Gender) => void;
  onRemoveRelationship?: (personId: string, relatedPersonId: string, relationshipType: 'parent' | 'spouse' | 'child') => void;
}

export type Gender = 'male' | 'female';

export interface HeaderRightSectionProps {
  themeLanguage: {
    language: 'en' | 'ar';
    setLanguage: (lang: 'en' | 'ar') => void;
    darkMode: boolean;
    setDarkMode: (isDark: boolean) => void;
  };
  auth: {
    user: { photoURL: string; displayName: string; email: string; } | null;
    isDemoMode: boolean;
    onLogin: () => void;
    onLogout: () => void;
  };
  viewSettings: {
    treeSettings: any; // Placeholder
    setTreeSettings: (settings: any) => void;
    onPresent: () => void;
  };
  toolsActions: {
    onOpenModal: (modalType: string) => void;
  };
  exportActions: {
    handleExport: (format: string) => void;
  };
  searchProps: {
    people: Record<string, Person>;
    onFocusPerson: (id: string) => void;
  };
}