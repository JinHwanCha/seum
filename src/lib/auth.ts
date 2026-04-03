import { SignJWT, jwtVerify } from 'jose';
import { cookies, headers } from 'next/headers';
import bcrypt from 'bcryptjs';
import { JWT_SECRET_KEY, COOKIE_NAME } from './constants';
import type { SessionPayload } from './types';

export async function createToken(payload: SessionPayload, expiresIn: string = '7d'): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(JWT_SECRET_KEY);
}

export async function verifyToken(token: string): Promise<SessionPayload> {
  const { payload } = await jwtVerify(token, JWT_SECRET_KEY);
  return payload as unknown as SessionPayload;
}

export async function getSession(): Promise<SessionPayload | null> {
  // Fast path: use pre-verified payload from middleware
  try {
    const headerStore = headers();
    const payloadHeader = headerStore.get('x-session-payload');
    if (payloadHeader) {
      return JSON.parse(payloadHeader) as SessionPayload;
    }
  } catch {
    // Fall through to cookie-based verification
  }

  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
