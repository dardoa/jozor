<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1S95Wj-7U9dl4dQkXhoavNqcySiEdhpe2

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. **Configure Google Client ID (IMPORTANT for Google Drive features):**
   Create a `.env.local` file in the root of your project and add your Google Client ID:
   `VITE_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE`
   You can obtain a Google Client ID from the Google Cloud Console (APIs & Services > Credentials). Ensure you enable the Google Drive API.
3. **Securely configure Gemini API Key (IMPORTANT for AI features):**
   The Gemini API key should **NOT** be exposed on the client-side. To use AI features, you must:
   - **Implement a backend proxy server** that handles all calls to the Google Gemini API.
   - Store your `GEMINI_API_KEY` securely on this backend server (e.g., as an environment variable).
   - Modify `src/services/geminiService.ts` to make `fetch` requests to your backend proxy instead of directly using `@google/genai` client.
   - For local development, you might still use a `.env.local` file for your backend, but ensure it's never bundled into the frontend.
4. Run the app:
   `npm run dev`