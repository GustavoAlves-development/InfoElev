// Creates the Stripe webhook for https://infoelev.com/api/webhook and stores its signing secret
// (and, optionally, the checkout key) in the Vercel project's production env. Secrets are never printed.
//
// Needs (PowerShell), one restricted key with:
//   Checkout Sessions: Write, Prices: Read (used by the site) + Webhook Endpoints: Write (used here)
//   $env:STRIPE_SECRET_KEY = "rk_live_..."
//   node scripts/stripe-webhook-setup.mjs [--recreate]
// The same key is saved as the site's STRIPE_SECRET_KEY, unless STRIPE_RUNTIME_KEY is set to a separate one.
//
// Stripe only reveals a webhook's secret when it is created, so if the endpoint already exists
// use --recreate to delete it and create a fresh one.

import { spawnSync } from "node:child_process";

const URL_ = (process.env.SITE_URL || "https://infoelev.com").replace(/\/$/, "") + "/api/webhook";
const EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "charge.refunded",
  "customer.subscription.updated",
  "customer.subscription.deleted",
];
const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("Set STRIPE_SECRET_KEY first (restricted key: Checkout Sessions Write, Prices Read, Webhook Endpoints Write).");
  process.exit(1);
}

async function stripe(method, path, params) {
  const body = params ? new URLSearchParams(params).toString() : undefined;
  const res = await fetch("https://api.stripe.com/v1" + path + (method === "GET" && body ? "?" + body : ""), {
    method,
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/x-www-form-urlencoded" },
    body: method === "GET" ? undefined : body,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(path + ": " + (json.error?.message || res.status));
  return json;
}

// Replaces a production env var on Vercel, feeding the value through stdin.
function setVercelEnv(name, value) {
  spawnSync("npx", ["--yes", "vercel@latest", "env", "rm", name, "production", "--yes"], { shell: true, stdio: "ignore" });
  const add = spawnSync("npx", ["--yes", "vercel@latest", "env", "add", name, "production", "--sensitive"], { shell: true, input: value, encoding: "utf8" });
  if (add.status !== 0) throw new Error("vercel env add " + name + " failed:\n" + (add.stderr || add.stdout).slice(-500));
  console.log("✓ " + name + " saved to Vercel (production)");
}

// Check the Vercel login first: a webhook secret that can't be saved is lost.
const whoami = spawnSync("npx", ["--yes", "vercel@latest", "whoami"], { shell: true, encoding: "utf8" });
if (whoami.status !== 0) {
  console.error("Vercel CLI is not logged in on this terminal. Run `npx vercel login` first, then run this script again.");
  process.exit(1);
}

console.log((key.includes("_live_") ? "Mode: LIVE" : "Mode: TEST") + " — endpoint " + URL_ + "\n");

const existing = (await stripe("GET", "/webhook_endpoints", { limit: "100" })).data.filter((w) => w.url === URL_);
if (existing.length && !process.argv.includes("--recreate")) {
  console.error("A webhook for this URL already exists (" + existing.map((w) => w.id).join(", ") + ").");
  console.error("Its secret can't be read again. Run with --recreate to replace it.");
  process.exit(1);
}
for (const w of existing) {
  await stripe("DELETE", "/webhook_endpoints/" + w.id);
  console.log("- deleted old endpoint " + w.id);
}

const params = { url: URL_, description: "Infoelev member access (create/revoke on payment, refund, cancel)" };
EVENTS.forEach((e, i) => (params[`enabled_events[${i}]`] = e));
const endpoint = await stripe("POST", "/webhook_endpoints", params);
console.log("+ created endpoint " + endpoint.id + " with " + EVENTS.length + " events");

setVercelEnv("STRIPE_WEBHOOK_SECRET", endpoint.secret);
setVercelEnv("STRIPE_SECRET_KEY", process.env.STRIPE_RUNTIME_KEY || key);

console.log("\nDone. Redeploy (or merge) so the site picks up the new variables.");
