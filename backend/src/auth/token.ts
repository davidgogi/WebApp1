import { createHmac, timingSafeEqual } from 'node:crypto';

const TOKEN_LIFETIME_MS = 12 * 60 * 60 * 1000;

function sign(payload: string): string {
  const secret = process.env.AUTH_SECRET ?? 'dev-only-secret-change-me';
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export type TokenKind = 'user' | 'platform';

export function signToken(id: string, kind: TokenKind): string {
  const payload = Buffer.from(JSON.stringify({ u: id, k: kind, exp: Date.now() + TOKEN_LIFETIME_MS })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token: string): { id: string; kind: TokenKind } | null {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) {
    return null;
  }
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null;
  }
  try {
    const { u, k, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { u: string; k?: TokenKind; exp: number };
    return exp > Date.now() ? { id: u, kind: k === 'platform' ? 'platform' : 'user' } : null;
  } catch {
    return null;
  }
}
