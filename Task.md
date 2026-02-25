# Project Status: Jozor 1.1

## Overview
**Stack:** React + Vite + TypeScript
**Backend:** Firebase (Auth) + Supabase (Database & Storage)
**State:** Zustand

---

## 1. Completed Milestones ✅

### 1.1 Authentication & Identity
- [x] **Firebase Auth Integration**: Implemented `firebaseAuthService` with Google & Email/Password providers.
- [x] **State Management**: Linked Auth with Zustand (`AuthSlice`) for reactive session handling.
- [x] **Welcome Screen**: Unified login/signup flow with Guest access support.
- [x] **User Menu**: Integrated User Menu in Header with Logout and Profile actions.

### 1.2 Core Database & Schema (Supabase)
- [x] **Schema Design**: Created `trees`, `people`, and `relationships` tables.
- [x] **Service Layer**: Implemented `supabaseTreeService` for CRUD operations.
- [x] **Multi-Tree Support**: Enabled users to create and switch between multiple family trees.
- [x] **Real-time Sync**: Orchestrated Zustand state updates with Supabase backend (`useAppOrchestration`).

### 1.3 Family Tree Logic & UI
- [x] **Person Management**: Add, Edit, Delete functionality with extended profile fields (Bio, Profession, Dates).
- [x] **Relationship Logic**: handled Parent, Child, and Spouse connections with validation.
- [x] **Visualization**: Interactive tree rendering with D3/SVG.
- [x] **Media**: Avatar upload and compression using Supabase Storage.
- [x] **Motion & Interactions**: Implemented smooth transitions and staggered entry animations for UI elements.

### 1.4 Data Backup (Google Drive)
- [x] **Integration**: Google Drive API integration for file operations.
- [x] **Backup Flow**: "Backup" and "Restore" functionality (replacing auto-sync) to allow manual control.
- [x] **Privacy**: Scoped access to prevent public exposure of user files.

### 1.5 Quality Assurance
- [x] **Build & Lint**: Resolved all ESLint warnings and TypeScript errors.
- [x] **Stability**: Verified session persistence and deep linking.

---

## 2. Active Improvements 🚧

### 2.1 Data Import/Export
- [x] **Tree Start Options**: Allow starting a new tree by importing a local JSON file.
- [ ] **Clean Drive Manager**: Refactor implementation to purely managing backups without mixed sync signals.

### 2.2 Security Hardening
- [ ] **RLS Policies**: Implement strict Row Level Security (RLS) policies in Supabase to enforce data isolation (User A cannot read User B's tree).
- [ ] **Storage Rules**: Restrict file access in Supabase Storage buckets.

---

## 3. Future Roadmap 🚀

### 3.1 Advanced Features
- [ ] **Media Gallery**: Centralized gallery view for all family photos and documents.
- [ ] **Collaborative Editing**: Real-time collaboration on shared trees (requires strict RLS).
- [ ] **Unified Login Experience**: Redesigned modal combining all auth methods.

### 3.2 Optimization
- [ ] **Tree Virtualization**: Optimize rendering for very large trees (1000+ nodes).
- [ ] **Offline Support**: Better PWA caching strategies.
