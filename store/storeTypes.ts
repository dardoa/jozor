import { FamilySlice } from './slices/familySlice';
import { SettingsSlice } from './slices/settingsSlice';
import { AuthSlice } from './slices/authSlice';
import { UISlice } from './slices/uiSlice';

export type AppStore = FamilySlice & SettingsSlice & AuthSlice & UISlice;
