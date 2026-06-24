import { Person, RelationshipInfo, RelationshipStatus } from '../types';
import { createPerson } from './familyLogic';
import { evaluateDataIntegrity, type DataIntegrityIssue } from '../domain/dataIntegrity';

export interface GedcomImportReport {
  peopleCount: number;
  familyCount: number;
  sourceCount: number;
  unsupportedDateValues: string[];
  unnamedPeopleCount: number;
  integrityIssues: DataIntegrityIssue[];
  structuralIssueCount: number;
  timelineIssueCount: number;
  duplicateIssueCount: number;
  isSafe: boolean;
  warnings: string[];
}

export interface GedcomImportResult {
  people: Record<string, Person>;
  report: GedcomImportReport;
}

const GEDCOM_MONTHS = new Set([
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
]);

// Helper to format date for GEDCOM (YYYY-MM-DD -> DD MMM YYYY)
export const formatGedcomDate = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr; // Return as is if not parseable
  const months = [
    'JAN',
    'FEB',
    'MAR',
    'APR',
    'MAY',
    'JUN',
    'JUL',
    'AUG',
    'SEP',
    'OCT',
    'NOV',
    'DEC',
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

// Helper to parse GEDCOM date (DD MMM YYYY -> YYYY-MM-DD)
export const gedcomDateToIso = (gedDate: string): string => {
  if (!gedDate) return '';

  // Check if it's just a year
  if (/^\d{4}$/.test(gedDate.trim())) return gedDate.trim();

  const months: Record<string, string> = {
    JAN: '01',
    FEB: '02',
    MAR: '03',
    APR: '04',
    MAY: '05',
    JUN: '06',
    JUL: '07',
    AUG: '08',
    SEP: '09',
    OCT: '10',
    NOV: '11',
    DEC: '12',
  };

  const parts = gedDate.trim().split(' ');

  // Format: 1 JAN 1990
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = months[parts[1].toUpperCase()] || '01';
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }

  // Format: JAN 1990
  if (parts.length === 2) {
    const month = months[parts[0].toUpperCase()] || '01';
    const year = parts[1];
    return `${year}-${month}`;
  }

  return gedDate; // Fallback
};

const isSupportedGedcomDate = (gedDate: string): boolean => {
  const trimmed = gedDate.trim();
  if (!trimmed) return true;
  if (/^\d{4}$/.test(trimmed)) return true;
  const monthYearMatch = /^([A-Z]{3})\s+\d{4}$/i.exec(trimmed);
  if (monthYearMatch) return GEDCOM_MONTHS.has(monthYearMatch[1].toUpperCase());
  const fullDateMatch = /^\d{1,2}\s+([A-Z]{3})\s+\d{4}$/i.exec(trimmed);
  if (fullDateMatch) return GEDCOM_MONTHS.has(fullDateMatch[1].toUpperCase());
  return false;
};

const getGedcomRecordCount = (gedcom: string, recordType: 'INDI' | 'FAM' | 'SOUR'): number => {
  const pattern = new RegExp(`^0\\s+@[^@]+@\\s+${recordType}\\s*$`, 'i');
  return gedcom.split(/\r?\n/).filter((line) => pattern.test(line.trim())).length;
};

const getUnsupportedDateValues = (gedcom: string): string[] => {
  const unsupported = new Set<string>();

  gedcom.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    const match = /^2\s+DATE\s+(.+)$/i.exec(trimmed);
    if (!match) return;

    const dateValue = match[1].trim();
    if (!isSupportedGedcomDate(dateValue)) unsupported.add(dateValue);
  });

  return [...unsupported];
};

const buildGedcomImportReport = (gedcom: string, people: Record<string, Person>): GedcomImportReport => {
  const integrityReport = evaluateDataIntegrity(people);
  const unsupportedDateValues = getUnsupportedDateValues(gedcom);
  const unnamedPeopleCount = Object.values(people).filter((person) => {
    const firstName = person.firstName.trim().toLowerCase();
    return !firstName || firstName === 'unknown';
  }).length;
  const structuralIssueCount = integrityReport.issues.filter((issue) => issue.category === 'RELATIONSHIP').length;
  const timelineIssueCount = integrityReport.issues.filter((issue) => issue.category === 'TIMELINE').length;
  const duplicateIssueCount = integrityReport.issues.filter((issue) => issue.category === 'DUPLICATE').length;
  const warnings: string[] = [];

  if (unsupportedDateValues.length > 0) {
    warnings.push(`Unsupported GEDCOM date values: ${unsupportedDateValues.join(', ')}`);
  }
  if (unnamedPeopleCount > 0) {
    warnings.push(`${unnamedPeopleCount} imported people have missing or unknown names.`);
  }
  if (structuralIssueCount > 0) {
    warnings.push(`${structuralIssueCount} structural relationship issues detected after GEDCOM import.`);
  }
  if (timelineIssueCount > 0) {
    warnings.push(`${timelineIssueCount} timeline issues detected after GEDCOM import.`);
  }
  if (duplicateIssueCount > 0) {
    warnings.push(`${duplicateIssueCount} possible duplicate people detected after GEDCOM import.`);
  }

  return {
    peopleCount: Object.keys(people).length,
    familyCount: getGedcomRecordCount(gedcom, 'FAM'),
    sourceCount: getGedcomRecordCount(gedcom, 'SOUR'),
    unsupportedDateValues,
    unnamedPeopleCount,
    integrityIssues: integrityReport.issues,
    structuralIssueCount,
    timelineIssueCount,
    duplicateIssueCount,
    isSafe: structuralIssueCount === 0 && timelineIssueCount === 0,
    warnings,
  };
};

export const exportToGEDCOM = (people: Record<string, Person>): string => {
  const lines: string[] = [];
  lines.push('0 HEAD');
  lines.push('1 SOUR JOZOR_APP');
  lines.push('1 GEDC');
  lines.push('2 VERS 5.5.1');
  lines.push('2 FORM LINEAGE-LINKED');
  lines.push('1 CHAR UTF-8');

  const personIds = Object.keys(people);
  type ExportFamily = {
    id: string;
    parents: string[];
    children: string[];
    relInfo?: RelationshipInfo;
  };
  const families = new Map<string, ExportFamily>();

  const getFamilyKey = (parents: string[]): string => parents.slice().sort().join('_');

  const getOrCreateFamily = (parents: string[], relInfo?: RelationshipInfo): ExportFamily => {
    const normalizedParents = parents.filter((id, index, ids) => people[id] && ids.indexOf(id) === index).slice(0, 2);
    const key = getFamilyKey(normalizedParents);
    const existing = families.get(key);
    if (existing) {
      if (!existing.relInfo && relInfo) existing.relInfo = relInfo;
      return existing;
    }

    const family = {
      id: `F_${key}`,
      parents: normalizedParents,
      children: [],
      relInfo,
    };
    families.set(key, family);
    return family;
  };

  personIds.forEach((id) => {
    const person = people[id];

    person.spouses.forEach((spouseId) => {
      if (!people[spouseId]) return;
      getOrCreateFamily([id, spouseId], person.partnerDetails?.[spouseId]);
    });
  });

  personIds.forEach((id) => {
    const person = people[id];
    const validParents = person.parents.filter((parentId) => people[parentId]);
    if (validParents.length === 0) return;

    const family = getOrCreateFamily(validParents);
    if (!family.children.includes(id)) family.children.push(id);
  });

  const familiesByParent = new Map<string, string[]>();
  const familiesByChild = new Map<string, string[]>();
  [...families.values()].forEach((family) => {
    family.parents.forEach((parentId) => {
      familiesByParent.set(parentId, [...(familiesByParent.get(parentId) || []), family.id]);
    });
    family.children.forEach((childId) => {
      familiesByChild.set(childId, [...(familiesByChild.get(childId) || []), family.id]);
    });
  });

  // 1. Export Individuals
  personIds.forEach((id) => {
    const p = people[id];
    lines.push(`0 @${id}@ INDI`);

    // Name
    let nameStr = p.firstName;
    if (p.middleName) nameStr += ` ${p.middleName}`;
    if (p.lastName) nameStr += ` /${p.lastName}/`;
    else nameStr += ` //`;

    lines.push(`1 NAME ${nameStr}`);
    if (p.firstName) lines.push(`2 GIVN ${p.firstName} ${p.middleName || ''}`.trim());
    if (p.lastName) lines.push(`2 SURN ${p.lastName}`);
    if (p.nickName) lines.push(`1 NICK ${p.nickName}`);
    if (p.title) lines.push(`1 TITL ${p.title}`);

    // Gender
    lines.push(`1 SEX ${p.gender === 'male' ? 'M' : 'F'}`);

    // Birth
    if (p.birthDate || p.birthPlace) {
      lines.push('1 BIRT');
      if (p.birthDate) lines.push(`2 DATE ${formatGedcomDate(p.birthDate)}`);
      if (p.birthPlace) lines.push(`2 PLAC ${p.birthPlace}`);
    }

    // Death
    if (p.isDeceased) {
      lines.push('1 DEAT');
      if (p.deathDate) lines.push(`2 DATE ${formatGedcomDate(p.deathDate)}`);
      if (p.deathPlace) lines.push(`2 PLAC ${p.deathPlace}`);
    }

    // Bio/Note
    if (p.bio) {
      lines.push('1 NOTE ' + p.bio.replace(/\n/g, ' '));
    }

    // Occupation
    if (p.profession) {
      lines.push(`1 OCCU ${p.profession}`);
    }

    (familiesByParent.get(id) || []).forEach((familyId) => lines.push(`1 FAMS @${familyId}@`));
    (familiesByChild.get(id) || []).forEach((familyId) => lines.push(`1 FAMC @${familyId}@`));
  });

  // Append Family Records
  [...families.values()].forEach((family) => {
    let husb = family.parents.find((parentId) => people[parentId]?.gender === 'male') || null;
    let wife = family.parents.find((parentId) => people[parentId]?.gender === 'female') || null;

    if (!husb && family.parents[0]) husb = family.parents[0];
    if (!wife && family.parents.find((parentId) => parentId !== husb)) {
      wife = family.parents.find((parentId) => parentId !== husb) || null;
    }

    lines.push(`0 @${family.id}@ FAM`);
    if (husb) lines.push(`1 HUSB @${husb}@`);
    if (wife) lines.push(`1 WIFE @${wife}@`);
    family.children.forEach((childId) => lines.push(`1 CHIL @${childId}@`));

    const relInfo = family.relInfo;
    if (relInfo) {
      if (relInfo.type === 'married' || relInfo.type === 'divorced') {
        lines.push('1 MARR');
        if (relInfo.startDate) lines.push(`2 DATE ${formatGedcomDate(relInfo.startDate)}`);
        if (relInfo.startPlace) lines.push(`2 PLAC ${relInfo.startPlace}`);
      }
      if (relInfo.type === 'divorced') {
        lines.push('1 DIV');
        if (relInfo.endDate) lines.push(`2 DATE ${formatGedcomDate(relInfo.endDate)}`);
        if (relInfo.endPlace) lines.push(`2 PLAC ${relInfo.endPlace}`);
      }
    }
  });

  lines.push('0 TRLR');
  return lines.join('\n');
};

export const importFromGEDCOM = (gedcom: string): Record<string, Person> => {
  const lines = gedcom.split(/\r?\n/);
  const people: Record<string, Person> = {};
  interface GedcomFamily {
    husb?: string;
    wife?: string;
    children: string[];
    marrDate?: string;
    marrPlace?: string;
    divDate?: string;
    divPlace?: string;
  }

  const families: Record<string, GedcomFamily> = {};
  const sources: Record<string, { title: string; author?: string; date?: string; notes?: string }> = {};
  const generalSourceRefs: Record<string, string[]> = {};
  const birthSourceRefs: Record<string, string[]> = {};
  const deathSourceRefs: Record<string, string[]> = {};

  let currentId = '';
  let currentType = ''; // INDI or FAM
  let currentPerson: Partial<Person> | null = null;
  let currentFam: GedcomFamily | null = null;
  let currentSource: { title: string; author?: string; date?: string; notes?: string } | null = null;

  // Context tracking for sub-tags (BIRT, DEAT, MARR)
  let currentEvent = '';

  lines.forEach((line) => {
    const parts = line.trim().split(' ');
    const level = parts[0];
    const tagOrId = parts[1];
    const rest = parts.slice(2).join(' ');

    if (level === '0') {
      // --- SAVE PREVIOUS RECORD ---
      if (currentType === 'INDI' && currentPerson && currentId) {
        // Ensure currentPerson is treated as a valid object for spreading
        people[currentId] = { ...createPerson(), ...(currentPerson as Person), id: currentId };
      }
      if (currentType === 'FAM' && currentFam && currentId) {
        families[currentId] = currentFam;
      }
      if (currentType === 'SOUR' && currentSource && currentId) {
        sources[currentId] = currentSource;
      }

      // --- START NEW RECORD ---
      currentEvent = ''; // Reset event context
      if (rest === 'INDI' || parts[2] === 'INDI') {
        currentId = tagOrId.replace(/@/g, '');
        currentType = 'INDI';
        currentPerson = {
          firstName: 'Unknown',
          lastName: '',
          gender: 'male',
          parents: [],
          spouses: [],
          children: [],
          partnerDetails: {},
        };
        currentFam = null;
        currentSource = null;
      } else if (rest === 'FAM' || parts[2] === 'FAM') {
        currentId = tagOrId.replace(/@/g, '');
        currentType = 'FAM';
        currentFam = { children: [] };
        currentPerson = null;
        currentSource = null;
      } else if (rest === 'SOUR' || parts[2] === 'SOUR') {
        currentId = tagOrId.replace(/@/g, '');
        currentType = 'SOUR';
        currentSource = { title: currentId };
        currentPerson = null;
        currentFam = null;
      } else {
        currentType = '';
        currentId = '';
        currentSource = null;
      }
    } else if (currentType === 'INDI' && currentPerson) {
      // Level 1 Tags
      if (level === '1') {
        currentEvent = tagOrId; // Track context (BIRT, DEAT, etc)

        if (tagOrId === 'NAME') {
          const nameParts = rest.split('/');
          const givenNameParts = (nameParts[0] || '').trim().split(' ');

          currentPerson.firstName = givenNameParts[0] || '';
          // Join remaining parts as middle name
          if (givenNameParts.length > 1) {
            currentPerson.middleName = givenNameParts.slice(1).join(' ');
          }
          currentPerson.lastName = (nameParts[1] || '').trim();
        } else if (tagOrId === 'SEX') {
          currentPerson.gender = rest === 'F' ? 'female' : 'male';
        } else if (tagOrId === 'TITL') {
          currentPerson.title = rest;
        } else if (tagOrId === 'NICK') {
          currentPerson.nickName = rest;
        } else if (tagOrId === 'OCCU') {
          currentPerson.profession = rest;
        } else if (tagOrId === 'NOTE') {
          currentPerson.bio = (currentPerson.bio ? currentPerson.bio + '\n' : '') + rest;
        } else if (tagOrId === 'SOUR') {
          const sourceRef = rest.replace(/@/g, '').trim();
          if (sourceRef) {
            generalSourceRefs[currentId] = [...(generalSourceRefs[currentId] || []), sourceRef];
          }
        }
      }

      // Level 2 Tags (Details for BIRT/DEAT)
      else if (level === '2') {
        if (currentEvent === 'BIRT') {
          if (tagOrId === 'DATE') currentPerson.birthDate = gedcomDateToIso(rest);
          if (tagOrId === 'PLAC') currentPerson.birthPlace = rest;
        } else if (currentEvent === 'DEAT') {
          currentPerson.isDeceased = true;
          if (tagOrId === 'DATE') currentPerson.deathDate = gedcomDateToIso(rest);
          if (tagOrId === 'PLAC') currentPerson.deathPlace = rest;
        }

        if (tagOrId === 'SOUR') {
          const sourceRef = rest.replace(/@/g, '').trim();
          if (sourceRef && currentEvent === 'BIRT') {
            birthSourceRefs[currentId] = [...(birthSourceRefs[currentId] || []), sourceRef];
          } else if (sourceRef && currentEvent === 'DEAT') {
            deathSourceRefs[currentId] = [...(deathSourceRefs[currentId] || []), sourceRef];
          }
        } else if (currentEvent === 'NAME') {
          if (tagOrId === 'GIVN') {
            // Some GEDCOMs use GIVN, prefer this if available
            // But we handled NAME logic above generally
          }
        }
      }
    } else if (currentType === 'FAM' && currentFam) {
      if (level === '1') {
        currentEvent = tagOrId;
        if (tagOrId === 'HUSB') currentFam.husb = rest.replace(/@/g, '');
        if (tagOrId === 'WIFE') currentFam.wife = rest.replace(/@/g, '');
        if (tagOrId === 'CHIL') currentFam.children.push(rest.replace(/@/g, ''));
      } else if (level === '2') {
        if (currentEvent === 'MARR') {
          if (tagOrId === 'DATE') currentFam.marrDate = gedcomDateToIso(rest);
          if (tagOrId === 'PLAC') currentFam.marrPlace = rest;
        }
        if (currentEvent === 'DIV') {
          if (tagOrId === 'DATE') currentFam.divDate = gedcomDateToIso(rest);
          if (tagOrId === 'PLAC') currentFam.divPlace = rest;
        }
      }
    } else if (currentType === 'SOUR' && currentSource) {
      if (level === '1') {
        if (tagOrId === 'TITL') currentSource.title = rest || currentSource.title;
        if (tagOrId === 'AUTH') currentSource.author = rest;
        if (tagOrId === 'DATE') currentSource.date = gedcomDateToIso(rest);
        if (tagOrId === 'NOTE' || tagOrId === 'PUBL' || tagOrId === 'TEXT') {
          currentSource.notes = [currentSource.notes, rest].filter(Boolean).join('\n');
        }
      }
    }
  });

  // Save final record
  if (currentType === 'INDI' && currentPerson && currentId) {
    people[currentId] = { ...createPerson(), ...(currentPerson as Person), id: currentId };
  }
  if (currentType === 'FAM' && currentFam && currentId) {
    families[currentId] = currentFam;
  }
  if (currentType === 'SOUR' && currentSource && currentId) {
    sources[currentId] = currentSource;
  }

  // --- SECOND PASS: LINK RELATIONSHIPS ---
  Object.values(families).forEach((fam) => {
    const { husb, wife, children, marrDate, marrPlace, divDate, divPlace } = fam;

    // Link Spouses
    if (husb && wife && people[husb] && people[wife]) {
      // Add to spouse arrays
      if (!people[husb].spouses.includes(wife)) people[husb].spouses.push(wife);
      if (!people[wife].spouses.includes(husb)) people[wife].spouses.push(husb);

      // Add Partner Details (Marriage Date/Place)
      const relType = divDate ? 'divorced' : 'married';
      const relInfo = {
        type: relType as RelationshipStatus,
        startDate: marrDate || '',
        startPlace: marrPlace || '',
        endDate: divDate || '',
        endPlace: divPlace || '',
      };

      // Initialize partnerDetails object if missing
      if (!people[husb].partnerDetails) people[husb].partnerDetails = {};
      if (!people[wife].partnerDetails) people[wife].partnerDetails = {};

      people[husb].partnerDetails![wife] = relInfo;
      people[wife].partnerDetails![husb] = relInfo;
    }

    // Link Children
    children.forEach((childId) => {
      if (people[childId]) {
        const childParents = people[childId].parents;
        if (husb && people[husb]) {
          if (!childParents.includes(husb)) childParents.push(husb);
          if (!people[husb].children.includes(childId)) people[husb].children.push(childId);
        }
        if (wife && people[wife]) {
          if (!childParents.includes(wife)) childParents.push(wife);
          if (!people[wife].children.includes(childId)) people[wife].children.push(childId);
        }
      }
    });
  });

  Object.entries(people).forEach(([personId, person]) => {
    const resolveSourceTitle = (sourceRef: string) => sources[sourceRef]?.title || sourceRef;
    const generalRefs = generalSourceRefs[personId] || [];
    const birthRefs = birthSourceRefs[personId] || [];
    const deathRefs = deathSourceRefs[personId] || [];

    if (generalRefs.length > 0) {
      person.sources = generalRefs.map((sourceRef) => {
        const source = sources[sourceRef];
        return {
          id: sourceRef,
          title: source?.title || sourceRef,
          date: source?.date,
          type: 'document',
        };
      });
    }

    if (!person.birthSource && birthRefs.length > 0) {
      person.birthSource = birthRefs.map(resolveSourceTitle).join('; ');
    }

    if (!person.deathSource && deathRefs.length > 0) {
      person.deathSource = deathRefs.map(resolveSourceTitle).join('; ');
    }
  });

  return people;
};

export const importFromGEDCOMWithReport = (gedcom: string): GedcomImportResult => {
  const people = importFromGEDCOM(gedcom);
  return {
    people,
    report: buildGedcomImportReport(gedcom, people),
  };
};
