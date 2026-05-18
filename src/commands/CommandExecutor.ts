import { useAppStore } from '../store/useAppStore';
import { deltaSyncService } from '../services/deltaSyncService';
import { activityService } from '../features/activity-log';
import { storageService } from '../services/storageService';
import { searchService } from '../services/searchService';
import { CommandContext, TreeCommand } from './types';
import { MutationActionResult, Person } from '../types';
import { throttle } from '../utils/throttle';

// Throttled persister to avoid excessive IndexedDB writes when the tree changes frequently.
const throttledSaveLocal = throttle((people: Record<string, Person>) => {
    if (Object.keys(people).length === 0) return;
    void storageService.saveFullTree(people).catch((e) => console.error('Auto-save failed', e));
}, 3000);

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
            // Execute the command synchronously or asynchronously
            const result = await Promise.resolve(command.execute(context));
            
            // Global post-execution side-effects
            if (result.success) {
                // Fetch the latest people state AFTER the command has mutated it
                const updatedPeople = useAppStore.getState().people;
                
                // Update local offline cache
                throttledSaveLocal(updatedPeople);
                
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
