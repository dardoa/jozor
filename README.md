<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1S95Wj-7U9dl4dQkXhoavNqcySiEdhpe2

## Architectural Highlights

We have implemented several key architectural patterns to ensure performance, scalability, and code quality:

- **Web Worker Implementation**: Computationally heavy tasks, such as Family Tree layout calculations (D3 Force Simulation), are offloaded to a dedicated Web Worker (`treeLayout.worker.ts`). This ensures the main UI thread remains unblocked, providing a smooth and responsive user experience even with large datasets.
- **Local-First & IndexedDB**: We utilize `idb-keyval` to interact with IndexedDB for robust local storage. This allows for storing larger datasets (like family trees and user preferences) directly in the browser with better performance than `localStorage`.
- **Strict Typing & Dependency Injection**: The codebase enforces Strict TypeScript checks for type safety. We also use a Dependency Injection (DI) pattern for our services (e.g., `GoogleDriveService`, `GoogleAuthService`), making the application modular and easily testable.
- **Geographic Intelligence Cache**: We utilize a 3-tier caching sequence (Zustand -> Supabase Global Cache -> Nominatim API) to intelligently geocode historical family places while respecting API rate limits and preserving user location constraints globally.

## VisibleTree Baseline

VisibleTree is now the default internal semantic layer for:

- `pedigree`
- `fan`
- `descendant`
- minimap in ancestry modes
- ancestry-mode highlighting
- visible-view KPIs:
  - Total Members
  - Generation Depth
  - Vitality

Legacy layout and analytics paths remain in place as rollback-only fallbacks. The `VITE_VISIBLE_TREE_*` flags are now enabled by default and only need to be set to `false` when intentionally rolling back a specific path during internal validation or incident response.

Additional baseline notes:

- [VisibleTree Baseline](D:/AppDEV/Jozor1.1/docs/visible-tree-baseline.md)

## Run Locally

**Prerequisites:** Node.js

1.  Install dependencies:
    `npm install`
2.  **Configure Google Client ID (IMPORTANT for Google Drive features):**
    Create a `.env.local` file in the root of your project and add your Google Client ID:
    `VITE_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE`
    You can obtain a Google Client ID from the Google Cloud Console (APIs & Services > Credentials). Ensure you enable the Google Drive API.
3.  **Securely configure Gemini API Key (IMPORTANT for AI features):**
    The Gemini API key should **NOT** be exposed on the client-side. To use AI features, you must:
    - **Implement a backend proxy server** that handles all calls to the Google Gemini API.
    - Store your `GEMINI_API_KEY` securely on this backend server (e.g., as an environment variable).
    - Modify `src/services/geminiService.ts` to make `fetch` requests to your backend proxy instead of directly using `@google/genai` client.
    - For local development, you might still use a `.env.local` file for your backend, but ensure it's never bundled into the frontend.
4.  Run the app:
    `npm run dev`

## Quality Gates

The repository now includes a GitHub Actions CI workflow at [.github/workflows/ci.yml](/D:/AppDEV/Jozor1.1/.github/workflows/ci.yml). On pushes and pull requests, it validates:

- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run test:e2e:smoke`

If Playwright fails in CI, the workflow uploads `playwright-report` and `test-results` as artifacts for debugging.

Operational runbooks:

- [`docs/release-readiness-checklist.md`](/D:/AppDEV/Jozor1.1/docs/release-readiness-checklist.md)
- [`docs/supabase-bootstrap-runbook.md`](/D:/AppDEV/Jozor1.1/docs/supabase-bootstrap-runbook.md)
- [`docs/supabase-audit-checklist.md`](/D:/AppDEV/Jozor1.1/docs/supabase-audit-checklist.md)

## Live Collaboration E2E

For a real multi-user Supabase/Firebase collaboration check, set these environment variables before running the test:

- `E2E_OWNER_EMAIL`
- `E2E_OWNER_PASSWORD`
- `E2E_EDITOR_EMAIL`
- `E2E_EDITOR_PASSWORD`

Then run:

- `npm run test:e2e:collab:live`

This suite signs in two real users, shares a real DB tree, verifies viewer restrictions, promotes the collaborator to editor, and confirms the edit persists after reload.

## Recommended Local Validation

Before opening a pull request, run the same high-value checks locally:

1.  `npm run typecheck`
2.  `npm run lint`
3.  `npm run test`
4.  `npm run test:e2e:smoke`

For cross-browser verification when changing interaction-heavy UI, also run:

- `npx playwright test tests/e2e/app-smoke.spec.ts --project=firefox`
- `npx playwright test tests/e2e/app-smoke.spec.ts --project=webkit`
