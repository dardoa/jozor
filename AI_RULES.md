# AI Rules for Jozor Application

This document outlines the core technologies used in the Jozor application and provides guidelines for using specific libraries and tools.

## Tech Stack Overview

The Jozor application is built with a modern web development stack, focusing on performance, maintainability, and a rich user experience.

*   **React**: A declarative, component-based JavaScript library for building user interfaces.
*   **TypeScript**: A superset of JavaScript that adds static types, enhancing code quality and developer productivity.
*   **Tailwind CSS**: A utility-first CSS framework for rapidly building custom designs directly in your markup.
*   **D3.js**: A powerful JavaScript library for manipulating documents based on data, primarily used here for dynamic family tree visualizations.
*   **Google Gemini API**: Integrated for advanced AI capabilities, including biography generation, conversational AI, and image analysis.
*   **Google Drive API (GAPI/GSI)**: Utilized for cloud synchronization of family tree data and seamless image importing from Google Drive.
*   **JSZip**: A JavaScript library for creating, reading, and editing `.zip` files, used for handling Jozor archive imports and exports.
*   **Vite**: A next-generation frontend tooling that provides an extremely fast development experience.
*   **Lucide React**: A collection of customizable, open-source icons integrated for a consistent visual language across the application.
*   **Local Storage**: Used for client-side data persistence, ensuring user data is saved locally.
*   **GEDCOM**: Support for the standard genealogical data exchange format, enabling broad compatibility for importing and exporting family trees.

## Library Usage Guidelines

To maintain consistency and leverage the strengths of each tool, please adhere to the following guidelines:

*   **UI Styling**: Always use **Tailwind CSS** classes for all styling. Avoid inline styles or custom CSS files unless absolutely necessary for complex, unique components.
*   **UI Components**: Prioritize using existing components found in `src/components/`. For new UI elements, leverage **shadcn/ui** components where applicable. If a specific component is not available or needs significant customization, create a new, small, and focused component.
*   **Icons**: Use icons exclusively from the **`lucide-react`** library.
*   **Tree Visualization**: All interactive family tree rendering and layout calculations should be handled using **D3.js** (via `utils/treeLayout.ts` and `components/FamilyTree.tsx`).
*   **AI Features**: Interact with the Google Gemini API through the dedicated service functions in `services/geminiService.ts`.
*   **Cloud Integration (Authentication & Drive)**: All Google authentication and Google Drive file operations must be performed using the wrappers provided in `services/googleService.ts`.
*   **File Archiving**: For creating or extracting `.jozor` (ZIP) archives, use the **`jszip`** library as implemented in `utils/archiveLogic.ts`.
*   **Date Inputs**: For consistent date input fields, use the custom **`DateSelect`** component.
*   **Text Inputs with Debounce/Commit**: For input fields that require debounced updates or commit-on-blur behavior, use the custom **`SmartInput`** and **`SmartTextarea`** components.
*   **Translations**: All user-facing text should be managed and accessed via `utils/translations.ts`.
*   **Data Persistence**: For client-side data storage, utilize `localStorage` as demonstrated in `hooks/useFamilyTree.ts` and `hooks/useGoogleSync.ts`.
*   **Error Handling**: Do not implement `try/catch` blocks unless explicitly requested. Allow errors to propagate to facilitate debugging and centralized error management.