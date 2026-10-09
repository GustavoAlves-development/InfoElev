// Tiny Stripe REST client and webhook signature check (no SDK dependency).
// Env: STRIPE_SECRET_KEY (restricted key: Checkout Sessions write, Prices read), STRIPE_WEBHOOK_SECRET.

import { createHmac, timingSafeEqual } from "node:crypto";

export async function stripe(method, path, params) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  const body = params ? new URLSearchParams(params).toString() : undefined;
  const url = "https://api.stripe.com/v1" + path + (method === "GET" && body ? "?" + body : "");
  const res = await fetch(url, {
    method,
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/x-www-form-urlencoded" },
    body: method === "GET" ? undefined : body,
  });
  const json = await res.json();
  if (!res.ok) throw new Error("stripe " + path + ": " + (json.error?.message || res.status));
  return json;
}

// Verifies the Stripe-Signature header against the raw body. Returns the parsed event or throws.
export function verifyWebhook(rawBody, header, secret = process.env.STRIPE_WEBHOOK_SECRET, toleranceSec = 300) {
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  const parts = Object.fromEntries(String(header || "").split(",").map((kv) => kv.split("=")).filter((p) => p.length === 2).map(([k, v]) => [k, v]));
  const signatures = String(header || "").split(",").filter((kv) => kv.startsWith("v1=")).map((kv) => kv.slice(3));
  const timestamp = Number(parts.t);
  if (!timestamp || !signatures.length) throw new Error("bad signature header");
  if (Math.abs(Date.now() / 1000 - timestamp) > toleranceSec) throw new Error("signature timestamp too old");
  const expected = createHmac("sha256", secret).update(timestamp + "." + rawBody).digest("hex");
  const ok = signatures.some((sig) => sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected)));
  if (!ok) throw new Error("signature mismatch");
  return JSON.parse(rawBody);
}

export function signWebhook(rawBody, secret, timestamp = Math.floor(Date.now() / 1000)) {
  const sig = createHmac("sha256", secret).update(timestamp + "." + rawBody).digest("hex");
  return `t=${timestamp},v1=${sig}`;
}
