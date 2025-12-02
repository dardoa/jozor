export type Gender = 'male' | 'female';

export type RelationshipStatus = 'married' | 'divorced' | 'engaged' | 'separated';

export type Language = 'en' | 'ar';

export type ChartType = 'descendant' | 'fan' | 'pedigree' | 'force';

export type AppTheme = 'modern' | 'vintage' | 'blueprint';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
}

export interface RelationshipInfo {
  type: RelationshipStatus;
  startDate: string;
  startPlace?: string; // Location of marriage/engagement
  endDate?: string;
  endPlace?: string; // Location of divorce/separation
}

export interface TreeSettings {
  showPhotos: boolean;
  showDates: boolean;
  showMiddleName: boolean;
  showLastName: boolean;
  showMinimap: boolean; // New
  layoutMode: 'vertical' | 'horizontal' | 'radial';
  isCompact: boolean;
  chartType: ChartType;
  theme: AppTheme;
  enableForcePhysics?: boolean; // New: Toggle physics simulation
}

export interface Person {
  id: string;
  // Identity
  title: string;
  firstName: string;
  middleName: string;
  lastName: string;
  birthName: string;
  nickName: string;
  suffix: string;
  gender: Gender;
  
  // Vital Stats
  birthDate: string;
  birthPlace: string;
  birthSource: string;
  deathDate: string;
  deathPlace: string;
  deathSource: string;
  isDeceased: boolean;
  
  // biographical
  profession: string;
  company: string;
  interests: string;
  bio: string;
  photoUrl?: string;
  gallery: string[];
  voiceNotes?: string[];

  // Contact
  email: string;
  website: string;
  blog: string;
  address: string;
  
  // Relationships (stored as IDs)
  parents: string[];
  spouses: string[];
  children: string[];
  
  // Metadata for relationships (Keyed by Spouse ID)
  partnerDetails?: Record<string, RelationshipInfo>;
}

export interface Message {
  role: 'user' | 'model';
  text: string;
}

export interface FamilyData {
  people: Record<string, Person>;
  rootId: string;
}

export interface TreeNode {
  id: string;
  x: number;
  y: number;
  data: Person;
  type: 'focus' | 'spouse' | 'parent' | 'child' | 'sibling' | 'ancestor' | 'descendant';
  // Props for Fan Chart
  startAngle?: number;
  endAngle?: number;
  depth?: number;
}

export interface TreeLink {
  source: any; // Allow object reference for D3 Force
  target: any;
  type: 'parent-child' | 'marriage';
}

export interface FanArc {
  id: string;
  person: Person;
  startAngle: number;
  endAngle: number;
  innerRadius: number;
  outerRadius: number;
  depth: number;
  value: number;
  hasChildren: boolean;
}