// Signed session cookie: base64url(JSON {e: email, v: sessionVersion, exp}) + "." + HMAC-SHA256.
// Uses Web Crypto only, so the same code runs in Node functions and Edge middleware.

export const COOKIE = "infoelev_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const enc = new TextEncoder();
const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

async function hmac(data) {
  const secret = globalThis.process?.env?.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET must be set (32+ chars)");
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

export async function createSessionCookie(user) {
  const payload = b64url(enc.encode(JSON.stringify({ e: user.email, v: user.sessionVersion || 1, exp: Math.floor(Date.now() / 1000) + MAX_AGE })));
  const token = payload + "." + (await hmac(payload));
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}`;
}

export const clearSessionCookie = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

// Returns {email, version} for a valid, unexpired cookie, otherwise null.
export async function readSession(request) {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(new RegExp("(?:^|;\\s*)" + COOKIE + "=([^;]+)"));
  if (!match) return null;
  const [payload, sig] = match[1].split(".");
  if (!payload || !sig) return null;
  const expected = await hmac(payload);
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff) return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(fromB64url(payload)));
    if (!data.e || data.exp < Date.now() / 1000) return null;
    return { email: data.e, version: data.v };
  } catch {
    return null;
  }
}
