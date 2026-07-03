import { describe, expect, it } from 'vitest';
import { importFromGEDCOM, exportToGEDCOM } from '../gedcomLogic';
import { deriveRelationshipsFromPeople } from '../../types/relationship';
import { HtmlManuscriptRenderer, ManuscriptStructureBuilder, MarkdownManuscriptRenderer } from '../../features/publishing';
import { maskPeopleMap } from '../privacyUtils';

describe('Import/Export End-to-End Lifecycle Validation', () => {
  const sampleGedcom = `0 HEAD
1 CHAR UTF-8
0 @I1@ INDI
1 NAME Father /Doe/
1 SEX M
1 BIRT
2 DATE 1 JAN 1950
2 PLAC London
0 @I2@ INDI
1 NAME Mother /Doe/
1 SEX F
0 @I3@ INDI
1 NAME Child /Doe/
1 SEX M
1 BIRT
2 DATE 10 MAY 1980
2 PLAC Kafranbel
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
0 TRLR`;

  it('GEDCOM import to RelationshipEdge to GEDCOM export roundtrip works', () => {
    // 1. GEDCOM Import
    const importedPeople = importFromGEDCOM(sampleGedcom);
    expect(importedPeople['I1']).toBeDefined();
    expect(importedPeople['I2']).toBeDefined();
    expect(importedPeople['I3']).toBeDefined();

    // 2. Derive RelationshipEdge
    const edges = deriveRelationshipsFromPeople('test-tree', importedPeople);
    const edgeList = Object.values(edges);
    expect(edgeList.length).toBe(3); // 1 spouse, 2 parents

    // 3. GEDCOM Export using derived edges
    const exportedGedcom = exportToGEDCOM(importedPeople, {
      relationshipEdges: edges,
    });

    // 4. Assert structure
    expect(exportedGedcom).toContain('HUSB @I1@');
    expect(exportedGedcom).toContain('WIFE @I2@');
    expect(exportedGedcom).toContain('CHIL @I3@');
  });

  it('Unsafe imported edges (self-parent, cycles) are omitted from exported GEDCOM', () => {
    const unsafeGedcom = `0 HEAD
1 CHAR UTF-8
0 @I1@ INDI
1 NAME Self /Doe/
1 SEX M
0 @I2@ INDI
1 NAME Cycle A /Doe/
1 SEX M
0 @I3@ INDI
1 NAME Cycle B /Doe/
1 SEX F
0 @F1@ FAM
1 HUSB @I1@
1 CHIL @I1@
0 @F2@ FAM
1 HUSB @I2@
1 CHIL @I3@
0 @F3@ FAM
1 HUSB @I3@
1 CHIL @I2@
0 TRLR`;

    const importedPeople = importFromGEDCOM(unsafeGedcom);
    const edges = deriveRelationshipsFromPeople('test-tree', importedPeople);
    const exportedGedcom = exportToGEDCOM(importedPeople, {
      relationshipEdges: edges,
    });

    // Unsafe relationships must not appear in exported families
    // Verify no cycle remains or self parenting links
    const selfParentRel = Object.values(edges).some(e => e.fromPersonId === 'I1' && e.toPersonId === 'I1');
    expect(selfParentRel).toBe(false);
    expect(exportedGedcom).not.toContain('CHIL @I1@');
  });

  it('FamilyManuscriptModel and Markdown manuscript builds correctly from imported data', () => {
    const importedPeople = importFromGEDCOM(sampleGedcom);
    const edges = deriveRelationshipsFromPeople('test-tree', importedPeople);

    // Build Model
    const model = ManuscriptStructureBuilder.buildModel({
      rootPersonId: 'I1',
      people: importedPeople,
      relationshipEdges: edges,
      evidence: { sources: {}, citations: {} },
    });

    expect(model.rootPersonId).toBe('I1');
    const peopleChapter = model.chapters.find(c => c.type === 'people');
    expect(peopleChapter?.people?.length).toBe(3);

    // Render Markdown
    const markdown = MarkdownManuscriptRenderer.renderToMarkdown(model, {
      includeMetadata: false,
    });

    // Check display name rendering (IDs must not be the primary display text)
    expect(markdown).toContain('Child Doe');
    expect(markdown).toContain('Father Doe');
    expect(markdown).not.toContain('# I1');
    expect(markdown).not.toContain('# I3');

    const html = HtmlManuscriptRenderer.renderToHtml(model, { language: 'en' });
    expect(html).toContain('Father Doe');
    expect(html).toContain('Child Doe');
    expect(html).not.toContain('<h2>I1</h2>');
    expect(html).not.toContain('<h2>I3</h2>');
  });

  it('Viewer privacy masking applies on imported data and hides raw private details', () => {
    const importedPeople = importFromGEDCOM(sampleGedcom);

    // Insert sensitive info to mimic raw living person state before masking
    importedPeople['I3'] = {
      ...importedPeople['I3'],
      firstName: 'SensitiveLivingName',
      birthDate: '1990-01-01',
      birthPlace: 'Sensitive Birth Place',
      bio: 'Sensitive Bio',
      // mark as living
      isDeceased: false,
    };

    // Mask data for Viewer role
    const maskedPeople = maskPeopleMap(importedPeople);

    // Verify raw details are omitted
    expect(maskedPeople['I3'].firstName).not.toBe('SensitiveLivingName');
    expect(maskedPeople['I3'].birthDate).not.toBe('1990-01-01');
    expect(maskedPeople['I3'].birthPlace).not.toBe('Sensitive Birth Place');
    expect(maskedPeople['I3'].bio).not.toBe('Sensitive Bio');

    // Build model on masked data
    const edges = deriveRelationshipsFromPeople('test-tree', maskedPeople);
    const model = ManuscriptStructureBuilder.buildModel({
      rootPersonId: 'I1',
      people: maskedPeople,
      relationshipEdges: edges,
      evidence: { sources: {}, citations: {} },
    });

    // Render markdown on masked model
    const markdown = MarkdownManuscriptRenderer.renderToMarkdown(model, {
      includeMetadata: false,
    });

    expect(markdown).not.toContain('SensitiveLivingName');
    expect(markdown).not.toContain('1990-01-01');
    expect(markdown).not.toContain('Sensitive Birth Place');
    expect(markdown).not.toContain('Sensitive Bio');

    // Export GEDCOM on masked data
    const exportedGedcom = exportToGEDCOM(maskedPeople, {
      relationshipEdges: edges,
    });

    expect(exportedGedcom).not.toContain('SensitiveLivingName');
    expect(exportedGedcom).not.toContain('1990');
    expect(exportedGedcom).not.toContain('Sensitive Birth Place');
  });

  it('GEDCOM SOUR elements survive import and do not break manuscript building', () => {
    const gedcomWithSource = `0 HEAD
1 CHAR UTF-8
0 @S1@ SOUR
1 TITL Civil Birth Register
0 @I1@ INDI
1 NAME Source /Person/
1 SEX M
1 BIRT
2 DATE 1 JAN 1950
2 SOUR @S1@
0 TRLR`;

    const importedPeople = importFromGEDCOM(gedcomWithSource);
    expect(importedPeople['I1'].birthSource).toBe('Civil Birth Register');

    const edges = deriveRelationshipsFromPeople('test-tree', importedPeople);
    const model = ManuscriptStructureBuilder.buildModel({
      rootPersonId: 'I1',
      people: importedPeople,
      relationshipEdges: edges,
      evidence: { sources: {}, citations: {} },
    });

    expect(model.rootPersonId).toBe('I1');
    expect(() => MarkdownManuscriptRenderer.renderToMarkdown(model)).not.toThrow();
    expect(() => HtmlManuscriptRenderer.renderToHtml(model, { language: 'en' })).not.toThrow();
  });
});
