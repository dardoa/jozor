
import { UserProfile } from '../types';

/**
 * NOTE: This is a mock authentication service.
 * In a production app, you would use Firebase Auth or similar.
 */

// Simulated user data
const MOCK_USER: UserProfile = {
    uid: 'mock-user-123',
    displayName: 'Ahmed Ali',
    email: 'ahmed.ali@example.com',
    photoURL: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
};

export const loginWithGoogle = async (): Promise<UserProfile> => {
    return new Promise((resolve) => {
        // Simulate network delay
        setTimeout(() => {
            // Save mock session
            localStorage.setItem('auth_session', JSON.stringify(MOCK_USER));
            resolve(MOCK_USER);
        }, 1500);
    });
};

export const logoutUser = async (): Promise<void> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            localStorage.removeItem('auth_session');
            resolve();
        }, 500);
    });
};

export const checkCurrentSession = (): UserProfile | null => {
    const stored = localStorage.getItem('auth_session');
    return stored ? JSON.parse(stored) : null;
};
