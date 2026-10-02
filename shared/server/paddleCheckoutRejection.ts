const MAX_REJECTION_BYTES = 32768;
const REJECTION_CODES = new Set(['transaction_price_not_found', 'invalid_field']);

export async function isDefinitiveCheckoutRejection(response: Response, signal: AbortSignal): Promise<boolean> {
  if (signal.aborted) {
    void response.body?.cancel().catch(() => {});
    return false;
  }
  if (response.status !== 400 || !response.body || response.body.locked) return false;
  const reader = response.body.getReader();
  let complete = false;
  let cancelled = false;
  const cancel = () => {
    if (!cancelled) {
      cancelled = true;
      // A broken underlying cancel must not extend the provider deadline.
      void reader.cancel().catch(() => {});
    }
  };
  let rejectAbort!: (error: Error) => void;
  const aborted = new Promise<never>((_, reject) => { rejectAbort = reject; });
  const onAbort = () => { cancel(); rejectAbort(new Error('Provider read deadline exceeded')); };
  signal.addEventListener('abort', onAbort, { once: true });
  try {
    if (signal.aborted) return false;
    const decoder = new TextDecoder('utf-8', { fatal: true });
    let bytes = 0;
    let body = '';
    while (true) {
      const chunk = await Promise.race([reader.read(), aborted]);
      if (signal.aborted) return false;
      if (chunk.done) { complete = true; break; }
      bytes += chunk.value.byteLength;
      if (bytes > MAX_REJECTION_BYTES) return false;
      body += decoder.decode(chunk.value, { stream: true });
    }
    body += decoder.decode();
    const value: unknown = JSON.parse(body);
    if (!value || typeof value !== 'object' || Array.isArray(value)
      || Object.keys(value).some(key => key !== 'error' && key !== 'meta') || !('error' in value)) return false;
    const error = value.error;
    if (!error || typeof error !== 'object' || Array.isArray(error) || !('type' in error) || !('code' in error)) return false;
    return !signal.aborted && error.type === 'request_error' && typeof error.code === 'string' && REJECTION_CODES.has(error.code);
  } catch { return false; }
  finally {
    signal.removeEventListener('abort', onAbort);
    if (!complete) cancel();
    try { reader.releaseLock(); } catch { /* Cancellation may still be settling. */ }
  }
}
