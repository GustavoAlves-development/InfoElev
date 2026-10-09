// Change password while logged in. Logs out every other session.

import { currentUser, json, readJson } from "./_lib/http.js";
import { hashPassword, verifyPassword } from "./_lib/password.js";
import { createSessionCookie } from "./_lib/session.js";
import { saveUser } from "./_lib/users.js";

export async function POST(request) {
  const user = await currentUser(request);
  if (!user) return json({ error: "Not logged in." }, 401);
  const { current, next } = await readJson(request);
  if (!(await verifyPassword(current, user.passwordHash))) return json({ error: "Your current password is incorrect." }, 400);
  if (!next || String(next).length < 8) return json({ error: "The new password must have at least 8 characters." }, 400);

  user.passwordHash = await hashPassword(String(next));
  user.sessionVersion = (user.sessionVersion || 1) + 1;
  await saveUser(user);
  return json({ ok: true }, 200, { "Set-Cookie": await createSessionCookie(user) });
}
