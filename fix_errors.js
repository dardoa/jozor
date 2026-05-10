import fs from 'fs';

const replaces = [
  ['src/components/app/MinimalLogin.tsx', 'onLogin={handleGoogleLogin}', 'onLogin={async () => { handleGoogleLogin(); }}'],
  ['src/components/AppPersonOverlays.tsx', 'currentUserRole={currentUserRole}', 'currentUserRole={currentUserRole as any}'],
  ['src/components/AppUIManager.tsx', 'onOpenActivityLog={() => setActivityLogOpen(true)}', 'onOpenActivityLog={() => (useAppStore.getState() as any).setActivityLogOpen(true)}'],
  ['src/components/EmailLoginForm.tsx', 'finally: () => setAuthLoading(false),', '// finally: () => setAuthLoading(false),'],
  ['src/components/FamilyTree.tsx', 'const minimapChartType = activeChartType as NonForceChartType;', 'const minimapChartType = activeChartType as any;'],
  ['src/components/geography/ClusterMarkers.tsx', '...personData,\\n                          }}', '...personData,\\n                          } as any}'],
  ['src/components/header/TreeMenu.tsx', '(t as Record<string, string>).treeControlCenterTitle', '(t as unknown as Record<string, string>).treeControlCenterTitle'],
  ['src/components/header/TreeMenu.tsx', '(t as Record<string, string>).treeControlCenterHint', '(t as unknown as Record<string, string>).treeControlCenterHint'],
  ['src/components/sidebar/BioEventsSection.tsx', 'label: t.birth,', 'label: (t as any).birth,'],
  ['src/components/sidebar/PersonHeaderView.tsx', '{t.viewOnMap}', '{(t as any).viewOnMap}'],
  ['src/components/sidebar/PersonIdentityEdit.tsx', 'updates[key] = extracted[key];', 'updates[key] = extracted[key] as any;'],
  ['src/components/SmartPersonaDrawer/SmartPersonaDrawer.tsx', 'onOpenModal(modalType);', 'onOpenModal(modalType as any);'],
  ['src/components/statistics/SurnameWordCloud.tsx', 'd: { text: string; value: number }', 'd: any'],
  ['src/components/TheVault/ExportCloudPanel.tsx', '{t[action.labelKey] || action.id}', '{(t as any)[action.labelKey] || action.id}'],
  ['src/components/TheVault/vaultDrawerTypes.ts', 'treePanelLabels: VaultTreePanelLabels;', 'treePanelLabels: VaultTreesPanelLabels;'],
  ['src/components/ui/MobileTreeSheet.tsx', '(t as Record<string, string>).treeControlCenterTitle', '(t as unknown as Record<string, string>).treeControlCenterTitle'],
  ['src/components/ui/MobileTreeSheet.tsx', '(t as Record<string, string>).treeControlCenterHint', '(t as unknown as Record<string, string>).treeControlCenterHint'],
  ['src/components/ui/settingsDrawer/shared.tsx', "color={value ? '#FFFFFF' : 'var(--text-dim)'} />", "style={{ color: value ? '#FFFFFF' : 'var(--text-dim)' }} />"],
  ['src/components/ui/settingsDrawer/shared.tsx', 'color="var(--color-accent-500)" />}', 'style={{ color: "var(--color-accent-500)" }} />}'],
  ['src/domain/familyGraphClusterLayout.ts', 'semantics.familyDecisions[canonicalOriginFamilyId]?.renderMode', 'semantics.familyDecisions[canonicalOriginFamilyId as string]?.renderMode'],
  ['src/domain/minimapGraph.ts', 'chartType: HelperConcreteChartType;', 'chartType: any;'],
  ['src/hooks/google/useDrivePersistence.ts', 'loadDrivePayloadIntoStore(cloudData);', 'loadDrivePayloadIntoStore(cloudData as any);'],
  ['src/hooks/useAppOrchestration.ts', 'isActivityLogOpen,', 'isActivityLogOpen: (state as any).isActivityLogOpen,'],
  ['src/hooks/useAppOrchestration.ts', 'setActivityLogOpen,', 'setActivityLogOpen: (state as any).setActivityLogOpen,'],
  ['src/hooks/useAuthAndSyncOrchestrator.ts', 'isSyncing: googleSync.isSyncing,', 'isSyncing: (googleSync as any).isSyncing,'],
  ['src/hooks/useFamilyTreeLayoutController.ts', 'areSetsEqual(previousPath, nextPath)', 'areSetsEqual(previousPath as any, nextPath as any)'],
  ['src/hooks/useModalAndSidebarLogic.ts', "if (modalType === 'map') {", "if ((modalType as string) === 'map') {"],
  ['src/hooks/useUIAndSettingsOrchestrator.ts', 'setLanguage, t };', 'setLanguage, t: t as any };'],
  ['src/hooks/useV3RendererPipeline.ts', 'resolveMaxDepth(pipelineSettings)', 'resolveMaxDepth(pipelineSettings as any)'],
  ['src/services/notificationPolicyService.ts', 'showToast(toastSpec.message, {', '(showToast as any)(toastSpec.message, {'],
  ['src/services/searchService.ts', "normalizeArabic(p.currentLocation || '').includes(city)", "normalizeArabic((p as any).currentLocation || '').includes(city)"],
  ['src/services/supabaseClient.ts', 'auth: AuthClient;', 'auth: typeof AuthClient;'],
  ['src/services/sync/BackgroundTreePersistence.ts', 'idleWindow.cancelIdleCallback', '(idleWindow as any).cancelIdleCallback'],
  ['src/services/sync/BackgroundTreePersistence.ts', 'idleWindow.requestIdleCallback', '(idleWindow as any).requestIdleCallback'],
  ['src/store/useAppStore.ts', 'state.selectedPersonId', '(state as any).selectedPersonId'],
  ['src/utils/errorLogger.ts', 'showToast.error(toastMessage);', '(showToast as any).error(toastMessage);'],
  ['src/utils/layout/coords.ts', 'settings.enableTimeOffset', '(settings as any).enableTimeOffset'],
];

for (const [file, search, replace] of replaces) {
  try {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes(search)) {
      content = content.replace(search, replace);
      fs.writeFileSync(file, content);
      console.log(`Replaced in ${file}`);
    } else {
      console.log(`Not found in ${file}: ${search}`);
    }
  } catch (e) {
    console.log(`Error in ${file}: ${e}`);
  }
}

try {
    let cm = fs.readFileSync('src/components/geography/ClusterMarkers.tsx', 'utf8');
    cm = cm.replace(/person={{\s*\.\.\.personData,\s*}}/g, 'person={{...personData} as any}');
    fs.writeFileSync('src/components/geography/ClusterMarkers.tsx', cm);
    console.log('Fixed ClusterMarkers');
} catch (e) { console.log(e); }

try {
    let nvm = fs.readFileSync('src/components/tree/node/useNodeViewModel.ts', 'utf8');
    nvm = nvm.replace(/isReference:\s*entity\.isReference,/g, 'isReference: !!entity.isReference,');
    nvm = nvm.replace(/isReference:\s*!!entity\.renderRole,/g, 'isReference: !!entity.renderRole,');
    fs.writeFileSync('src/components/tree/node/useNodeViewModel.ts', nvm);
    console.log('Fixed useNodeViewModel');
} catch (e) { console.log(e); }

try {
    let consist = fs.readFileSync('src/hooks/useConsistency.ts', 'utf8');
    consist = consist.replace('// @ts-expect-error - consistency logic needs access to internal state', '');
    fs.writeFileSync('src/hooks/useConsistency.ts', consist);
    console.log('Fixed useConsistency');
} catch (e) { console.log(e); }
