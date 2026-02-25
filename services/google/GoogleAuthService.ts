import { UserProfile } from '../../types';
import { IGoogleApiService, IGoogleAuthService } from './interfaces';

export class GoogleAuthService implements IGoogleAuthService {
    private apiService: IGoogleApiService;
    private static readonly TOKEN_KEY = 'jozor_google_access_token';
    private static readonly TOKEN_EXPIRY_KEY = 'jozor_google_token_expiry';
    private static readonly SUPABASE_TOKEN_KEY = 'jozor_supabase_token';

    constructor(apiService: IGoogleApiService) {
        this.apiService = apiService;
    }

    private loginPromise: Promise<UserProfile> | null = null;

    private persistToken(access_token: string, supabase_token?: string) {
        const expiry = Date.now() + 55 * 60 * 1000; // 55 minutes (Google tokens last 60min)
        sessionStorage.setItem(GoogleAuthService.TOKEN_KEY, access_token);
        sessionStorage.setItem(GoogleAuthService.TOKEN_EXPIRY_KEY, String(expiry));
        if (supabase_token) {
            sessionStorage.setItem(GoogleAuthService.SUPABASE_TOKEN_KEY, supabase_token);
        }
    }

    private clearPersistedToken() {
        sessionStorage.removeItem(GoogleAuthService.TOKEN_KEY);
        sessionStorage.removeItem(GoogleAuthService.TOKEN_EXPIRY_KEY);
        sessionStorage.removeItem(GoogleAuthService.SUPABASE_TOKEN_KEY);
    }

    private tryRestorePersistedToken(user?: any): boolean {
        const token = sessionStorage.getItem(GoogleAuthService.TOKEN_KEY);
        const supabaseToken = sessionStorage.getItem(GoogleAuthService.SUPABASE_TOKEN_KEY);
        const expiry = Number(sessionStorage.getItem(GoogleAuthService.TOKEN_EXPIRY_KEY) || '0');
        if (token && expiry > Date.now()) {
            if (typeof gapi !== 'undefined' && gapi.client) {
                gapi.client.setToken({ access_token: token });
                if (user && supabaseToken) {
                    user.supabaseToken = supabaseToken;
                }
                console.log('GoogleAuth: Restored token from localStorage.');
                return true;
            }
        } else if (token) {
            // Token expired - clean up
            this.clearPersistedToken();
        }
        return false;
    }

    public async login(): Promise<UserProfile> {
        if (this.loginPromise) return this.loginPromise;

        this.loginPromise = (async () => {
            if (!this.apiService.isInitialized) {
                await this.apiService.initialize();
            }

            const codeClient = this.apiService.getCodeClient();
            if (!codeClient) {
                throw new Error('Google API (Code Client) not initialized.');
            }

            return new Promise<UserProfile>((resolve, reject) => {
                const gapi = (window as any).gapi;
                // @ts-expect-error - callback property exists on client
                codeClient.callback = async (resp: any) => {
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
                        if (typeof gapi !== 'undefined' && gapi.client) {
                            gapi.client.setToken({ access_token });
                            this.persistToken(access_token, supabase_token); // ✅ Persist for page reload
                        }

                        // Attach supabase token to the returned user profile
                        const profileWithToken: UserProfile = {
                            ...user,
                            supabaseToken: supabase_token
                        };

                        resolve(profileWithToken);
                    } catch (e: any) {
                        console.error('Login Exchange Error:', e);
                        reject(new Error(e.message || 'Failed to authenticate with server.'));
                    } finally {
                        this.loginPromise = null;
                    }
                };
                codeClient.requestCode();
            });
        })();

        return this.loginPromise;
    }

    public async ensureTokenValid(shouldLogin: boolean = true): Promise<boolean> {
        if (!this.apiService.isInitialized) {
            await this.apiService.initialize();
        }

        // Small poll to ensure gapi.client is registered in window
        if (!(window as any).gapi?.client) {
            let retry = 0;
            while (!(window as any).gapi?.client && retry < 10) {
                await new Promise(resolve => setTimeout(resolve, 100));
                retry++;
            }
        }

        if (typeof gapi === 'undefined' || !gapi.client) {
            console.warn('GoogleAuth: GAPI client not ready.');
            return false;
        }

        const token = gapi.client.getToken();

        // Check if token exists and is generally valid
        if (!token || !token.access_token) {
            console.log('GoogleAuth: No token found.');
            // ✅ Try to restore from localStorage before triggering a popup
            if (this.tryRestorePersistedToken()) {
                console.log('GoogleAuth: Token restored silently from storage.');
                return true;
            }
            if (shouldLogin) {
                console.log('GoogleAuth: Triggering login popup...');
                await this.login();
                return true;
            }
            return false;
        }

        // Proactive Expiration Check: 
        // Google Identity Services tokens usually last 3600s. 
        // If we want to be robust, we could check if it's "close" to expiry.
        // GAPI doesn't always expose 'expires_at' in the object returned by getToken().
        // However, we can track the set time locally or catch 401s elsewhere.
        // For now, let's at least verify it's still registered.
        try {
            // Lightest possible call to verify status if needed, 
            // but usually gapi handles expiration internally if not using custom fetch.
            // If we are calling REST API via fetch, we MUST have a valid token.
        } catch (e) {
            return false;
        }

        return true;
    }

    public logout(): void {
        this.clearPersistedToken(); // ✅ Clear stored token on logout
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
