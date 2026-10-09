import { json, readJson } from "./_lib/http.js";
import { getUser, saveUser } from "./_lib/users.js";
import { hashPassword } from "./_lib/password.js";
import { redis } from "./_lib/redis.js";
import { createSessionCookie } from "./_lib/session.js";

export async function POST(request) {
  const { token, password } = await readJson(request);
  if (!password || String(password).length < 8) return json({ error: "The new password must have at least 8 characters." }, 400);
  const email = token ? await redis("GET", "reset:" + token) : null;
  const user = email ? await getUser(email) : null;
  if (!user) return json({ error: "This reset link is invalid or has expired. Request a new one." }, 400);

  await redis("DEL", "reset:" + token);
  user.passwordHash = await hashPassword(String(password));
  user.sessionVersion = (user.sessionVersion || 1) + 1;
  await saveUser(user);
  return json({ ok: true }, 200, { "Set-Cookie": await createSessionCookie(user) });
}
