const KEY = 'jozor-account-deletion-receipt';
type Receipt = { identity: string; value: string };
export type AccountDeletionStatus = 'pending' | 'complete';

export function getStoredAccountDeletionReceipt(): string | null {
  try {
    const stored = JSON.parse(sessionStorage.getItem(KEY) ?? 'null');
    return typeof stored?.value === 'string' && /^[0-9a-f]{64}$/.test(stored.value) ? stored.value : null;
  } catch { return null; }
}

async function identity(uid: string, token?: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([uid, token ?? ''])));
  return [...new Uint8Array(bytes)].map(value => value.toString(16).padStart(2, '0')).join('');
}

export async function getAccountDeletionReceipt(uid: string, token?: string): Promise<{ receipt: string; existing: boolean }> {
  const owner = await identity(uid, token);
  let stored: Partial<Receipt> | null = null;
  try { stored = JSON.parse(sessionStorage.getItem(KEY) ?? 'null'); } catch { /* Replace malformed local data. */ }
  if (stored?.identity === owner && typeof stored.value === 'string' && /^[0-9a-f]{64}$/.test(stored.value)) {
    return { receipt: stored.value, existing: true };
  }
  const value = [...crypto.getRandomValues(new Uint8Array(32))].map(byte => byte.toString(16).padStart(2, '0')).join('');
  // Persist before the destructive request. No account bearer is stored here.
  sessionStorage.setItem(KEY, JSON.stringify({ identity: owner, value } satisfies Receipt));
  return { receipt: value, existing: false };
}

export function clearAccountDeletionReceipt(receipt: string) {
  try {
    if (JSON.parse(sessionStorage.getItem(KEY) ?? 'null')?.value === receipt) sessionStorage.removeItem(KEY);
  } catch { /* A receipt cannot grant access to the deleted account. */ }
}

export async function readAccountDeletionStatus(receipt: string): Promise<AccountDeletionStatus | null> {
  const response = await fetch('/api/auth/delete-account', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'status', receipt }), signal: AbortSignal.timeout(10000),
  });
  const data = await response.json().catch(() => null);
  if (response.status === 404 && data?.status === 'unconfirmed') return null;
  if (response.status !== 200 || (data?.status !== 'pending' && data?.status !== 'complete')) {
    throw new Error('Unable to confirm account deletion');
  }
  return data.status;
}
