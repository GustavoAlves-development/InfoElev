// Local stand-in for Vercel: static files + /api functions + middleware.js, with an in-memory database.
// Usage: node scripts/dev-server.mjs [port]      (default 5173)
// Emails are printed to this console instead of being sent.

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

process.env.INFOELEV_MEMORY_DB ??= "1";
process.env.SESSION_SECRET ??= "dev-only-session-secret-change-me-0123456789";
process.env.STRIPE_WEBHOOK_SECRET ??= "whsec_dev";
process.env.ADMIN_EMAILS ??= "admin@example.com";
process.env.SITE_URL ??= "http://localhost:" + (process.argv[2] || 5173);

const root = fileURLToPath(new URL("..", import.meta.url));

// Local-only demo accounts (in-memory database, never touches production).
const DEV_ACCOUNTS = [
  { email: "admin@example.com", password: "dev-admin-pass", product: "infoelev_all_access", note: "Local admin" },
  { email: "tools@example.com", password: "dev-tools-pass", product: "infoelev_tools", note: "Local Tools member" },
  { email: "buyer@example.com", password: "dev-buyer-pass", product: "infoelev_side_income_launchpad", note: "Local one-time buyer" },
  { email: "sprint@example.com", password: "dev-sprint-pass", product: "infoelev_sprint_7", note: "Local sprint buyer" },
];
if (process.env.INFOELEV_MEMORY_DB === "1") {
  const { grantPurchase } = await import(pathToFileURL(join(root, "api/_lib/fulfillment.js")).href);
  const { getUser, saveUser } = await import(pathToFileURL(join(root, "api/_lib/users.js")).href);
  const { hashPassword } = await import(pathToFileURL(join(root, "api/_lib/password.js")).href);
  for (const a of DEV_ACCOUNTS) {
    await grantPurchase(a.email, { id: "dev:" + a.email, product: a.product, source: "manual", note: a.note }, { sendMail: false });
    const user = await getUser(a.email);
    user.passwordHash = await hashPassword(a.password);
    await saveUser(user);
  }
  console.log("Demo accounts: " + DEV_ACCOUNTS.map((a) => a.email + " / " + a.password).join(", "));
}
const { default: middleware, config } = await import(pathToFileURL(join(root, "middleware.js")).href);

const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json" };

// Vercel-style matcher ("/app/:path*") → RegExp.
const matchers = config.matcher.map((m) => new RegExp("^" + m.replace(/\./g, "\\.").replace(/\/:path\*$/, "(?:/.*)?") + "$"));

async function toRequest(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  return new Request(process.env.SITE_URL + req.url, { method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : body });
}

async function send(res, response) {
  const headers = {};
  response.headers.forEach((v, k) => (headers[k] = v));
  const cookies = response.headers.getSetCookie?.() || [];
  if (cookies.length) headers["set-cookie"] = cookies.map((c) => c.replace("; Secure", ""));
  res.writeHead(response.status, headers);
  res.end(Buffer.from(await response.arrayBuffer()));
}

async function serveStatic(pathname) {
  let file = normalize(join(root, decodeURIComponent(pathname)));
  if (!file.startsWith(root)) return new Response("Forbidden", { status: 403 });
  try {
    if ((await stat(file)).isDirectory()) file = join(file, "index.html");
    return new Response(await readFile(file), { headers: { "Content-Type": TYPES[extname(file)] || "application/octet-stream" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

createServer(async (req, res) => {
  try {
    const request = await toRequest(req);
    const { pathname } = new URL(request.url);

    if (pathname.startsWith("/api/")) {
      const mod = await import(pathToFileURL(join(root, pathname + ".js")).href).catch(() => null);
      const handler = mod?.[req.method];
      return send(res, handler ? await handler(request) : new Response("Not found", { status: 404 }));
    }
    if (matchers.some((m) => m.test(pathname))) {
      const result = await middleware(request);
      if (result) return send(res, result);
    }
    return send(res, await serveStatic(pathname));
  } catch (err) {
    console.error(err);
    res.writeHead(500).end("Server error: " + err.message);
  }
}).listen(Number(process.argv[2] || 5173), () => console.log("Infoelev dev server on " + process.env.SITE_URL));
