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
  googleSyncChoiceDriveFileId: ModalStateAndActions['googleSyncChoiceDriveFileId'];
  setGoogleSyncChoiceDriveFileId: ModalStateAndActions['setGoogleSyncChoiceDriveFileId'];
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
  sharedTreesPayload: ModalStateAndActions['sharedTreesPayload'];
  setSharedTreesPayload: ModalStateAndActions['setSharedTreesPayload'];
  setSharedTreePromptModal: (val: { isOpen: boolean; sharedTrees: SharedTreeSummary[] }) => void;
  googleSync: GoogleSyncStateAndActions;
  themeLanguage: ThemeLanguageProps;
}
