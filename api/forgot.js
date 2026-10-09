// Emails a one-hour reset link. Always answers the same way so it can't be used to probe for accounts.

import { clientIp, json, rateLimited, readJson } from "./_lib/http.js";
import { getUser, normalizeEmail } from "./_lib/users.js";
import { randomToken } from "./_lib/password.js";
import { redis } from "./_lib/redis.js";
import { resetEmail, sendEmail } from "./_lib/email.js";

export async function POST(request) {
  const email = normalizeEmail((await readJson(request)).email);
  const answer = json({ ok: true, message: "If an account exists for that email, we've sent a reset link." });
  if (!email) return json({ error: "Enter your email." }, 400);
  if ((await rateLimited("forgot:" + email, 3, 3600)) || (await rateLimited("forgot-ip:" + clientIp(request), 10, 3600))) return answer;

  if (await getUser(email)) {
    const token = randomToken();
    await redis("SET", "reset:" + token, email, "EX", 3600);
    await sendEmail(resetEmail({ email, token }));
  }
  return answer;
}
