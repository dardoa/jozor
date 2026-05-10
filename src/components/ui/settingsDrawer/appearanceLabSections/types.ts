export type SectionId = 'theme' | 'appearance' | 'layout' | 'content' | 'advanced';
export type AdvancedTabId = 'engine' | 'details' | 'performance';

export type AppearanceLabPerson = {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  title?: string;
  suffix?: string;
};
