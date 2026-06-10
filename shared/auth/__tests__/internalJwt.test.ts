import { describe, expect, it } from 'vitest';
import crypto from 'node:crypto';
import { verifyInternalToken } from '../internalJwt';

const SECRET = 'my-super-secret-key-at-least-32-chars-long';

function signJwtForTest(
  header: Record<string, unknown>,
  payload: Record<string, unknown>,
  secret: string
): string {
  const base64UrlEncode = (obj: unknown) => {
    const str = typeof obj === 'string' ? obj : JSON.stringify(obj);
    return Buffer.from(str)
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  };

  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(payload);
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signingInput)
    .digest('base64url');

  return `${signingInput}.${signature}`;
}

describe('verifyInternalToken', () => {
  it('validates a correct internal JWT', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = signJwtForTest(
      { alg: 'HS256', typ: 'JWT' },
      { sub: 'user-123', email: 'test@example.com', exp: now + 60 },
      SECRET
    );

    const user = await verifyInternalToken(token, SECRET);
    expect(user).not.toBeNull();
    expect(user?.uid).toBe('user-123');
    expect(user?.email).toBe('test@example.com');
  });

  it('rejects an invalid signature', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = signJwtForTest(
      { alg: 'HS256', typ: 'JWT' },
      { sub: 'user-123', email: 'test@example.com', exp: now + 60 },
      SECRET
    );
    // Tamper the signature slightly
    const tampered = token.slice(0, -5) + 'xxxxx';

    const user = await verifyInternalToken(tampered, SECRET);
    expect(user).toBeNull();
  });

  it('rejects a signature of incorrect length', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = signJwtForTest(
      { alg: 'HS256', typ: 'JWT' },
      { sub: 'user-123', email: 'test@example.com', exp: now + 60 },
      SECRET
    );
    // Truncate signature
    const parts = token.split('.');
    parts[2] = parts[2].slice(0, 10);
    const truncated = parts.join('.');

    const user = await verifyInternalToken(truncated, SECRET);
    expect(user).toBeNull();
  });

  it('rejects incorrect algorithms', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = signJwtForTest(
      { alg: 'HS384', typ: 'JWT' },
      { sub: 'user-123', email: 'test@example.com', exp: now + 60 },
      SECRET
    );

    const user = await verifyInternalToken(token, SECRET);
    expect(user).toBeNull();
  });

  it('rejects incorrect typ', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = signJwtForTest(
      { alg: 'HS256', typ: 'NOT-JWT' },
      { sub: 'user-123', email: 'test@example.com', exp: now + 60 },
      SECRET
    );

    const user = await verifyInternalToken(token, SECRET);
    expect(user).toBeNull();
  });

  it('rejects expired tokens', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = signJwtForTest(
      { alg: 'HS256', typ: 'JWT' },
      { sub: 'user-123', email: 'test@example.com', exp: now - 1 },
      SECRET
    );

    const user = await verifyInternalToken(token, SECRET);
    expect(user).toBeNull();
  });

  it('rejects tokens when exp === now', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = signJwtForTest(
      { alg: 'HS256', typ: 'JWT' },
      { sub: 'user-123', email: 'test@example.com', exp: now },
      SECRET
    );

    const user = await verifyInternalToken(token, SECRET);
    expect(user).toBeNull();
  });

  it('rejects tokens with missing exp', async () => {
    const token = signJwtForTest(
      { alg: 'HS256', typ: 'JWT' },
      { sub: 'user-123', email: 'test@example.com' },
      SECRET
    );

    const user = await verifyInternalToken(token, SECRET);
    expect(user).toBeNull();
  });

  it('rejects tokens with non-finite or non-integer exp', async () => {
    const token1 = signJwtForTest(
      { alg: 'HS256', typ: 'JWT' },
      { sub: 'user-123', email: 'test@example.com', exp: Infinity },
      SECRET
    );
    const token2 = signJwtForTest(
      { alg: 'HS256', typ: 'JWT' },
      { sub: 'user-123', email: 'test@example.com', exp: 12345.67 },
      SECRET
    );

    expect(await verifyInternalToken(token1, SECRET)).toBeNull();
    expect(await verifyInternalToken(token2, SECRET)).toBeNull();
  });

  it('rejects empty or whitespace-only sub', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token1 = signJwtForTest(
      { alg: 'HS256', typ: 'JWT' },
      { sub: '', email: 'test@example.com', exp: now + 60 },
      SECRET
    );
    const token2 = signJwtForTest(
      { alg: 'HS256', typ: 'JWT' },
      { sub: '   ', email: 'test@example.com', exp: now + 60 },
      SECRET
    );

    expect(await verifyInternalToken(token1, SECRET)).toBeNull();
    expect(await verifyInternalToken(token2, SECRET)).toBeNull();
  });

  it('rejects empty or whitespace-only email', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token1 = signJwtForTest(
      { alg: 'HS256', typ: 'JWT' },
      { sub: 'user-123', email: '', exp: now + 60 },
      SECRET
    );
    const token2 = signJwtForTest(
      { alg: 'HS256', typ: 'JWT' },
      { sub: 'user-123', email: '   ', exp: now + 60 },
      SECRET
    );

    expect(await verifyInternalToken(token1, SECRET)).toBeNull();
    expect(await verifyInternalToken(token2, SECRET)).toBeNull();
  });

  it('rejects tokens exceeding 8192 characters', async () => {
    const now = Math.floor(Date.now() / 1000);
    const longSub = 'a'.repeat(8192);
    const token = signJwtForTest(
      { alg: 'HS256', typ: 'JWT' },
      { sub: longSub, email: 'test@example.com', exp: now + 60 },
      SECRET
    );

    const user = await verifyInternalToken(token, SECRET);
    expect(user).toBeNull();
  });

  it('rejects tokens with malformed base64url characters', async () => {
    const now = Math.floor(Date.now() / 1000);
    const parts = signJwtForTest(
      { alg: 'HS256', typ: 'JWT' },
      { sub: 'user-123', email: 'test@example.com', exp: now + 60 },
      SECRET
    ).split('.');

    // Introduce invalid base64url character '+' or '/' or '='
    parts[1] = parts[1] + '+';
    const malformed = parts.join('.');

    const user = await verifyInternalToken(malformed, SECRET);
    expect(user).toBeNull();
  });

  it('rejects when payload is not an object', async () => {
    const base64UrlEncode = (str: string) => {
      return Buffer.from(str)
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
    };

    const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    // Payload is a string instead of JSON object
    const payload = base64UrlEncode('"just-a-string"');
    const signingInput = `${header}.${payload}`;
    const signature = crypto
      .createHmac('sha256', SECRET)
      .update(signingInput)
      .digest('base64url');

    const token = `${signingInput}.${signature}`;

    const user = await verifyInternalToken(token, SECRET);
    expect(user).toBeNull();
  });

  it('rejects when token does not have 3 parts', async () => {
    const user1 = await verifyInternalToken('part1.part2', SECRET);
    const user2 = await verifyInternalToken('part1.part2.part3.part4', SECRET);

    expect(user1).toBeNull();
    expect(user2).toBeNull();
  });

  it('returns null if secret is missing', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = signJwtForTest(
      { alg: 'HS256', typ: 'JWT' },
      { sub: 'user-123', email: 'test@example.com', exp: now + 60 },
      SECRET
    );

    const user = await verifyInternalToken(token, undefined);
    expect(user).toBeNull();
  });
});
