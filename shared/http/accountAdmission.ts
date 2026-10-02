/** Missing preserves the deployed baseline; a present invalid value fails closed. */
export function isAccountAdmissionPaused(env: Record<string, string | undefined>): boolean {
  return env.ACCOUNT_ADMISSION_PAUSED !== undefined && env.ACCOUNT_ADMISSION_PAUSED.trim() !== 'false';
}

export const ACCOUNT_ADMISSION_PAUSE_HEADERS = {
  'Cache-Control': 'no-store',
  'Retry-After': '300',
} as const;

export const ACCOUNT_ADMISSION_PAUSE_BODY = {
  code: 'ACCOUNT_ADMISSION_PAUSED',
  error: 'New checkout and account deletion requests are temporarily paused.',
} as const;
