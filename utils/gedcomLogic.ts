import { Person } from '../types';
import { createPerson } from './familyLogic';

// Helper to format date for GEDCOM (YYYY-MM-DD -> DD MMM YYYY)
const formatGedcomDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr; // Return as is if not parseable
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

// Helper to parse GEDCOM date (DD MMM YYYY -> YYYY-MM-DD)
const gedcomDateToIso = (gedDate: string): string => {
    if (!gedDate) return '';
    
    // Check if it's just a year
    if (/^\d{4}$/.test(gedDate.trim())) return gedDate.trim();

    const months: Record<string, string> = {
        "JAN": "01", "FEB": "02", "MAR": "03", "APR": "04", "MAY": "05", "JUN": "06",
        "JUL": "07", "AUG": "08", "SEP": "09", "OCT": "10", "NOV": "11", "DEC": "12"
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

export const exportToGEDCOM = (people: Record<string, Person>): string => {
    const lines: string[] = [];
    lines.push("0 HEAD");
    lines.push("1 SOUR JOZOR_APP");
    lines.push("1 GEDC");
    lines.push("2 VERS 5.5.1");
    lines.push("2 FORM LINEAGE-LINKED");
    lines.push("1 CHAR UTF-8");

    const personIds = Object.keys(people);
    const processedPairs = new Set<string>();
    const familyLines: string[] = [];

    // 1. Export Individuals
    personIds.forEach(id => {
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
            lines.push("1 BIRT");
            if (p.birthDate) lines.push(`2 DATE ${formatGedcomDate(p.birthDate)}`);
            if (p.birthPlace) lines.push(`2 PLAC ${p.birthPlace}`);
        }

        // Death
        if (p.isDeceased) {
            lines.push("1 DEAT");
            if (p.deathDate) lines.push(`2 DATE ${formatGedcomDate(p.deathDate)}`);
            if (p.deathPlace) lines.push(`2 PLAC ${p.deathPlace}`);
        }

        // Bio/Note
        if (p.bio) {
            lines.push("1 NOTE " + p.bio.replace(/\n/g, " "));
        }

        // Occupation
        if (p.profession) {
            lines.push(`1 OCCU ${p.profession}`);
        }

        // Prepare Families logic
        p.spouses.forEach(spouseId => {
            const pair = [id, spouseId].sort().join('_');
            if (!processedPairs.has(pair)) {
                processedPairs.add(pair);
                const famId = `F_${pair}`;
                
                // Add FAMS link to individual (Self)
                lines.push(`1 FAMS @${famId}@`);

                // Create Family Record (buffered)
                const spouse = people[spouseId];
                let husb = null;
                let wife = null;

                if (p.gender === 'male') husb = id; else wife = id;
                if (spouse) {
                    if (spouse.gender === 'male') husb = spouseId; else wife = spouseId;
                }
                if (!husb && !wife) { husb = id; wife = spouseId; }

                const children = p.children.filter(childId => 
                    spouse && people[childId] && people[childId].parents.includes(spouseId)
                );
                
                // Get relationship info if exists
                const relInfo = p.partnerDetails?.[spouseId];

                let famBlock = `0 @${famId}@ FAM\n`;
                if (husb) famBlock += `1 HUSB @${husb}@\n`;
                if (wife) famBlock += `1 WIFE @${wife}@\n`;
                children.forEach(c => famBlock += `1 CHIL @${c}@\n`);
                
                if (relInfo) {
                    if (relInfo.type === 'married' || relInfo.type === 'divorced') {
                        famBlock += `1 MARR\n`;
                        if (relInfo.startDate) famBlock += `2 DATE ${formatGedcomDate(relInfo.startDate)}\n`;
                        if (relInfo.startPlace) famBlock += `2 PLAC ${relInfo.startPlace}\n`;
                    }
                    if (relInfo.type === 'divorced') {
                        famBlock += `1 DIV\n`;
                        if (relInfo.endDate) famBlock += `2 DATE ${formatGedcomDate(relInfo.endDate)}\n`;
                         if (relInfo.endPlace) famBlock += `2 PLAC ${relInfo.endPlace}\n`;
                    }
                }

                familyLines.push(famBlock);
            }
        });

        // Add FAMC (Parents) - assuming first two parents form the primary family
        if (p.parents.length > 0) {
             // We need to find the FAM id for the parents. 
             // Simplification: We construct it same way as above or verify.
             // Since we sort IDs, we can reconstruct the key.
             if (p.parents.length >= 2) {
                 const pair = [...p.parents].sort().slice(0, 2).join('_');
                 lines.push(`1 FAMC @F_${pair}@`);
             }
        }
    });

    // Append Family Records
    lines.push(...familyLines);

    lines.push("0 TRLR");
    return lines.join("\n");
};

export const importFromGEDCOM = (gedcom: string): Record<string, Person> => {
    const lines = gedcom.split(/\r?\n/);
    const people: Record<string, Person> = {};
    const families: Record<string, { 
        husb?: string; 
        wife?: string; 
        children: string[]; 
        marrDate?: string; 
        marrPlace?: string; 
        divDate?: string; 
        divPlace?: string; 
    }> = {};

    let currentId = '';
    let currentType = ''; // INDI or FAM
    let currentPerson: Partial<Person> | null = null;
    let currentFam: any = null;
    
    // Context tracking for sub-tags (BIRT, DEAT, MARR)
    let currentEvent = ''; 

    lines.forEach(line => {
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

            // --- START NEW RECORD ---
            currentEvent = ''; // Reset event context
            if (rest === 'INDI' || parts[2] === 'INDI') {
                currentId = tagOrId.replace(/@/g, '');
                currentType = 'INDI';
                currentPerson = { 
                    firstName: 'Unknown', lastName: '', gender: 'male', 
                    parents: [], spouses: [], children: [], partnerDetails: {} 
                };
                currentFam = null;
            } else if (rest === 'FAM' || parts[2] === 'FAM') {
                currentId = tagOrId.replace(/@/g, '');
                currentType = 'FAM';
                currentFam = { children: [] };
                currentPerson = null;
            } else {
                currentType = '';
                currentId = '';
            }
        } 
        
        else if (currentType === 'INDI' && currentPerson) {
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
                } else if (currentEvent === 'NAME') {
                     if (tagOrId === 'GIVN') {
                         // Some GEDCOMs use GIVN, prefer this if available
                         // But we handled NAME logic above generally
                     }
                }
            }
        } 
        
        else if (currentType === 'FAM' && currentFam) {
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
        }
    });

    // Save final record
    if (currentType === 'INDI' && currentPerson && currentId) {
        people[currentId] = { ...createPerson(), ...(currentPerson as Person), id: currentId };
    }
    if (currentType === 'FAM' && currentFam && currentId) {
        families[currentId] = currentFam;
    }

    // --- SECOND PASS: LINK RELATIONSHIPS ---
    Object.values(families).forEach(fam => {
        const { husb, wife, children, marrDate, marrPlace, divDate, divPlace } = fam;
        
        // Link Spouses
        if (husb && wife && people[husb] && people[wife]) {
            // Add to spouse arrays
            if (!people[husb].spouses.includes(wife)) people[husb].spouses.push(wife);
            if (!people[wife].spouses.includes(husb)) people[wife].spouses.push(husb);

            // Add Partner Details (Marriage Date/Place)
            const relType = divDate ? 'divorced' : 'married';
            const relInfo = {
                type: relType as any,
                startDate: marrDate || '',
                startPlace: marrPlace || '',
                endDate: divDate || '',
                endPlace: divPlace || ''
            };

            // Initialize partnerDetails object if missing
            if (!people[husb].partnerDetails) people[husb].partnerDetails = {};
            if (!people[wife].partnerDetails) people[wife].partnerDetails = {};

            people[husb].partnerDetails![wife] = relInfo;
            people[wife].partnerDetails![husb] = relInfo;
        }

        // Link Children
        children.forEach(childId => {
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

    return people;
};