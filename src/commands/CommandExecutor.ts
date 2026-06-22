import { useAppStore } from '../store/useAppStore';
import { deltaSyncService } from '../services/deltaSyncService';
import { activityService } from '../features/activity-log';
import { storageService } from '../services/storageService';
import { searchService } from '../services/searchService';
import { localTreePersistenceService } from '../services/localTreePersistenceService';
import { CommandContext, TreeCommand } from './types';
import { MutationActionResult } from '../types';

/**
 * CommandExecutor manages the execution lifecycle of TreeCommands.
 * It provides the necessary dependency injection context and handles global side effects 
 * like auto-saving and search index updates upon successful execution.
 */
export class CommandExecutor {
    public static async execute(command: TreeCommand): Promise<MutationActionResult> {
        const context: CommandContext = {
            getState: () => useAppStore.getState(),
            syncService: deltaSyncService,
            activityService,
            storageService,
            searchService,
        };

        try {
            const previousPeople = useAppStore.getState().people;
            const previousRelationships = { ...useAppStore.getState().relationships };

            // Execute the command synchronously or asynchronously
            const result = await Promise.resolve(command.execute(context));
            
            // Global post-execution side-effects
            if (result.success) {
                // Fetch the latest people state AFTER the command has mutated it
                const updatedPeople = useAppStore.getState().people;
                const changedPeople = Object.values(updatedPeople).filter((person) => (
                    previousPeople[person.id] !== person
                ));
                
                // Update local offline cache incrementally.
                localTreePersistenceService.saveChangedPeople(changedPeople);
                
                // Save and delete relationships incrementally
                const updatedRelationships = useAppStore.getState().relationships || {};
                const changedRelationships = Object.values(updatedRelationships).filter((edge) => (
                    !previousRelationships[edge.id] || previousRelationships[edge.id] !== edge
                ));
                const deletedRelationshipIds = Object.keys(previousRelationships).filter((id) => (
                    !updatedRelationships[id]
                ));

                if (changedRelationships.length > 0) {
                    await storageService.saveRelationships(changedRelationships);
                }
                if (deletedRelationshipIds.length > 0) {
                    await storageService.deleteRelationships(deletedRelationshipIds);
                }
                
                // Update search index for immediate searchability
                void searchService.updateSearchIndex(Object.values(updatedPeople));
            }
            
            return result;
        } catch (error) {
            console.error('[CommandExecutor] Execution Error:', error);
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'An unexpected error occurred during command execution.'
            };
        }
    }
}
