import { AppStore } from '../store/storeTypes';
import { MutationActionResult } from '../types';
import { deltaSyncService } from '../services/deltaSyncService';
import { activityService } from '../services/activityService';
import { storageService } from '../services/storageService';
import { searchService } from '../services/searchService';

/**
 * CommandContext provides dependency injection for commands.
 * This decouples the commands from direct imports of state or services,
 * making them easier to test and isolate.
 */
export interface CommandContext {
    /** Get the latest global Zustand state and actions */
    getState: () => AppStore;
    
    /** Tree synchronization service for emitting real-time delta operations */
    syncService: typeof deltaSyncService;
    
    /** Activity logging service */
    activityService: typeof activityService;
    
    /** Local offline storage service */
    storageService: typeof storageService;
    
    /** Local search indexing service */
    searchService: typeof searchService;
}

/**
 * TreeCommand represents an isolated, executable action on the family tree.
 */
export interface TreeCommand {
    /**
     * Executes the command using the provided context.
     * Must return a MutationActionResult indicating success or containing an error message.
     */
    execute(context: CommandContext): Promise<MutationActionResult> | MutationActionResult;
}
