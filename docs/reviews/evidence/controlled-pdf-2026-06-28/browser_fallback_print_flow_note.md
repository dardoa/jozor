# Browser Fallback Print Flow Invocation Verification Note

* **Verification Status**: Tested and confirmed via automated tests. Live browser screenshot evidence is still pending.
* **Mechanism**:
  * The `useExport` hook continues to execute under the option `{ mode: 'browser-print-fallback' }`.
  * When `Family Book PDF` button is pressed in the UI, the pipeline resolves without custom adapter interception, routing back directly to standard `window.print()` triggers inside the client browser.
  * In the automated UI integration mock test (`ExportCloudPanel.test.tsx`), pressing the print command triggers call tracking successfully on legacy publishing exports, validating that browser fallback is the active code path.
