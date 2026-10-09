// Vercel Routing Middleware: protects the member area before any static file is served.
//   /app/<app>.html          → logged in + any access to that app ("tools" or "full")
//   /app/content/<app>.js    → logged in + "full" access (course chapters)
//   /account.html            → logged in
//   /admin.html              → logged in + email listed in ADMIN_EMAILS
// Returning nothing lets the request continue to the static file.

import { readSession } from "./api/_lib/session.js";
import { getUser, isAdmin } from "./api/_lib/users.js";
import { accessOf } from "./api/_lib/catalog.js";

export const config = {
  matcher: ["/app/:path*", "/account.html", "/admin.html"],
};

const toLogin = (url) => Response.redirect(new URL("/login.html?next=" + encodeURIComponent(url.pathname + url.search), url), 302);

export default async function middleware(request) {
  const url = new URL(request.url);
  const session = await readSession(request);
  const user = session ? await getUser(session.email) : null;
  const valid = user && (user.sessionVersion || 1) === session.version;

  if (url.pathname.startsWith("/app/content/")) {
    const app = url.pathname.slice("/app/content/".length).replace(/\.js$/, "");
    if (!valid || accessOf(user)[app] !== "full") return new Response("// locked", { status: 403, headers: { "Content-Type": "text/javascript", "Cache-Control": "no-store" } });
    return;
  }

  if (!valid) return toLogin(url);

  if (url.pathname === "/admin.html" && !isAdmin(user.email)) return Response.redirect(new URL("/account.html", url), 302);

  if (url.pathname.startsWith("/app/")) {
    const app = url.pathname.slice("/app/".length).replace(/\.html$/, "");
    if (!accessOf(user)[app]) return Response.redirect(new URL("/account.html?locked=" + encodeURIComponent(app), url), 302);
  }
}
