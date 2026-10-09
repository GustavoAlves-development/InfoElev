// Shared helpers for the API routes (Web-standard Request/Response handlers).

import { readSession } from "./session.js";
import { getUser } from "./users.js";
import { redis } from "./redis.js";

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers } });

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

// The logged-in user, or null. Sessions die when the password changes (sessionVersion bump).
export async function currentUser(request) {
  const session = await readSession(request);
  if (!session) return null;
  const user = await getUser(session.email);
  if (!user || (user.sessionVersion || 1) !== session.version) return null;
  return user;
}

// Fixed-window limiter: at most `max` hits per `windowSec` for a key. Returns true when blocked.
export async function rateLimited(key, max, windowSec) {
  const count = await redis("INCR", "rl:" + key);
  if (count === 1) await redis("EXPIRE", "rl:" + key, windowSec);
  return count > max;
}

export const clientIp = (request) => (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
