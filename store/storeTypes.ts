import { FamilySlice } from './slices/familySlice';
import { SettingsSlice } from './slices/settingsSlice';
import { AuthSlice } from './slices/authSlice';
import { UISlice } from './slices/uiSlice';
import { SyncMetaSlice } from './slices/syncMetaSlice';
import { TreeHealthSlice } from './slices/treeHealthSlice';
import { HistorySlice } from './slices/historySlice';

export type AppStore = FamilySlice & SettingsSlice & AuthSlice & UISlice & SyncMetaSlice & TreeHealthSlice & HistorySlice;
