import { describe, it, expect } from 'vitest';
import { exportToGEDCOM, importFromGEDCOM, formatGedcomDate, gedcomDateToIso } from '../gedcomLogic';
import { Person } from '../../types';

// Mock Data
const mockPerson: Person = {
    id: 'p1',
    firstName: 'John',
    lastName: 'Doe',
    gender: 'male',
    birthDate: '1990-01-01',
    birthPlace: 'New York',
    parents: [],
    spouses: ['p2'],
    children: ['p3'],
    title: '',
    middleName: '',
    birthName: '',
    nickName: '',
    suffix: '',
    birthSource: '',
    deathDate: '',
    deathPlace: '',
    deathSource: '',
    isDeceased: false,
    profession: 'Engineer',
    company: '',
    interests: '',
    bio: 'A simple man.',
    gallery: [],
    voiceNotes: [],
    sources: [],
    events: [],
    email: '',
    website: '',
    blog: '',
    address: '',
};

const mockSpouse: Person = {
    ...mockPerson,
    id: 'p2',
    firstName: 'Jane',
    lastName: 'Doe',
    gender: 'female',
    spouses: ['p1'],
    children: ['p3'],
};

const mockChild: Person = {
    ...mockPerson,
    id: 'p3',
    firstName: 'Baby',
    lastName: 'Doe',
    gender: 'male',
    parents: ['p1', 'p2'],
    spouses: [],
    children: [],
};

const mockFamily = {
    p1: mockPerson,
    p2: mockSpouse,
    p3: mockChild,
};

describe('GEDCOM Logic - Date Functions', () => {
    describe('formatGedcomDate', () => {
        it('should format ISO date to GEDCOM format', () => {
            expect(formatGedcomDate('1990-01-15')).toBe('15 JAN 1990');
            expect(formatGedcomDate('2000-12-31')).toBe('31 DEC 2000');
        });

        it('should handle year-only dates', () => {
            // Year-only dates are parsed as Jan 1 of that year
            expect(formatGedcomDate('1990')).toBe('1 JAN 1990');
        });

        it('should handle empty or invalid dates', () => {
            expect(formatGedcomDate('')).toBe('');
            expect(formatGedcomDate('invalid')).toBe('invalid'); // Returns as-is if not parseable
        });

        it('should handle partial dates', () => {
            // Partial dates are parsed as 1st of that month
            expect(formatGedcomDate('1990-01')).toBe('1 JAN 1990');
        });
    });

    describe('gedcomDateToIso', () => {
        it('should parse GEDCOM date to ISO format', () => {
            expect(gedcomDateToIso('15 JAN 1990')).toBe('1990-01-15');
            expect(gedcomDateToIso('31 DEC 2000')).toBe('2000-12-31');
        });

        it('should handle year-only dates', () => {
            expect(gedcomDateToIso('1990')).toBe('1990');
        });

        it('should handle month-year dates', () => {
            expect(gedcomDateToIso('JAN 1990')).toBe('1990-01');
        });

        it('should handle empty or invalid dates', () => {
            expect(gedcomDateToIso('')).toBe('');
            expect(gedcomDateToIso('invalid')).toBe('invalid'); // Returns as-is if not parseable
        });

        it('should handle case-insensitive month names', () => {
            expect(gedcomDateToIso('15 jan 1990')).toBe('1990-01-15');
            expect(gedcomDateToIso('15 JAN 1990')).toBe('1990-01-15');
        });
    });
});

describe('GEDCOM Logic - Export', () => {
    describe('exportToGEDCOM - Normal Scenarios', () => {
        it('should generate valid GEDCOM header', () => {
            const output = exportToGEDCOM({});
            expect(output).toContain('0 HEAD');
            expect(output).toContain('1 GEDC');
            expect(output).toContain('0 TRLR');
        });

        it('should export individuals with basic details', () => {
            const output = exportToGEDCOM(mockFamily);
            expect(output).toContain('0 @p1@ INDI');
            expect(output).toContain('1 NAME John /Doe/');
            expect(output).toContain('1 SEX M');
            expect(output).toContain('2 DATE 1 JAN 1990');
        });

        it('should export family links (FAMS, FAMC)', () => {
            const output = exportToGEDCOM(mockFamily);
            expect(output).toContain('1 FAMS @F_p1_p2@');
            expect(output).toContain('1 FAMC @F_p1_p2@');
            expect(output).toContain('0 @F_p1_p2@ FAM');
            expect(output).toContain('1 HUSB @p1@');
            expect(output).toContain('1 WIFE @p2@');
            expect(output).toContain('1 CHIL @p3@');
        });

        it('should export profession and bio', () => {
            const output = exportToGEDCOM(mockFamily);
            expect(output).toContain('1 OCCU Engineer');
            expect(output).toContain('1 NOTE A simple man.');
        });
    });

    describe('exportToGEDCOM - Edge Cases', () => {
        it('should handle empty family tree', () => {
            const output = exportToGEDCOM({});
            expect(output).toContain('0 HEAD');
            expect(output).toContain('0 TRLR');
            expect(output).not.toContain('0 @');
        });

        it('should handle single person', () => {
            const singlePerson = { p1: mockPerson };
            const output = exportToGEDCOM(singlePerson);
            expect(output).toContain('0 @p1@ INDI');
            expect(output).toContain('1 NAME John /Doe/');
        });

        it('should handle person with missing names', () => {
            const personNoName: Person = {
                ...mockPerson,
                firstName: '',
                lastName: '',
            };
            const output = exportToGEDCOM({ p1: personNoName });
            expect(output).toContain('0 @p1@ INDI');
            expect(output).toContain('1 NAME  //'); // Note: space before slashes
        });

        it('should handle person with special characters in name', () => {
            const personSpecialChars: Person = {
                ...mockPerson,
                firstName: 'Jean-Pierre',
                lastName: "O'Brien",
            };
            const output = exportToGEDCOM({ p1: personSpecialChars });
            expect(output).toContain("1 NAME Jean-Pierre /O'Brien/");
        });

        it('should handle deceased person', () => {
            const deceased: Person = {
                ...mockPerson,
                isDeceased: true,
                deathDate: '2020-05-15',
                deathPlace: 'London',
            };
            const output = exportToGEDCOM({ p1: deceased });
            expect(output).toContain('1 DEAT');
            expect(output).toContain('2 DATE 15 MAY 2020');
            expect(output).toContain('2 PLAC London');
        });
    });
});

describe('GEDCOM Logic - Import', () => {
    describe('importFromGEDCOM - Normal Scenarios', () => {
        it('should parse basic individual', () => {
            const gedcom = `
0 HEAD
0 @p1@ INDI
1 NAME John /Doe/
1 SEX M
1 BIRT
2 DATE 1 JAN 1990
0 TRLR
      `;
            const result = importFromGEDCOM(gedcom);
            expect(result['p1']).toBeDefined();
            expect(result['p1'].firstName).toBe('John');
            expect(result['p1'].lastName).toBe('Doe');
            expect(result['p1'].gender).toBe('male');
            expect(result['p1'].birthDate).toBe('1990-01-01');
        });

        it('should link families correctly', () => {
            const gedcom = `
0 HEAD
0 @husband@ INDI
1 NAME John /Doe/
1 SEX M
1 FAMS @fam1@
0 @wife@ INDI
1 NAME Jane /Doe/
1 SEX F
1 FAMS @fam1@
0 @child@ INDI
1 NAME Baby /Doe/
1 SEX M
1 FAMC @fam1@
0 @fam1@ FAM
1 HUSB @husband@
1 WIFE @wife@
1 CHIL @child@
0 TRLR
      `;
            const result = importFromGEDCOM(gedcom);
            const husb = result['husband'];
            const wife = result['wife'];
            const child = result['child'];

            expect(husb.spouses).toContain('wife');
            expect(wife.spouses).toContain('husband');
            expect(husb.children).toContain('child');
            expect(wife.children).toContain('child');
            expect(child.parents).toContain('husband');
            expect(child.parents).toContain('wife');
        });

        it('should parse death information', () => {
            const gedcom = `
0 HEAD
0 @p1@ INDI
1 NAME John /Doe/
1 SEX M
1 DEAT
2 DATE 15 MAY 2020
2 PLAC London
0 TRLR
      `;
            const result = importFromGEDCOM(gedcom);
            expect(result['p1'].isDeceased).toBe(true);
            expect(result['p1'].deathDate).toBe('2020-05-15');
            expect(result['p1'].deathPlace).toBe('London');
        });
    });

    describe('importFromGEDCOM - Edge Cases', () => {
        it('should handle empty GEDCOM', () => {
            const gedcom = `
0 HEAD
0 TRLR
      `;
            const result = importFromGEDCOM(gedcom);
            expect(Object.keys(result).length).toBe(0);
        });

        it('should handle malformed GEDCOM gracefully', () => {
            const gedcom = `
0 HEAD
0 @p1@ INDI
INVALID LINE
1 NAME John /Doe/
0 TRLR
      `;
            const result = importFromGEDCOM(gedcom);
            // Should still parse what it can
            expect(result['p1']).toBeDefined();
        });

        it('should handle person without name', () => {
            const gedcom = `
0 HEAD
0 @p1@ INDI
1 SEX M
0 TRLR
      `;
            const result = importFromGEDCOM(gedcom);
            expect(result['p1']).toBeDefined();
            expect(result['p1'].firstName).toBe('Unknown'); // Default value
            expect(result['p1'].lastName).toBe(''); // Empty
        });

        it('should handle multiple children in family', () => {
            const gedcom = `
0 HEAD
0 @fam1@ FAM
1 HUSB @h1@
1 WIFE @w1@
1 CHIL @c1@
1 CHIL @c2@
1 CHIL @c3@
0 @h1@ INDI
1 NAME Father /Doe/
1 SEX M
0 @w1@ INDI
1 NAME Mother /Doe/
1 SEX F
0 @c1@ INDI
1 NAME Child1 /Doe/
1 SEX M
0 @c2@ INDI
1 NAME Child2 /Doe/
1 SEX F
0 @c3@ INDI
1 NAME Child3 /Doe/
1 SEX M
0 TRLR
      `;
            const result = importFromGEDCOM(gedcom);
            expect(result['h1'].children).toHaveLength(3);
            expect(result['w1'].children).toHaveLength(3);
            expect(result['c1'].parents).toContain('h1');
            expect(result['c1'].parents).toContain('w1');
        });

        it('should handle person with multiple spouses', () => {
            const gedcom = `
0 HEAD
0 @p1@ INDI
1 NAME Person /One/
1 SEX M
1 FAMS @f1@
1 FAMS @f2@
0 @s1@ INDI
1 NAME Spouse /One/
1 SEX F
0 @s2@ INDI
1 NAME Spouse /Two/
1 SEX F
0 @f1@ FAM
1 HUSB @p1@
1 WIFE @s1@
0 @f2@ FAM
1 HUSB @p1@
1 WIFE @s2@
0 TRLR
      `;
            const result = importFromGEDCOM(gedcom);
            expect(result['p1'].spouses).toHaveLength(2);
            expect(result['p1'].spouses).toContain('s1');
            expect(result['p1'].spouses).toContain('s2');
        });
    });
});

describe('GEDCOM Logic - Round-trip', () => {
    it('should preserve data through export and import', () => {
        const exported = exportToGEDCOM(mockFamily);
        const imported = importFromGEDCOM(exported);

        // Check that all people are present
        expect(Object.keys(imported)).toHaveLength(3);
        expect(imported['p1']).toBeDefined();
        expect(imported['p2']).toBeDefined();
        expect(imported['p3']).toBeDefined();

        // Check relationships
        expect(imported['p1'].spouses).toContain('p2');
        expect(imported['p1'].children).toContain('p3');
        expect(imported['p3'].parents).toContain('p1');
        expect(imported['p3'].parents).toContain('p2');
    });
});
