import type { Person, TreeSettings } from '../../types';
import { getDisplayDate } from '../../utils/familyLogic';

export interface NodeNameLines {
  primaryNameLine: string;
  secondaryNameLine: string;
  nicknameAsPrimary: boolean;
}

export const resolveGenderColor = (settings: TreeSettings, person: Person) => {
  if (settings.boxColorLogic === 'none') return 'var(--tree-node-border)';
  if (settings.boxColorLogic === 'lineage') return 'var(--tree-line-color)';
  return person.gender === 'male' ? '#8B6914' : '#6B4C11';
};

export const resolveMonogramBg = (settings: TreeSettings, person: Person) => {
  if (settings.boxColorLogic === 'none') return 'var(--tree-avatar-bg)';
  if (settings.boxColorLogic === 'lineage') return 'var(--tree-avatar-bg)';
  return person.gender === 'male' ? 'rgba(42, 122, 138, 0.08)' : 'rgba(176, 58, 42, 0.06)';
};

export const buildPhotoAlt = (person: Person, fallback: string) => (
  [person.title, person.firstName, person.middleName, person.lastName, person.suffix]
    .filter(Boolean)
    .join(' ') || fallback
);

export const buildNodeNameLines = (person: Person, settings: TreeSettings, isLOD: boolean): NodeNameLines => {
  const primaryNameParts = [
    settings.showFirstName ? person.firstName : '',
    !isLOD && settings.showMiddleName ? person.middleName : '',
    !isLOD && settings.showLastName ? person.lastName : '',
  ].filter(Boolean);
  const primaryNameLine = primaryNameParts.join(' ').trim();
  const secondaryNameParts = [
    !isLOD && settings.showNickname ? person.nickName : '',
    !isLOD && settings.showSuffix ? person.suffix : '',
  ].filter(Boolean);
  const secondaryNameLine = secondaryNameParts.join(' • ').trim();

  return {
    primaryNameLine,
    secondaryNameLine,
    nicknameAsPrimary: !primaryNameLine && Boolean(secondaryNameLine),
  };
};

export const buildLifeDateLabel = (person: Person, settings: TreeSettings): string => {
  if (!settings.showDates) return '';

  const showBirthDate = settings.showBirthDate !== false;
  const showDeathDate = settings.showDeathDate !== false;
  const birth = showBirthDate ? getDisplayDate(person.birthDate) : '';
  const death = showDeathDate && person.isDeceased ? getDisplayDate(person.deathDate) : '';

  if (birth && (death || (showDeathDate && person.isDeceased))) {
    return `(${birth} - ${death || '?'})`;
  }

  if (birth) return `(b. ${birth})`;
  if (death || (showDeathDate && person.isDeceased)) return `(d. ${death || '?'})`;
  return '';
};

export const buildNodeMetaLines = (person: Person, settings: TreeSettings, isLOD: boolean) => {
  const dateParts: string[] = [];
  const yearsLabel = buildLifeDateLabel(person, settings);

  if (yearsLabel) dateParts.push(yearsLabel);
  if (settings.showDates && settings.showMarriageDate && person.marriageDate) {
    dateParts.push(`m. ${person.marriageDate}`);
  }

  const locationParts: string[] = [];
  if (!isLOD && settings.showBirthPlace && person.birthPlace) locationParts.push(person.birthPlace);
  if (!isLOD && settings.showResidence && person.residence) locationParts.push(`res. ${person.residence}`);
  if (!isLOD && settings.showMarriagePlace && person.marriagePlace) locationParts.push(`m. ${person.marriagePlace}`);
  if (!isLOD && settings.showBurialPlace && person.burialPlace) locationParts.push(`bur. ${person.burialPlace}`);

  const secondaryMeta = locationParts.slice(0, 2).join(' • ')
    || (!isLOD && settings.showOccupation && person.profession ? person.profession : '');

  return [dateParts.join(' • '), secondaryMeta].filter(Boolean);
};
