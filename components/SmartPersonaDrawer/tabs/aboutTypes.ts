import type { BriefcaseBusiness, Info, Mail } from 'lucide-react';

export type AboutSectionId = 'overview' | 'workBio' | 'contact';

export type AboutSectionCard = {
  id: AboutSectionId;
  label: string;
  blurb: string;
  icon: typeof Info | typeof BriefcaseBusiness | typeof Mail;
};
