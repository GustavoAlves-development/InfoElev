import { clientIp, json, rateLimited, readJson } from "./_lib/http.js";
import { getUser, normalizeEmail, saveUser } from "./_lib/users.js";
import { verifyPassword } from "./_lib/password.js";
import { createSessionCookie } from "./_lib/session.js";

export async function POST(request) {
  const { email, password } = await readJson(request);
  const normalized = normalizeEmail(email);
  if (!normalized || !password) return json({ error: "Enter your email and password." }, 400);
  if ((await rateLimited("login:" + normalized, 10, 900)) || (await rateLimited("login-ip:" + clientIp(request), 30, 900))) {
    return json({ error: "Too many attempts. Please wait 15 minutes and try again." }, 429);
  }

  const user = await getUser(normalized);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return json({ error: "Email or password is incorrect." }, 401);
  }

  user.lastLoginAt = new Date().toISOString();
  user.loginCount = (user.loginCount || 0) + 1;
  await saveUser(user);
  return json({ ok: true }, 200, { "Set-Cookie": await createSessionCookie(user) });
}
