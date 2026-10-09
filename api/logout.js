import { json } from "./_lib/http.js";
import { clearSessionCookie } from "./_lib/session.js";

export function POST() {
  return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie() });
}
