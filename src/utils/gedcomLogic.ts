import { Person, RelationshipInfo, RelationshipStatus } from '../types';
import { createPerson } from './familyLogic';
import { evaluateDataIntegrity, type DataIntegrityIssue } from '../domain/dataIntegrity';
import type { RelationshipEdge } from '../types/relationship';
import { buildGedcomFamilyGroups } from './gedcomRelationshipAdapter';

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

export function formatDateForGEDCOM(
  dateValue?: string,
  metadata?: any,
  dateField?: 'birth' | 'death' | 'start' | 'end'
): string | null {
  if (!dateValue) return null;
  const trimmed = dateValue.trim();
  if (!trimmed) return null;

  // 1. Detect standard GEDCOM date prefixes or structures and return as-is
  const gedcomPrefixRegex = /^(?:ABT|BEF|AFT|EST|CAL|FROM|TO|INT)\b/i;
  if (gedcomPrefixRegex.test(trimmed)) {
    return trimmed;
  }

  // 2. Detect approximate markers (e.g. "~1977", "about 1977", "حوالي 1977") and return "ABT YYYY"
  const approxPrefixRegex = /^(?:~|ca\.?|about|circa|حوالي)\s*(\d{4})/i;
  const approxMatch = trimmed.match(approxPrefixRegex);
  if (approxMatch) {
    return `ABT ${approxMatch[1]}`;
  }

  // 3. Resolve approximate flag from metadata
  let isApproximate = false;
  if (metadata && typeof metadata === 'object') {
    if (dateField === 'birth') {
      isApproximate = Boolean(metadata.birthDateApproximate || metadata.birthDate_approximate);
    } else if (dateField === 'death') {
      isApproximate = Boolean(metadata.deathDateApproximate || metadata.deathDate_approximate);
    } else if (dateField === 'start') {
      isApproximate = Boolean(metadata.startDateApproximate || metadata.startDate_approximate);
    } else if (dateField === 'end') {
      isApproximate = Boolean(metadata.endDateApproximate || metadata.endDate_approximate);
    }
  }

  // 4. Resolve precision from metadata
  let precision: 'year' | 'month' | 'day' | null = null;
  if (metadata && typeof metadata === 'object') {
    const precVal = dateField === 'birth'
      ? (metadata.birthDatePrecision || metadata.birthDate_precision)
      : dateField === 'death'
      ? (metadata.deathDatePrecision || metadata.deathDate_precision)
      : dateField === 'start'
      ? (metadata.startDatePrecision || metadata.startDate_precision)
      : dateField === 'end'
      ? (metadata.endDatePrecision || metadata.endDate_precision)
      : null;

    if (typeof precVal === 'string') {
      const lower = precVal.toLowerCase();
      if (lower === 'day' || lower === 'full' || lower === 'exact') {
        precision = 'day';
      } else if (lower === 'month' || lower === 'year-month') {
        precision = 'month';
      } else if (lower === 'year' || lower === 'year-only') {
        precision = 'year';
      }
    }
  }

  // 5. Try to parse standard YYYY-MM-DD
  const ymdMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymdMatch) {
    const [_, year, month, day] = ymdMatch;
    const dayNum = parseInt(day, 10);
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const monthIndex = parseInt(month, 10) - 1;
    const monthStr = months[monthIndex] || 'JAN';

    // If day is 01 and month is 01 (i.e. YYYY-01-01)
    if (month === '01' && day === '01') {
      // Preserve exact "1 JAN YYYY" only when data explicitly indicates day/month precision
      if (precision === 'day') {
        return `${isApproximate ? 'ABT ' : ''}${dayNum} ${monthStr} ${year}`;
      }
      return `${isApproximate ? 'ABT ' : ''}${year}`;
    }

    if (precision === 'year') {
      return `${isApproximate ? 'ABT ' : ''}${year}`;
    }
    if (precision === 'month') {
      return `${isApproximate ? 'ABT ' : ''}${monthStr} ${year}`;
    }
    return `${isApproximate ? 'ABT ' : ''}${dayNum} ${monthStr} ${year}`;
  }

  // 6. Try to parse YYYY-MM
  const ymMatch = trimmed.match(/^(\d{4})-(\d{2})$/);
  if (ymMatch) {
    const [_, year, month] = ymMatch;
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const monthIndex = parseInt(month, 10) - 1;
    const monthStr = months[monthIndex] || 'JAN';

    if (precision === 'year') {
      return `${isApproximate ? 'ABT ' : ''}${year}`;
    }
    return `${isApproximate ? 'ABT ' : ''}${monthStr} ${year}`;
  }

  // 7. Try to parse YYYY
  const yearMatch = trimmed.match(/^(\d{4})$/);
  if (yearMatch) {
    const year = yearMatch[1];
    return `${isApproximate ? 'ABT ' : ''}${year}`;
  }

  // 8. Fallback for parseable Date structures
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const monthStr = months[d.getMonth()];
    const day = d.getDate();

    if (d.getMonth() === 0 && d.getDate() === 1) {
      if (precision === 'day') {
        return `${isApproximate ? 'ABT ' : ''}${day} ${monthStr} ${year}`;
      }
      return `${isApproximate ? 'ABT ' : ''}${year}`;
    }

    if (precision === 'year') {
      return `${isApproximate ? 'ABT ' : ''}${year}`;
    }
    if (precision === 'month') {
      return `${isApproximate ? 'ABT ' : ''}${monthStr} ${year}`;
    }
    return `${isApproximate ? 'ABT ' : ''}${day} ${monthStr} ${year}`;
  }

  return trimmed;
}

export const formatGedcomDate = (
  dateStr: string,
  metadata?: any,
  dateField?: 'birth' | 'death' | 'start' | 'end'
): string => {
  return formatDateForGEDCOM(dateStr, metadata, dateField) || '';
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

  const importWarnings = (people as Record<string, unknown> & { _importWarnings?: string[] })._importWarnings || [];
  warnings.push(...importWarnings);

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

export interface GedcomExportOptions {
  readonly relationshipEdges?: Record<string, RelationshipEdge> | readonly RelationshipEdge[];
  readonly relationshipMode?: 'legacy-array' | 'relationship-edge';
}

export const exportToGEDCOM = (
  people: Record<string, Person>,
  options: GedcomExportOptions = {}
): string => {
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
    metadata?: any;
  };
  const families = new Map<string, ExportFamily>();

  const getFamilyKey = (parents: string[]): string => parents.slice().sort().join('_');

  const getOrCreateFamily = (parents: string[], relInfo?: RelationshipInfo, metadata?: any): ExportFamily => {
    const normalizedParents = parents.filter((id, index, ids) => people[id] && ids.indexOf(id) === index).slice(0, 2);
    const key = getFamilyKey(normalizedParents);
    const existing = families.get(key);
    if (existing) {
      if (!existing.relInfo && relInfo) existing.relInfo = relInfo;
      if (!existing.metadata && metadata) existing.metadata = metadata;
      return existing;
    }

    const family = {
      id: `F_${key}`,
      parents: normalizedParents,
      children: [],
      relInfo,
      metadata,
    };
    families.set(key, family);
    return family;
  };

  const hasEdges = !!options.relationshipEdges && (
    Array.isArray(options.relationshipEdges)
      ? options.relationshipEdges.length > 0
      : Object.keys(options.relationshipEdges).length > 0
  );

  const isEdgeMode = options.relationshipMode !== 'legacy-array' && (
    options.relationshipMode === 'relationship-edge' || hasEdges
  );

  if (!isEdgeMode) {
    // Standard legacy generation
    personIds.forEach((id) => {
      const person = people[id];
      person.spouses.forEach((spouseId) => {
        if (!people[spouseId]) return;
        getOrCreateFamily([id, spouseId], person.partnerDetails?.[spouseId], person.metadata);
      });
    });

    personIds.forEach((id) => {
      const person = people[id];
      const validParents = person.parents.filter((parentId) => people[parentId]);
      if (validParents.length === 0) return;

      const family = getOrCreateFamily(validParents);
      if (!family.children.includes(id)) family.children.push(id);
    });
  } else {
    // RelationshipEdge grouping logic
    const edgeList = Array.isArray(options.relationshipEdges)
      ? options.relationshipEdges
      : Object.values(options.relationshipEdges ?? {});

    const useLegacyFallback = edgeList.length === 0;

    const { groups } = buildGedcomFamilyGroups({
      people,
      relationshipEdges: options.relationshipEdges,
      useLegacyFallback,
    });

    // Populate families map from adapter groups
    groups.forEach((group) => {
      const parents = group.spouseIds.filter((id) => people[id]);
      const children = group.childIds.filter((id) => people[id]);

      // Resolve relInfo details if spouse edges have metadata
      let relInfo: RelationshipInfo | undefined;
      let familyMetadata: any;
      if (parents.length >= 2) {
        const [p1, p2] = parents;
        // Search in relationshipEdges
        const edge = edgeList.find((e) => {
          const isSpouse = e.type === 'SPOUSE' || e.type === 'PARTNER';
          if (!isSpouse) return false;
          const matchNormal = e.fromPersonId === p1 && e.toPersonId === p2;
          const matchReverse = e.fromPersonId === p2 && e.toPersonId === p1;
          return matchNormal || matchReverse;
        });

        if (edge?.metadata) {
          familyMetadata = edge.metadata;
          relInfo = {
            type: 'married',
            startDate: edge.metadata.startDate,
            startPlace: edge.metadata.startPlace,
            endDate: edge.metadata.endDate,
            endPlace: edge.metadata.endPlace,
          };
        } else {
          // Fallback to legacy partnerDetails if metadata is absent
          const p1Person = people[p1];
          const p2Person = people[p2];
          if (p1Person?.partnerDetails?.[p2]) {
            relInfo = p1Person.partnerDetails[p2];
          } else if (p2Person?.partnerDetails?.[p1]) {
            relInfo = p2Person.partnerDetails[p1];
          }
        }
      }

      // Format unique custom family key using F_ prefix
      let familyIdKey = group.familyId;
      if (familyIdKey.startsWith('fam:')) {
        // Strip prefix and match naming conventions
        familyIdKey = familyIdKey.replace(/^fam:/, '');
      }
      if (group.source === 'legacy-array' && familyIdKey.endsWith(':single')) {
        familyIdKey = familyIdKey.replace(/:single$/, '');
      }

      families.set(familyIdKey, {
        id: `F_${familyIdKey.replace(/:/g, '_')}`,
        parents,
        children,
        relInfo,
        metadata: familyMetadata,
      });
    });
  }

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
      if (p.birthDate) lines.push(`2 DATE ${formatGedcomDate(p.birthDate, p.metadata, 'birth')}`);
      if (p.birthPlace) lines.push(`2 PLAC ${p.birthPlace}`);
    }

    // Death
    if (p.isDeceased) {
      lines.push('1 DEAT');
      if (p.deathDate) lines.push(`2 DATE ${formatGedcomDate(p.deathDate, p.metadata, 'death')}`);
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
        if (relInfo.startDate) lines.push(`2 DATE ${formatGedcomDate(relInfo.startDate, family.metadata, 'start')}`);
        if (relInfo.startPlace) lines.push(`2 PLAC ${relInfo.startPlace}`);
      }
      if (relInfo.type === 'divorced') {
        lines.push('1 DIV');
        if (relInfo.endDate) lines.push(`2 DATE ${formatGedcomDate(relInfo.endDate, family.metadata, 'end')}`);
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

  const warnings: string[] = [];
  const seenIndis = new Set<string>();
  const seenFams = new Set<string>();
  const personFamRefs: { personId: string; tag: string; famId: string }[] = [];

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
        if (seenIndis.has(currentId)) {
          warnings.push(`Duplicate INDI record detected: ${currentId}`);
        } else {
          seenIndis.add(currentId);
        }
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
        if (seenFams.has(currentId)) {
          warnings.push(`Duplicate FAM record detected: ${currentId}`);
        } else {
          seenFams.add(currentId);
        }
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
        } else if (tagOrId === 'FAMS' || tagOrId === 'FAMC') {
          const famRef = rest.replace(/@/g, '').trim();
          if (famRef) {
            personFamRefs.push({ personId: currentId, tag: tagOrId, famId: famRef });
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

  // --- SECOND PASS: VALIDATE AND LINK RELATIONSHIPS ---
  const totalIndis = Object.keys(people).length;
  if (totalIndis > 5000) {
    warnings.push(`Large GEDCOM import warning: ${totalIndis} individuals`);
  }

  // 1. Check person-to-family missing references
  personFamRefs.forEach(({ tag, famId }) => {
    if (!families[famId]) {
      warnings.push(`Missing FAM reference from ${tag}: ${famId}`);
    }
  });

  // 2. Check family-to-person missing references and self-parenting
  Object.entries(families).forEach(([famId, fam]) => {
    if (fam.husb && !people[fam.husb]) {
      warnings.push(`Missing INDI reference from HUSB: ${fam.husb}`);
      fam.husb = undefined;
    }
    if (fam.wife && !people[fam.wife]) {
      warnings.push(`Missing INDI reference from WIFE: ${fam.wife}`);
      fam.wife = undefined;
    }

    const validChildren: string[] = [];
    fam.children.forEach((childId) => {
      if (!people[childId]) {
        warnings.push(`Missing INDI reference from CHIL: ${childId}`);
        return;
      }

      if (childId === fam.husb || childId === fam.wife) {
        warnings.push(`Self-parent relationship omitted in family: ${famId}`);
        return;
      }

      validChildren.push(childId);
    });
    fam.children = validChildren;
  });

  // 3. Cycle Detection
  const parentsMap = new Map<string, Set<string>>();
  Object.keys(people).forEach((id) => {
    parentsMap.set(id, new Set<string>());
  });

  Object.values(families).forEach((fam) => {
    const { husb, wife, children } = fam;
    children.forEach((childId) => {
      const pSet = parentsMap.get(childId);
      if (pSet) {
        if (husb) pSet.add(husb);
        if (wife) pSet.add(wife);
      }
    });
  });

  const visited = new Set<string>();
  const stack = new Set<string>();
  const removedEdges = new Set<string>();

  const detectCycle = (curr: string) => {
    visited.add(curr);
    stack.add(curr);

    const parents = parentsMap.get(curr) || new Set<string>();
    for (const parentId of parents) {
      if (removedEdges.has(`${curr}:${parentId}`)) {
        continue;
      }

      if (stack.has(parentId)) {
        warnings.push(`Parent-child cycle omitted: ${curr} -> ${parentId}`);
        removedEdges.add(`${curr}:${parentId}`);
      } else if (!visited.has(parentId)) {
        detectCycle(parentId);
      }
    }

    stack.delete(curr);
  };

  Object.keys(people).forEach((id) => {
    if (!visited.has(id)) {
      detectCycle(id);
    }
  });

  // 4. Link relationships
  Object.values(families).forEach((fam) => {
    const { husb, wife, children, marrDate, marrPlace, divDate, divPlace } = fam;

    // Link Spouses
    if (husb && wife && people[husb] && people[wife]) {
      if (!people[husb].spouses.includes(wife)) people[husb].spouses.push(wife);
      if (!people[wife].spouses.includes(husb)) people[wife].spouses.push(husb);

      const relType = divDate ? 'divorced' : 'married';
      const relInfo = {
        type: relType as RelationshipStatus,
        startDate: marrDate || '',
        startPlace: marrPlace || '',
        endDate: divDate || '',
        endPlace: divPlace || '',
      };

      if (!people[husb].partnerDetails) people[husb].partnerDetails = {};
      if (!people[wife].partnerDetails) people[wife].partnerDetails = {};

      people[husb].partnerDetails![wife] = relInfo;
      people[wife].partnerDetails![husb] = relInfo;
    }

    // Link Children
    children.forEach((childId) => {
      if (people[childId]) {
        const childParents = people[childId].parents;
        if (husb && people[husb] && !removedEdges.has(`${childId}:${husb}`)) {
          if (!childParents.includes(husb)) childParents.push(husb);
          if (!people[husb].children.includes(childId)) people[husb].children.push(childId);
        }
        if (wife && people[wife] && !removedEdges.has(`${childId}:${wife}`)) {
          if (!childParents.includes(wife)) childParents.push(wife);
          if (!people[wife].children.includes(childId)) people[wife].children.push(childId);
        }
      }
    });
  });

  // Define hidden warnings property
  Object.defineProperty(people, '_importWarnings', {
    value: warnings,
    enumerable: false,
    writable: true,
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
