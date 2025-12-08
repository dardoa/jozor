// services/google/googleAuth.ts

import { UserProfile } from '../../types';
import { GOOGLE_CLIENT_ID } from '../../constants';
import { initializeGoogleApi, isInitialized, tokenClient } from './googleApiLoader';

declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

/**
 * Initiates the Google login flow and returns user profile information.
 */
export const loginToGoogle = (): Promise<UserProfile> => {
    return new Promise((resolve, reject) => {
        if (!GOOGLE_CLIENT_ID) {
            return reject("Google Client ID is not configured. Login disabled.");
        }

        const performLogin = () => {
             if (!tokenClient) {
                return reject("Google API not initialized.");
             }
             
             tokenClient.callback = async (resp: any) => {
                if (resp.error) {
                    return reject(resp.error);
                }
                window.gapi.client.setToken(resp);
                
                try {
                    const userInfo = await window.gapi.client.oauth2.userinfo.get();
                    const userProfile: UserProfile = {
                        uid: userInfo.result.id,
                        displayName: userInfo.result.name,
                        email: userInfo.result.email,
                        photoURL: userInfo.result.picture
                    };
                    resolve(userProfile);
                } catch (e) {
                    reject(new Error("Failed to fetch user info after login."));
                }
             };
             tokenClient.requestAccessToken();
        };

        if (!isInitialized || !tokenClient) {
            initializeGoogleApi()
                .then(performLogin)
                .catch((e) => {
                    console.error(e);
                    reject(e);
                });
        } else {
            performLogin();
        }
    });
};

/**
 * Logs out the current Google user and revokes the access token.
 */
export const logoutFromGoogle = () => {
    if (window.gapi && window.gapi.client) {
        const token = window.gapi.client.getToken();
        if (token !== null) {
            window.google.accounts.oauth2.revoke(token.access_token, () => {
                console.log('Token revoked');
            });
            window.gapi.client.setToken(null);
        }
    }
};