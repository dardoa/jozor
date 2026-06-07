
import { describe, it, expect } from 'vitest';
import { buildLayoutSemanticsSnapshot } from '../familyGraphSemantics';
import type { FamilyGraph } from '../familyGraph';
import type { Person } from '../../types';


describe('Family Tree Semantics - Real Data Test', () => {
  const testData = {
    "people": {
      "aad631cd-09a8-42cd-b4af-52946261d281": {
        "id": "aad631cd-09a8-42cd-b4af-52946261d281",
        "firstName": "محمود",
        "gender": "male",
        "spouses": ["0b8d9754-ea63-415c-80b8-1f0b8fd5f7d5"],
        "children": ["78e25317-7766-4b5e-a59b-328f20df8a2a"]
      },
      "0b8d9754-ea63-415c-80b8-1f0b8fd5f7d5": {
        "id": "0b8d9754-ea63-415c-80b8-1f0b8fd5f7d5",
        "firstName": "نورية",
        "gender": "female",
        "spouses": ["aad631cd-09a8-42cd-b4af-52946261d281"],
        "children": ["78e25317-7766-4b5e-a59b-328f20df8a2a"]
      },
      "78e25317-7766-4b5e-a59b-328f20df8a2a": {
        "id": "78e25317-7766-4b5e-a59b-328f20df8a2a",
        "firstName": "محمد",
        "gender": "male",
        "parents": ["aad631cd-09a8-42cd-b4af-52946261d281", "0b8d9754-ea63-415c-80b8-1f0b8fd5f7d5"],
        "spouses": ["5e05643e-8190-49e0-bec8-ea485e438b93"],
        "children": ["9f700bfb-4503-48a3-995f-cff8fafa3205"]
      },
      "5e05643e-8190-49e0-bec8-ea485e438b93": {
        "id": "5e05643e-8190-49e0-bec8-ea485e438b93",
        "firstName": "مريم",
        "gender": "female",
        "spouses": ["78e25317-7766-4b5e-a59b-328f20df8a2a"],
        "children": ["9f700bfb-4503-48a3-995f-cff8fafa3205"],
        "parents": ["c6810ecd-eb1e-43a7-8f8a-1b885e9c13e1", "64392415-5ef0-46f3-b869-8adddb4fa9e3"]
      },
      "9f700bfb-4503-48a3-995f-cff8fafa3205": {
        "id": "9f700bfb-4503-48a3-995f-cff8fafa3205",
        "firstName": "حفيدة",
        "gender": "female",
        "parents": ["78e25317-7766-4b5e-a59b-328f20df8a2a", "5e05643e-8190-49e0-bec8-ea485e438b93"]
      }
    }
  };

  // Mock Family Graph from data
  const familyGraph = {
    people: testData.people as unknown as Record<string, Person>,
    families: {
      "fam-mahmoud-nouriya": {
        id: "fam-mahmoud-nouriya",
        parentIds: ["aad631cd-09a8-42cd-b4af-52946261d281", "0b8d9754-ea63-415c-80b8-1f0b8fd5f7d5"],
        childIds: ["78e25317-7766-4b5e-a59b-328f20df8a2a"]
      },
      "fam-mohammad-maryam": {
        id: "fam-mohammad-maryam",
        parentIds: ["78e25317-7766-4b5e-a59b-328f20df8a2a", "5e05643e-8190-49e0-bec8-ea485e438b93"],
        childIds: ["9f700bfb-4503-48a3-995f-cff8fafa3205"]
      }
    }
  } as unknown as FamilyGraph;

  it('should ensure the Female Root (Nouriya) owns her family when focused', () => {
    const rootId = "0b8d9754-ea63-415c-80b8-1f0b8fd5f7d5"; // نورية
    const snapshot = buildLayoutSemanticsSnapshot(familyGraph, rootId, {});

    // Check decision for the family
    const decision = snapshot.familyDecisions["fam-mahmoud-nouriya"];
    expect(decision).toBeDefined();
    expect(decision?.ownerId).toBe(rootId); // Root must own the family
    expect(decision?.reason).toBe('root-supremacy');
    
    // Ensure Mahmoud (husband) is canonical and has a role
    expect(snapshot.personRoles["aad631cd-09a8-42cd-b4af-52946261d281"].role).toBe('canonical');
  });

  it('should respect bloodline over external spouses in branches', () => {
    const rootId = "aad631cd-09a8-42cd-b4af-52946261d281"; // محمود
    const snapshot = buildLayoutSemanticsSnapshot(familyGraph, rootId, {});

    // In the family of Mohammad (son) and Maryam (wife), Mohammad is the bloodline
    const decision = snapshot.familyDecisions["fam-mohammad-maryam"];
    expect(decision?.ownerId).toBe("78e25317-7766-4b5e-a59b-328f20df8a2a"); // Mohammad
    expect(decision?.reason).toBe('bloodline-priority');
  });

  it('should not hide external spouses even if they are not bloodline', () => {
    const rootId = "aad631cd-09a8-42cd-b4af-52946261d281";
    const snapshot = buildLayoutSemanticsSnapshot(familyGraph, rootId, {});

    // Maryam is external but should be canonical (visible)
    expect(snapshot.personRoles["5e05643e-8190-49e0-bec8-ea485e438b93"].role).toBe('canonical');
  });
});

