// Google Sign-In verification + lightweight JWT session auth.
//
// Flow: the frontend obtains a Google ID token via Google Identity Services and
// POSTs it to /api/auth/google. We verify it against Google, find-or-create the
// user, and hand back our own signed session JWT. Subsequent API calls send that
// JWT as `Authorization: Bearer <token>`; authMiddleware validates it.

import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { upsertUser } from './db.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-insecure-secret-change-me';
const SESSION_TTL = '30d';

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

export function authConfigured() {
  return Boolean(GOOGLE_CLIENT_ID);
}

// The OAuth client id is public; the frontend fetches it at runtime so the
// Docker image needs no build-time secret (plain `docker compose up -d` works).
export function googleClientId() {
  return GOOGLE_CLIENT_ID;
}

// Verify a Google ID token, upsert the user, return { token, user }.
export async function loginWithGoogle(idToken) {
  if (!GOOGLE_CLIENT_ID) throw new Error('GOOGLE_CLIENT_ID is not configured on the server');
  const ticket = await googleClient.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID });
  const p = ticket.getPayload();
  if (!p?.sub) throw new Error('invalid Google token');
  const user = await upsertUser({ sub: p.sub, email: p.email, name: p.name, picture: p.picture });
  const token = jwt.sign({ uid: user.id }, SESSION_SECRET, { expiresIn: SESSION_TTL });
  return { token, user };
}

// Express middleware: require a valid session JWT, set req.userId.
export function authMiddleware(req, res, next) {
  const h = req.headers.authorization || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m) return res.status(401).json({ error: 'unauthenticated' });
  try {
    const payload = jwt.verify(m[1], SESSION_SECRET);
    req.userId = Number(payload.uid);
    next();
  } catch {
    res.status(401).json({ error: 'invalid or expired session' });
  }
}
