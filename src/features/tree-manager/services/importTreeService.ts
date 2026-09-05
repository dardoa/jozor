import { v4 as uuidv4 } from 'uuid';
import type { Person } from '../../../types';
import { logError, logInfo, logWarn } from '../../../utils/errorLogger';
import {
    importJozorArchiveDataForCloud,
    type JozorCloudArchiveData,
} from '../../../utils/archiveLogic';
import { importFromGEDCOMWithReport } from '../../../utils/gedcomLogic';
import {
    importTreeContent,
    createTree,
    deleteWholeTree,
} from '../../../services/supabaseTreeMutationService';
import { SupabaseStorageService } from '../../../services/supabaseStorageService';
import { deferPersonMediaObjectCleanup } from '../../../services/personMediaCleanupQueue';
import type { PersonMediaAssetRef } from '../../../types';
import { createLimit } from '../../../../shared/concurrency';
import { validatePerson } from '../../../utils/familyLogic';

interface CloudArchiveImportOptions {
    mediaByPersonId: JozorCloudArchiveData['mediaByPersonId'];
    warnings: string[];
}

const rollbackCloudImport = async ({
    treeId,
    ownerId,
    userEmail,
    token,
    uploadedAssets,
}: {
    treeId: string;
    ownerId: string;
    userEmail: string;
    token?: string;
    uploadedAssets: PersonMediaAssetRef[];
}): Promise<void> => {
    const cleanupResults = await Promise.allSettled(uploadedAssets.map((asset) =>
        SupabaseStorageService.deletePersonMediaAsset(asset, ownerId, userEmail, token)
    ));
    let hasDeferredCleanup = false;
    for (let index = 0; index < cleanupResults.length; index += 1) {
        if (cleanupResults[index].status === 'fulfilled') continue;
        hasDeferredCleanup = true;
        const asset = uploadedAssets[index];
        try {
            await deferPersonMediaObjectCleanup(
                { treeId, userId: ownerId, token },
                { bucket: asset.bucket, objectPath: asset.objectPath, assetId: asset.assetId }
            );
        } catch (error) {
            logError('ARCHIVE_IMPORT_CLEANUP_QUEUE_FAILED', error, {
                showToast: false,
                metadata: { treeId, assetId: asset.assetId },
            });
        }
    }
    if (hasDeferredCleanup) {
        logError('ARCHIVE_IMPORT_ROLLBACK_DEFERRED', 'Uploaded archive media requires deferred cleanup.', {
            showToast: false,
            metadata: { treeId, deferredCount: cleanupResults.filter((result) => result.status === 'rejected').length },
        });
        return;
    }
    try {
        await deleteWholeTree(treeId, ownerId, userEmail, token);
    } catch (error) {
        logError('ARCHIVE_IMPORT_TREE_ROLLBACK_FAILED', error, {
            showToast: false,
            metadata: { treeId },
        });
    }
};

const attachCloudArchiveMedia = async ({
    treeId,
    ownerId,
    userEmail,
    token,
    mediaByPersonId,
    peopleByOriginalId,
    uploadedAssets,
}: {
    treeId: string;
    ownerId: string;
    userEmail: string;
    token?: string;
    mediaByPersonId: JozorCloudArchiveData['mediaByPersonId'];
    peopleByOriginalId: Map<string, Person>;
    uploadedAssets: PersonMediaAssetRef[];
}): Promise<void> => {
    const limit = createLimit(4);
    const jobs: Array<Promise<{
        originalPersonId: string;
        type: 'avatar' | 'gallery';
        galleryIndex: number;
        asset: PersonMediaAssetRef;
    }>> = [];

    for (const originalPersonId of Object.keys(mediaByPersonId).sort()) {
        const person = peopleByOriginalId.get(originalPersonId);
        if (!person) {
            throw new Error('Archive media references a person that is not present in the tree.');
        }
        const media = mediaByPersonId[originalPersonId];
        if (media.avatar) {
            jobs.push(limit(async () => {
                const asset = await SupabaseStorageService.uploadPersonMediaBlob({
                    treeId, personId: person.id, blob: media.avatar!, kind: 'profile-photo',
                    uid: ownerId, email: userEmail, token,
                });
                uploadedAssets.push(asset);
                return { originalPersonId, type: 'avatar', galleryIndex: -1, asset };
            }));
        }
        media.gallery.forEach((blob, galleryIndex) => {
            jobs.push(limit(async () => {
                const asset = await SupabaseStorageService.uploadPersonMediaBlob({
                    treeId, personId: person.id, blob, kind: 'gallery-photo',
                    uid: ownerId, email: userEmail, token,
                });
                uploadedAssets.push(asset);
                return { originalPersonId, type: 'gallery', galleryIndex, asset };
            }));
        });
    }

    const results = await Promise.allSettled(jobs);
    const failed = results.find((result) => result.status === 'rejected');
    if (failed?.status === 'rejected') throw failed.reason;

    for (const result of results) {
        if (result.status !== 'fulfilled') continue;
        const person = peopleByOriginalId.get(result.value.originalPersonId);
        if (!person) continue;
        if (result.value.type === 'avatar') {
            person.photoAsset = result.value.asset;
            continue;
        }
        person.gallery[result.value.galleryIndex] = {
            id: result.value.asset.assetId,
            asset: result.value.asset,
            version: result.value.asset.version,
            createdAt: result.value.asset.createdAt,
        };
    }
};

/**
 * Validates the imported JSON structure.
 * @param data - The parsed JSON data.
 * @returns True if valid, throws error otherwise.
 */
const validateImportData = (data: unknown): boolean => {
    if (!data || typeof data !== 'object') {
        throw new Error('Invalid JSON format: Root must be an object.');
    }
    const record = data as Record<string, unknown>;
    // Check if it's the wrapped format { people: ... } or the direct format { "id": Person ... }
    if (record.people && typeof record.people === 'object') {
        return true;
    }

    // Check if it looks like a dictionary of people (keys are IDs, values are objects)
    const keys = Object.keys(record);
    if (keys.length > 0) {
        const firstSample = record[keys[0]] as Record<string, unknown> | undefined;
        if (firstSample && typeof firstSample === 'object' && 'id' in firstSample && 'firstName' in firstSample) {
            return true;
        }
    }

    // Empty object is valid technically but useless
    if (keys.length === 0) return true;

    throw new Error('Invalid JSON format: Missing "people" object or compatible structure.');
};

/**
 * Imports a family tree from a JSON object.
 * @param ownerId - The owner's User ID.
 * @param file - The JSON file to import.
 * @returns The new tree ID.
 */
export const importTreeFromJSONItem = async (
    ownerId: string,
    userEmail: string,
    jsonContent: string,
    token?: string,
    archiveOptions?: CloudArchiveImportOptions
): Promise<string> => {
    let data: unknown;
    try {
        data = JSON.parse(jsonContent);
    } catch (e) {
        logError('importTreeFromJSONItem parse', e, {
            category: 'VALIDATION',
            severity: 'MEDIUM',
            metadata: { operationType: 'import_tree_parse' }
        });
        throw new Error('Invalid JSON file.');
    }

    logInfo('importTreeFromJSONItem validate', 'Importing tree data structure verified.', {
        operationType: 'import_tree_validate'
    });

    // Determine structure
    let peopleMap: Record<string, Person>;
    const record = data as Record<string, unknown>;
    const importedSettings = record.settings && typeof record.settings === 'object' && !Array.isArray(record.settings)
        ? record.settings as Record<string, unknown>
        : undefined;

    if (record.people && typeof record.people === 'object') {
        peopleMap = record.people as Record<string, Person>;
    } else if (validateImportData(data)) {
        // It IS the map
        peopleMap = record as Record<string, Person>;
    } else {
        logError('importTreeFromJSONItem structure', 'Validation failed for imported data.', {
            category: 'VALIDATION',
            severity: 'MEDIUM',
            metadata: { operationType: 'import_tree_structure' }
        });
        throw new Error('Invalid tree data structure.');
    }

    const peopleArray = Object.values(peopleMap).map((person) => validatePerson(person));

    if (peopleArray.length === 0) {
        throw new Error('The imported tree contains no people.');
    }

    // 1. Prepare and validate people before creating any cloud resources.
    // ALWAYS generate new IDs when importing as a new tree to prevent ID collisions
    // with existing trees or "stealing" rows if IDs already exist.
    const idMap = new Map<string, string>();

    // Create new UUIDs for every person
    peopleArray.forEach(p => {
        if (!p.id || idMap.has(p.id)) {
            throw new Error('The imported tree contains missing or duplicate person IDs.');
        }
        idMap.set(p.id, uuidv4());
    });

    // Remap people and their relationships in memory
    logInfo('importTreeFromJSONItem remap', 'Remapping imported people.', {
        operationType: 'import_tree_remap',
        metadata: { peopleCount: peopleArray.length }
    });
    const peopleByOriginalId = new Map<string, Person>();
    const finalPeople = peopleArray.map(p => {
        const remappedPersonId = idMap.get(p.id);
        if (!remappedPersonId) {
            throw new Error('The imported tree contains an invalid person ID.');
        }
        const remapIds = (ids: string[]): string[] => ids.flatMap((id) => {
            const remappedId = idMap.get(id);
            if (!remappedId && archiveOptions) {
                throw new Error('Archive relationships reference a person that is not present in the tree.');
            }
            return remappedId ? [remappedId] : [];
        });
        const remapped: Person = {
            ...p,
            id: remappedPersonId,
            firstName: p.firstName || 'Unknown',
            lastName: p.lastName || '',
            gender: p.gender || 'male',
            parents: remapIds(p.parents || []),
            children: remapIds(p.children || []),
            spouses: remapIds(p.spouses || []),
        };
        peopleByOriginalId.set(p.id, remapped);
        return remapped;
    });

    if (archiveOptions) {
        for (const originalPersonId of Object.keys(archiveOptions.mediaByPersonId)) {
            if (!peopleByOriginalId.has(originalPersonId)) {
                throw new Error('Archive media references a person that is not present in the tree.');
            }
        }
    }

    // 2. Extract and deduplicate relationships entirely in memory.
    const relationships: {
        person_id: string;
        relative_id: string;
        type: 'parent' | 'child' | 'spouse';
    }[] = [];

    const processedPairs = new Set<string>();

    const addRel = (id1: string, id2: string, type: 'parent' | 'child' | 'spouse', originalType: 'parent' | 'child' | 'spouse') => {
        if (!id1 || !id2) return;

        // Sort IDs to create a unique key for the pair
        const [p1, p2] = [id1, id2].sort();

        const key = type === 'spouse'
            ? `${p1}-${p2}-spouse`
            : `${p1}-${p2}-parent-child`;

        if (processedPairs.has(key)) return;

        relationships.push({
            person_id: id1,
            relative_id: id2,
            type: originalType
        });
        processedPairs.add(key);
    };

    finalPeople.forEach((p) => {
        // Person P is the PARENT of childId -> relation type is 'child'
        (p.children || []).forEach((childId) => {
            addRel(p.id, childId, 'child', 'child');
        });

        // Person P is the CHILD of parentId -> relation type is 'parent'
        (p.parents || []).forEach((parentId) => {
            addRel(p.id, parentId, 'parent', 'parent');
        });

        (p.spouses || []).forEach((spouseId) => {
            addRel(p.id, spouseId, 'spouse', 'spouse');
        });
    });

    // 3. Create cloud resources only after the archive has passed validation.
    const treeName = `Imported Tree ${new Date().toLocaleDateString()}`;
    const treeId = await createTree(ownerId, userEmail, treeName, token, importedSettings);
    const uploadedAssets: PersonMediaAssetRef[] = [];

    try {
        if (archiveOptions) {
            await attachCloudArchiveMedia({
                treeId,
                ownerId,
                userEmail,
                token,
                mediaByPersonId: archiveOptions.mediaByPersonId,
                peopleByOriginalId,
                uploadedAssets,
            });
            if (archiveOptions.warnings.length > 0) {
                logWarn('importTreeFromJSONItem archiveMediaWarnings', 'Archive imported with media warnings.', {
                    category: 'VALIDATION',
                    metadata: {
                        operationType: 'archive_media_import',
                        warningCount: archiveOptions.warnings.length,
                    },
                });
            }
        }

        // 4. Import tree content in a single transaction.
        logInfo('importTreeFromJSONItem importContent', 'Inserting imported people and relationships.', {
            operationType: 'import_tree_content',
            metadata: { peopleCount: finalPeople.length, relationshipCount: relationships.length }
        });

        await importTreeContent(treeId, ownerId, finalPeople, relationships, userEmail, token);
    } catch (error) {
      await rollbackCloudImport({ treeId, ownerId, userEmail, token, uploadedAssets });
      throw error;
    }

    logInfo('importTreeFromJSONItem success', 'Import successful.', {
        treeId,
        userId: ownerId,
        operationType: 'import_tree_success'
    });
    return treeId;
};

export const importTreeFromFileItem = async (
    ownerId: string,
    userEmail: string,
    file: File,
    token?: string
): Promise<string> => {
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.jozor') || fileName.endsWith('.zip')) {
        const archiveData = await importJozorArchiveDataForCloud(file);
        if (!archiveData.mediaComplete) {
            throw new Error('Archive media is incomplete or invalid. The cloud tree was not created.');
        }
        return importTreeFromJSONItem(
            ownerId,
            userEmail,
            JSON.stringify({ people: archiveData.people, settings: archiveData.settings }),
            token,
            { mediaByPersonId: archiveData.mediaByPersonId, warnings: archiveData.warnings }
        );
    }

    const text = await file.text();
    if (fileName.endsWith('.ged')) {
        const { people, report } = importFromGEDCOMWithReport(text);
        if (report.warnings.length > 0) {
            logWarn('importTreeFromFileItem gedcomReport', 'GEDCOM import completed with review warnings.', {
                category: 'VALIDATION',
                metadata: {
                    operationType: 'gedcom_import_report',
                    importSafe: report.isSafe,
                    peopleCount: report.peopleCount,
                    familyCount: report.familyCount,
                    warningCount: report.warnings.length,
                    structuralIssueCount: report.structuralIssueCount,
                    timelineIssueCount: report.timelineIssueCount,
                    duplicateIssueCount: report.duplicateIssueCount,
                    unsupportedDateCount: report.unsupportedDateValues.length,
                }
            });
        }
        return importTreeFromJSONItem(ownerId, userEmail, JSON.stringify({ people }), token);
    }

    return importTreeFromJSONItem(ownerId, userEmail, text, token);
};
