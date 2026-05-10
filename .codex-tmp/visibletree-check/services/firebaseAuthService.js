import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, sendPasswordResetEmail, } from 'firebase/auth';
import { clearSupabaseInstances } from './supabaseClient';
import { logError } from '../utils/errorLogger';
let app = null;
let auth = null;
/**
 * Initializes the Firebase application if it hasn't been initialized already.
 * @returns The initialized FirebaseApp instance.
 */
export const initFirebaseApp = () => {
    if (app)
        return app;
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
const mapFirebaseUserToUserProfile = (user) => ({
    uid: user.uid,
    displayName: user.displayName || '',
    email: user.email || '',
    photoURL: user.photoURL || '',
});
/**
 * Subscribes to changes in the authentication state.
 */
export const subscribeToAuthState = (callback) => {
    initFirebaseApp();
    if (!auth)
        return () => { };
    return onAuthStateChanged(auth, (firebaseUser) => {
        if (!firebaseUser) {
            callback(null);
        }
        else {
            callback(mapFirebaseUserToUserProfile(firebaseUser));
        }
    });
};
/**
 * Signs in the user using Google OAuth popup.
 * COOP warnings in Chrome are cosmetic only — the popup flow completes successfully.
 */
export const loginWithGoogle = async () => {
    initFirebaseApp();
    if (!auth)
        throw new Error('Auth not initialized');
    try {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const result = await signInWithPopup(auth, provider);
        if (!result.user)
            throw new Error('No user returned from Firebase');
        return mapFirebaseUserToUserProfile(result.user);
    }
    catch (error) {
        logError('Auth loginWithGoogle', error, { category: 'AUTH', severity: 'HIGH' });
        throw error;
    }
};
/**
 * Logs out the current user from Firebase.
 */
export const logoutFirebase = async () => {
    initFirebaseApp();
    if (!auth)
        return;
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
export const registerWithEmail = async (email, password, name) => {
    initFirebaseApp();
    if (!auth)
        throw new Error('Auth not initialized');
    try {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        if (!result.user)
            throw new Error('No user returned from Firebase');
        // Update display name
        await updateProfile(result.user, { displayName: name });
        // Force refetch user to get updated profile
        const updatedUser = auth.currentUser;
        return mapFirebaseUserToUserProfile(updatedUser || result.user);
    }
    catch (error) {
        logError('Auth registerWithEmail', error, { category: 'AUTH', severity: 'HIGH' });
        throw error;
    }
};
/**
 * Signs in the user with email and password.
 * @param email - User's email address.
 * @param password - User's password.
 * @returns A promise that resolves to the signed-in user's profile.
 */
export const loginWithEmail = async (email, password) => {
    initFirebaseApp();
    if (!auth)
        throw new Error('Auth not initialized');
    try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        if (!result.user)
            throw new Error('No user returned from Firebase');
        return mapFirebaseUserToUserProfile(result.user);
    }
    catch (error) {
        logError('Auth loginWithEmail', error, { category: 'AUTH', severity: 'HIGH' });
        throw error;
    }
};
/**
 * Sends a password reset email to the specified address.
 * @param email - User's email address.
 */
export const resetPassword = async (email) => {
    initFirebaseApp();
    if (!auth)
        throw new Error('Auth not initialized');
    await sendPasswordResetEmail(auth, email);
};
/**
 * Retrieves the current user's Firebase ID token.
 * This token can be used to authenticate with custom backend APIs.
 * @param forceRefresh - Whether to force a refresh of the token.
 * @returns A promise that resolves to the ID token or null if no user is signed in.
 */
export const getIdToken = async (forceRefresh = false) => {
    initFirebaseApp();
    if (!auth)
        return null;
    const user = auth.currentUser;
    if (!user)
        return null;
    return await user.getIdToken(forceRefresh);
};
