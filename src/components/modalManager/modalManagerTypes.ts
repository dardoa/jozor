import type {
  AppStateAndActions,
  FamilyActionsProps,
  GoogleSyncStateAndActions,
  ModalStateAndActions,
  ThemeLanguageProps,
  WelcomeScreenLogicProps,
} from '../../types';
import type { SharedTreeSummary } from '../../services/supabaseTreeTypes';

export interface ModalManagerProps {
  activeModal: ModalStateAndActions['activeModal'];
  setActiveModal: ModalStateAndActions['setActiveModal'];
  geographicJourneyMode: ModalStateAndActions['geographicJourneyMode'];
  linkModal: ModalStateAndActions['linkModal'];
  setLinkModal: ModalStateAndActions['setLinkModal'];
  cleanTreeOptionsModal: ModalStateAndActions['cleanTreeOptionsModal'];
  setCleanTreeOptionsModal: ModalStateAndActions['setCleanTreeOptionsModal'];
  googleSyncChoiceModal: ModalStateAndActions['googleSyncChoiceModal'];
  setGoogleSyncChoiceModal: ModalStateAndActions['setGoogleSyncChoiceModal'];
  people: AppStateAndActions['people'];
  focusId: AppStateAndActions['focusId'];
  setFocusId: AppStateAndActions['setFocusId'];
  activePerson?: AppStateAndActions['activePerson'];
  user: GoogleSyncStateAndActions['user'];
  familyActions: FamilyActionsProps;
  language: ThemeLanguageProps['language'];
  onStartNewTree: WelcomeScreenLogicProps['handleStartNewTree'];
  onTriggerImportFile: WelcomeScreenLogicProps['onTriggerImportFile'];
  onLoadCloudData: GoogleSyncStateAndActions['onLoadCloudData'];
  onSaveNewCloudFile: GoogleSyncStateAndActions['onSaveNewCloudFile'];
  currentActiveDriveFileId: GoogleSyncStateAndActions['currentActiveDriveFileId'];
  onGoogleLogin: () => Promise<void>;
  activeTreeId: string | null;
  onTreeSelected: (treeId: string) => void;
  sharedTreePromptModal: { isOpen: boolean; sharedTrees: SharedTreeSummary[] };
  setSharedTreePromptModal: (val: { isOpen: boolean; sharedTrees: SharedTreeSummary[] }) => void;
  googleSync: GoogleSyncStateAndActions;
  themeLanguage: ThemeLanguageProps;
  globalSettingsModal: { isOpen: boolean };
  setGlobalSettingsModal: (val: { isOpen: boolean }) => void;
}
