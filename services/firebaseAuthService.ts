import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  type Auth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  type User as FirebaseUser,
} from 'firebase/auth';
import type { UserProfile } from '../types';
import { clearSupabaseInstances } from './supabaseClient';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

/**
 * Initializes the Firebase application if it hasn't been initialized already.
 * @returns The initialized FirebaseApp instance.
 */
export const initFirebaseApp = () => {
  if (app) return app;

  app = initializeApp({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  });

  auth = getAuth(app);
  return app;
};

/**
 * Maps a Firebase User object to the application's UserProfile type.
 */
const mapFirebaseUserToUserProfile = (user: FirebaseUser): UserProfile => ({
  uid: user.uid,
  displayName: user.displayName || '',
  email: user.email || '',
  photoURL: user.photoURL || '',
});

/**
 * Subscribes to changes in the authentication state.
 */
export const subscribeToAuthState = (
  callback: (user: UserProfile | null) => void
) => {
  initFirebaseApp();
  if (!auth) return () => { };

  return onAuthStateChanged(auth, (firebaseUser) => {
    if (!firebaseUser) {
      callback(null);
    } else {
      callback(mapFirebaseUserToUserProfile(firebaseUser));
    }
  });
};

/**
 * Signs in the user using Google OAuth popup.
 * COOP warnings in Chrome are cosmetic only — the popup flow completes successfully.
 */
export const loginWithGoogle = async (): Promise<UserProfile> => {
  initFirebaseApp();
  if (!auth) throw new Error('Auth not initialized');

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  if (!result.user) throw new Error('No user returned from Firebase');

  return mapFirebaseUserToUserProfile(result.user);
};



/**
 * Logs out the current user from Firebase.
 */
export const logoutFirebase = async (): Promise<void> => {
  initFirebaseApp();
  if (!auth) return;
  // Clear cached Supabase instances to prevent Multiple GoTrueClient warnings on re-login
  clearSupabaseInstances();
  await signOut(auth);
};

/**
 * Registers a new user with email and password.
 * @param email - User's email address.
 * @param password - User's password.
 * @param name - User's display name.
 * @returns A promise that resolves to the new user's profile.
 */
export const registerWithEmail = async (email: string, password: string, name: string): Promise<UserProfile> => {
  initFirebaseApp();
  if (!auth) throw new Error('Auth not initialized');

  const result = await createUserWithEmailAndPassword(auth, email, password);
  if (!result.user) throw new Error('No user returned from Firebase');

  // Update display name
  await updateProfile(result.user, { displayName: name });

  // Force refetch user to get updated profile
  const updatedUser = auth.currentUser;
  return mapFirebaseUserToUserProfile(updatedUser || result.user);
};

/**
 * Signs in the user with email and password.
 * @param email - User's email address.
 * @param password - User's password.
 * @returns A promise that resolves to the signed-in user's profile.
 */
export const loginWithEmail = async (email: string, password: string): Promise<UserProfile> => {
  initFirebaseApp();
  if (!auth) throw new Error('Auth not initialized');

  const result = await signInWithEmailAndPassword(auth, email, password);
  if (!result.user) throw new Error('No user returned from Firebase');

  return mapFirebaseUserToUserProfile(result.user);
};

/**
 * Sends a password reset email to the specified address.
 * @param email - User's email address.
 */
export const resetPassword = async (email: string): Promise<void> => {
  initFirebaseApp();
  if (!auth) throw new Error('Auth not initialized');
  await sendPasswordResetEmail(auth, email);
};

/**
 * Retrieves the current user's Firebase ID token.
 * This token can be used to authenticate with custom backend APIs.
 * @param forceRefresh - Whether to force a refresh of the token.
 * @returns A promise that resolves to the ID token or null if no user is signed in.
 */
export const getIdToken = async (forceRefresh: boolean = false): Promise<string | null> => {
  initFirebaseApp();
  if (!auth) return null;
  const user = auth.currentUser;
  if (!user) return null;
  return await user.getIdToken(forceRefresh);
};
