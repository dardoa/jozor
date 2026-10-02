import { afterEach, describe, expect, it, vi } from 'vitest';
import { isDefinitiveCheckoutRejection } from '../paddleCheckoutRejection';

const envelope = (code = 'invalid_field') => ({ error: { type: 'request_error', code, detail: 'synthetic private detail' }, meta: { request_id: 'synthetic' } });
const classify = (value: unknown, status = 400) => isDefinitiveCheckoutRejection(new Response(JSON.stringify(value), { status }), new AbortController().signal);
const streamed = (chunks: Uint8Array[], end = true) => {
  const cancel = vi.fn(); let index = 0;
  const stream = new ReadableStream<Uint8Array>({ pull(controller) {
    if (index < chunks.length) controller.enqueue(chunks[index++]); else if (end) controller.close();
  }, cancel });
  return { response: new Response(stream, { status: 400, headers: { 'Content-Length': '1' } }), cancel };
};

describe('bounded Paddle checkout rejection classifier', () => {
  afterEach(() => vi.useRealTimers());
  it.each(['invalid_field', 'transaction_price_not_found'])('accepts only documented request rejection %s', async code => {
    expect(await classify(envelope(code))).toBe(true);
  });
  it.each([200, 201, 302, 401, 403, 404, 408, 429, 500, 503])('does not infer rejection from HTTP %i', async status => {
    expect(await classify(envelope(), status)).toBe(false);
  });
  it.each([null, [], 'error', 42, {}, { error: null }, { error: [] }, { error: 'invalid_field' },
    envelope('unknown'), { error: { type: 'api_error', code: 'invalid_field' } }, { error: { type: 'request_error', code: 3 } },
    { ...envelope(), data: null }, { ...envelope(), data: { id: 'txn_created' } }, { ...envelope(), transaction_id: 'txn_created' }])('rejects ambiguous envelope %j', async value => {
    expect(await classify(value)).toBe(false);
  });
  it.each(['{', JSON.stringify(envelope()).slice(0, -1), 'not-json'])('rejects incomplete JSON %j', async body => {
    expect(await isDefinitiveCheckoutRejection(new Response(body, { status: 400 }), new AbortController().signal)).toBe(false);
  });
  it('counts streamed bytes rather than trusting a falsely low content length', async () => {
    const bytes = new TextEncoder().encode(JSON.stringify({ error: { type: 'request_error', code: 'invalid_field', detail: 'x'.repeat(33000) } }));
    const { response, cancel } = streamed([bytes.slice(0, 100), bytes.slice(100)], false);
    expect(await isDefinitiveCheckoutRejection(response, new AbortController().signal)).toBe(false);
    expect(cancel).toHaveBeenCalledOnce();
  });
  it('uses UTF-8 byte length even when character count is below the bound', async () => {
    const body = JSON.stringify({ error: { type: 'request_error', code: 'invalid_field', detail: 'é'.repeat(17000) } });
    expect(body.length).toBeLessThan(32768);
    const { response, cancel } = streamed([new TextEncoder().encode(body)], false);
    expect(await isDefinitiveCheckoutRejection(response, new AbortController().signal)).toBe(false);
    expect(cancel).toHaveBeenCalledOnce();
  });
  it.each([32768, 32769])('enforces the exact %i-byte boundary', async size => {
    const body = JSON.stringify(envelope());
    const { response } = streamed([new TextEncoder().encode(body + ' '.repeat(size - body.length))]);
    expect(await isDefinitiveCheckoutRejection(response, new AbortController().signal)).toBe(size === 32768);
  });
  it('returns false on stream failure and malformed UTF-8', async () => {
    const response = new Response(new ReadableStream({ start(controller) { controller.error(new Error('private')); } }), { status: 400 });
    expect(await isDefinitiveCheckoutRejection(response, new AbortController().signal)).toBe(false);
    expect(await isDefinitiveCheckoutRejection(new Response(new Uint8Array([255]), { status: 400 }), new AbortController().signal)).toBe(false);
  });
  it('cancels a hanging reader at the supplied deadline without awaiting a hanging cancel', async () => {
    vi.useFakeTimers(); const controller = new AbortController(); const cancel = vi.fn(() => new Promise<void>(() => {}));
    const response = new Response(new ReadableStream({ cancel }), { status: 400 });
    const pending = isDefinitiveCheckoutRejection(response, controller.signal);
    setTimeout(() => controller.abort(), 10000);
    await vi.advanceTimersByTimeAsync(10000);
    expect(await pending).toBe(false); expect(cancel).toHaveBeenCalledOnce();
  });
  it('refuses and cancels an already aborted response', async () => {
    const { response, cancel } = streamed([] , false); const controller = new AbortController(); controller.abort();
    expect(await isDefinitiveCheckoutRejection(response, controller.signal)).toBe(false);
    expect(cancel).toHaveBeenCalledOnce();
  });
  it('fails closed if the response stream is already locked', async () => {
    const response = new Response(JSON.stringify(envelope()), { status: 400 });
    const reader = response.body!.getReader();
    await expect(isDefinitiveCheckoutRejection(response, new AbortController().signal)).resolves.toBe(false);
    reader.releaseLock();
  });
});
