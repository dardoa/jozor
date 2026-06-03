import { UserProfile } from '../../types';
import { supabaseAuthService } from '../supabaseAuthService';
import { logError, logInfo, logWarn } from '../../utils/errorLogger';
import { IGoogleApiService, IGoogleAuthService } from './interfaces';
import { authTokenService } from '../authTokenService';

type GoogleWindow = Window & { gapi?: typeof gapi };
type ExchangeResponse = {
    access_token: string;
    supabase_token?: string;
    user: UserProfile;
    error?: string;
};
type UserProfileWithSupabaseToken = UserProfile & { supabaseToken?: string };
type MutableCodeClient = google.accounts.oauth2.CodeClient & {
    callback?: (response: google.accounts.oauth2.CodeResponse) => void;
};

const readExchangeResponse = async (response: Response): Promise<Partial<ExchangeResponse>> => {
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('application/json')) {
        return {};
    }

    try {
        return await response.json();
    } catch {
        return {};
    }
};

export class GoogleAuthService implements IGoogleAuthService {
    private apiService: IGoogleApiService;
    private static readonly TOKEN_KEY = 'jozor_google_access_token';
    private static readonly TOKEN_EXPIRY_KEY = 'jozor_google_token_expiry';

    constructor(apiService: IGoogleApiService) {
        this.apiService = apiService;
    }

    private loginPromise: Promise<UserProfile> | null = null;

    public async loginWithSupabase(returnTo?: string): Promise<void> {
        await supabaseAuthService.startGoogleSignIn(returnTo);
    }

    private persistToken(access_token: string, supabase_token?: string) {
        const expiry = Date.now() + 55 * 60 * 1000;
        localStorage.setItem(GoogleAuthService.TOKEN_KEY, access_token);
        localStorage.setItem(GoogleAuthService.TOKEN_EXPIRY_KEY, String(expiry));
        if (supabase_token) {
            authTokenService.setStoredSupabaseToken(supabase_token);
        }
        logInfo('GoogleAuthService persistToken', 'Token stored in localStorage.', {
            hasAccessToken: Boolean(access_token),
            expiry: new Date(expiry).toISOString()
        });
    }

    private clearPersistedToken() {
        localStorage.removeItem(GoogleAuthService.TOKEN_KEY);
        localStorage.removeItem(GoogleAuthService.TOKEN_EXPIRY_KEY);
        authTokenService.setStoredSupabaseToken(null);
    }

    private tryRestorePersistedToken(user?: UserProfileWithSupabaseToken | null): boolean {
        const token = localStorage.getItem(GoogleAuthService.TOKEN_KEY);
        const supabaseToken = authTokenService.getStoredSupabaseToken();
        const expiry = Number(localStorage.getItem(GoogleAuthService.TOKEN_EXPIRY_KEY) || '0');
        
        logInfo('GoogleAuthService tryRestore', 'Checking localStorage for token...', {
            hasToken: !!token,
            isExpired: expiry <= Date.now(),
            expiry: new Date(expiry).toISOString(),
        });

        if (token && expiry > Date.now()) {
            if (typeof gapi !== 'undefined' && gapi.client) {
                gapi.client.setToken({ access_token: token });
                if (user && supabaseToken) {
                    user.supabaseToken = supabaseToken;
                }
                logInfo('GoogleAuthService tryRestore', 'Restored token successfully into gapi.client.');
                return true;
            } else {
                logWarn('GoogleAuthService tryRestore', 'Token found but gapi.client not ready.');
            }
        } else if (token) {
            logWarn('GoogleAuthService tryRestore', 'Token found but it is expired. Clearing.');
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

            const codeClient = this.apiService.getCodeClient() as MutableCodeClient | undefined;
            if (!codeClient) {
                throw new Error('Google API (Code Client) not initialized.');
            }

            return new Promise<UserProfile>((resolve, reject) => {
                const gapiClient = (window as GoogleWindow).gapi;
                codeClient.callback = async (resp: google.accounts.oauth2.CodeResponse) => {
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

                        const data = await readExchangeResponse(exchangeRes);
                        if (!exchangeRes.ok) {
                            throw new Error(data.error || 'Token exchange failed');
                        }

                        const { access_token, supabase_token, user } = data;
                        if (!access_token || !user) {
                            throw new Error('Token exchange response was incomplete');
                        }
                        this.persistToken(access_token, supabase_token);
                        logInfo('GoogleAuthService login', 'Token persisted successfully.');
                        
                        if (typeof gapiClient !== 'undefined' && gapiClient.client) {
                            gapiClient.client.setToken({ access_token });
                        }

                        const profileWithToken: UserProfile = {
                            ...user,
                            supabaseToken: supabase_token
                        };

                        resolve(profileWithToken);
                    } catch (error: unknown) {
                        logError('GoogleAuthService login exchange', error, {
                            category: 'AUTH',
                            severity: 'HIGH',
                            metadata: { operationType: 'google_token_exchange' }
                        });
                        reject(new Error(error instanceof Error ? error.message : 'Failed to authenticate with server.'));
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

        if (!(window as GoogleWindow).gapi?.client) {
            let retry = 0;
            while (!(window as GoogleWindow).gapi?.client && retry < 10) {
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

        let token = gapi.client.getToken();

        if (!token || !token.access_token) {
            // Last ditch effort: try to restore from localStorage if gapi lost it
            if (this.tryRestorePersistedToken()) {
                token = gapi.client.getToken();
            }
        }

        if (!token || !token.access_token) {
            logWarn('GoogleAuthService ensureTokenValid', 'No Google token found in gapi.client or localStorage.', {
                category: 'AUTH',
                metadata: { operationType: 'google_token_validation' }
            });
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
        } catch {
            return false;
        }

        return true;
    }

    public logout(): void {
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
