import { logError, logInfo, logWarn } from '../../utils/errorLogger';
export class GoogleAuthService {
    constructor(apiService) {
        this.loginPromise = null;
        this.apiService = apiService;
    }
    persistToken(access_token, supabase_token) {
        const expiry = Date.now() + 55 * 60 * 1000;
        localStorage.setItem(GoogleAuthService.TOKEN_KEY, access_token);
        localStorage.setItem(GoogleAuthService.TOKEN_EXPIRY_KEY, String(expiry));
        if (supabase_token) {
            localStorage.setItem(GoogleAuthService.SUPABASE_TOKEN_KEY, supabase_token);
        }
    }
    clearPersistedToken() {
        localStorage.removeItem(GoogleAuthService.TOKEN_KEY);
        localStorage.removeItem(GoogleAuthService.TOKEN_EXPIRY_KEY);
        localStorage.removeItem(GoogleAuthService.SUPABASE_TOKEN_KEY);
    }
    tryRestorePersistedToken(user) {
        const token = localStorage.getItem(GoogleAuthService.TOKEN_KEY);
        const supabaseToken = localStorage.getItem(GoogleAuthService.SUPABASE_TOKEN_KEY);
        const expiry = Number(localStorage.getItem(GoogleAuthService.TOKEN_EXPIRY_KEY) || '0');
        if (token && expiry > Date.now()) {
            if (typeof gapi !== 'undefined' && gapi.client) {
                gapi.client.setToken({ access_token: token });
                if (user && supabaseToken) {
                    user.supabaseToken = supabaseToken;
                }
                logInfo('GoogleAuthService tryRestorePersistedToken', 'Restored Google token from session storage.', {
                    operationType: 'google_token_restore'
                });
                return true;
            }
        }
        else if (token) {
            this.clearPersistedToken();
        }
        return false;
    }
    async login() {
        if (this.loginPromise)
            return this.loginPromise;
        this.loginPromise = (async () => {
            if (!this.apiService.isInitialized) {
                await this.apiService.initialize();
            }
            const codeClient = this.apiService.getCodeClient();
            if (!codeClient) {
                throw new Error('Google API (Code Client) not initialized.');
            }
            return new Promise((resolve, reject) => {
                const gapiClient = window.gapi;
                // @ts-expect-error - callback property exists on client
                codeClient.callback = async (resp) => {
                    if (resp.error) {
                        this.loginPromise = null;
                        return reject(resp.error);
                    }
                    try {
                        const exchangeRes = await fetch('/api/auth/exchange', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ code: resp.code }),
                        });
                        const data = await exchangeRes.json();
                        if (!exchangeRes.ok) {
                            throw new Error(data.error || 'Token exchange failed');
                        }
                        const { access_token, supabase_token, user } = data;
                        if (typeof gapiClient !== 'undefined' && gapiClient.client) {
                            gapiClient.client.setToken({ access_token });
                            this.persistToken(access_token, supabase_token);
                        }
                        const profileWithToken = {
                            ...user,
                            supabaseToken: supabase_token
                        };
                        resolve(profileWithToken);
                    }
                    catch (error) {
                        logError('GoogleAuthService login exchange', error, {
                            category: 'AUTH',
                            severity: 'HIGH',
                            metadata: { operationType: 'google_token_exchange' }
                        });
                        reject(new Error(error instanceof Error ? error.message : 'Failed to authenticate with server.'));
                    }
                    finally {
                        this.loginPromise = null;
                    }
                };
                codeClient.requestCode();
            });
        })();
        return this.loginPromise;
    }
    async ensureTokenValid(shouldLogin = true) {
        if (!this.apiService.isInitialized) {
            await this.apiService.initialize();
        }
        if (!window.gapi?.client) {
            let retry = 0;
            while (!window.gapi?.client && retry < 10) {
                await new Promise(resolve => setTimeout(resolve, 100));
                retry++;
            }
        }
        if (typeof gapi === 'undefined' || !gapi.client) {
            logWarn('GoogleAuthService ensureTokenValid', 'GAPI client is not ready yet.', {
                category: 'AUTH',
                metadata: { operationType: 'google_token_validation' }
            });
            return false;
        }
        const token = gapi.client.getToken();
        if (!token || !token.access_token) {
            logWarn('GoogleAuthService ensureTokenValid', 'No Google token is currently available.', {
                category: 'AUTH',
                metadata: { operationType: 'google_token_validation' }
            });
            if (this.tryRestorePersistedToken()) {
                logInfo('GoogleAuthService ensureTokenValid', 'Restored Google token silently from session storage.', {
                    operationType: 'google_token_validation'
                });
                return true;
            }
            if (shouldLogin) {
                logWarn('GoogleAuthService ensureTokenValid', 'Triggering Google login popup because no valid token is available.', {
                    category: 'AUTH',
                    metadata: { operationType: 'google_login_popup' }
                });
                await this.login();
                return true;
            }
            return false;
        }
        try {
            // Token presence is sufficient here; request failures are handled by callers.
        }
        catch {
            return false;
        }
        return true;
    }
    logout() {
        this.clearPersistedToken();
        if (typeof gapi !== 'undefined' && gapi.client) {
            const token = gapi.client.getToken();
            if (token !== null) {
                if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
                    google.accounts.oauth2.revoke(token.access_token, () => { });
                }
                gapi.client.setToken(null);
            }
        }
    }
}
GoogleAuthService.TOKEN_KEY = 'jozor_google_access_token';
GoogleAuthService.TOKEN_EXPIRY_KEY = 'jozor_google_token_expiry';
GoogleAuthService.SUPABASE_TOKEN_KEY = 'jozor_supabase_token';
