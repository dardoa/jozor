export interface AuthenticatedUser {
  uid: string;
  email: string;
  token?: string;
  type?: 'internal';
}

function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const binaryString = atob(padded);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Verifies our internal JWT signed with SUPABASE_JWT_SECRET.
 * Compatible with Node.js, Vercel Edge Runtime, and browser/Vite.
 */
export async function verifyInternalToken(
  token: string,
  jwtSecret: string | undefined
): Promise<AuthenticatedUser | null> {
  if (!jwtSecret) {
    return null;
  }

  // 1. Enforce a reasonable token length limit (e.g. 8KB) to prevent DoS
  if (!token || typeof token !== 'string' || token.length > 8192) {
    return null;
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;

    // 2. Validate Base64URL characters in all parts before decoding
    const base64UrlRegex = /^[A-Za-z0-9_-]+$/;
    if (!base64UrlRegex.test(headerB64) || !base64UrlRegex.test(payloadB64) || !base64UrlRegex.test(signatureB64)) {
      return null;
    }

    // Decode header and verify structure
    const headerBytes = base64UrlDecode(headerB64);
    const headerJson = new TextDecoder().decode(headerBytes);
    const header = JSON.parse(headerJson) as { alg?: string; typ?: string };

    if (header.alg !== 'HS256' || header.typ !== 'JWT') {
      return null;
    }

    // Verify signature using Web Crypto HMAC verification
    const cryptoInstance = typeof crypto !== 'undefined' ? crypto : (globalThis as any).crypto;
    if (!cryptoInstance || !cryptoInstance.subtle) {
      throw new Error('Web Crypto API is not available');
    }

    const encoder = new TextEncoder();
    const key = await cryptoInstance.subtle.importKey(
      'raw',
      encoder.encode(jwtSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signatureBytes = base64UrlDecode(signatureB64);
    const signingInputBytes = encoder.encode(`${headerB64}.${payloadB64}`);

    const valid = await cryptoInstance.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      signingInputBytes
    );

    if (!valid) return null;

    // Decode payload and verify claims
    const payloadBytes = base64UrlDecode(payloadB64);
    const payloadJson = new TextDecoder().decode(payloadBytes);
    const payload = JSON.parse(payloadJson);

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return null;
    }

    const { sub, email, exp } = payload as { sub?: unknown; email?: unknown; exp?: unknown };

    if (typeof sub !== 'string' || !sub.trim()) {
      return null;
    }

    if (typeof email !== 'string' || !email.trim()) {
      return null;
    }

    // exp must be a finite integer, and must be strictly in the future (exp > now)
    if (
      typeof exp !== 'number' ||
      !Number.isFinite(exp) ||
      !Number.isInteger(exp) ||
      exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return {
      uid: sub.trim(),
      email: email.trim(),
      token,
      type: 'internal',
    };
  } catch {
    return null;
  }
}
