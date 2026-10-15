// End-to-end tests for the member area, run in-process against the in-memory database.
// Usage: node --test scripts/test-member-area.mjs

import { test } from "node:test";
import assert from "node:assert/strict";

process.env.INFOELEV_MEMORY_DB = "1";
process.env.SESSION_SECRET = "test-session-secret-0123456789-abcdefghij";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
process.env.ADMIN_EMAILS = "owner@elevpay.test";
process.env.SITE_URL = "https://infoelev.test";
globalThis.__elevSentEmails = [];

const { default: middleware } = await import("../middleware.js");
const webhook = await import("../api/webhook.js");
const login = await import("../api/login.js");
const me = await import("../api/me.js");
const password = await import("../api/password.js");
const forgot = await import("../api/forgot.js");
const reset = await import("../api/reset.js");
const adminUsers = await import("../api/admin/users.js");
const sprints = await import("../api/sprints.js");
const { signWebhook } = await import("../api/_lib/stripe.js");
const { grantPurchase } = await import("../api/_lib/fulfillment.js");

const SITE = process.env.SITE_URL;
const emails = globalThis.__elevSentEmails;
const lastEmailTo = (to) => [...emails].reverse().find((e) => e.to === to);

const req = (path, { method = "GET", body, cookie, headers = {} } = {}) =>
  new Request(SITE + path, {
    method,
    headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}), ...headers },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });

let eventSeq = 0;
async function sendEvent(type, object, id = "evt_" + ++eventSeq) {
  const raw = JSON.stringify({ id, type, data: { object } });
  const res = await webhook.POST(req("/api/webhook", { method: "POST", body: raw, headers: { "stripe-signature": signWebhook(raw, "whsec_test") } }));
  return { status: res.status, body: await res.json() };
}

const checkout = (email, product, extra = {}) => ({
  id: "cs_" + Math.random().toString(36).slice(2),
  payment_status: "paid",
  customer_details: { email },
  metadata: { product },
  amount_total: 900,
  currency: "usd",
  ...extra,
});

async function logIn(email, pw) {
  const res = await login.POST(req("/api/login", { method: "POST", body: { email, password: pw } }));
  return { status: res.status, cookie: (res.headers.get("set-cookie") || "").split(";")[0] };
}

const passwordFrom = (mail) => mail.text.match(/Password: (\S+)/)[1];
const gate = async (path, cookie) => {
  const res = await middleware(req(path, { cookie }));
  return res ? res.status + " " + (res.headers.get("location") || "") : "pass";
};

test("anonymous visitors are sent to login and cannot load course content", async () => {
  assert.match(await gate("/app/side-hustle-ledger.html"), /^302 .*\/login\.html\?next=%2Fapp%2Fside-hustle-ledger\.html$/);
  assert.equal(await gate("/app/content/side-hustle-ledger.js"), "403 ");
  assert.match(await gate("/admin.html"), /^302 .*login/);
});

test("webhook rejects unsigned or forged events", async () => {
  const raw = JSON.stringify({ id: "evt_forged", type: "checkout.session.completed", data: { object: checkout("x@x.test", "infoelev_tools") } });
  const res = await webhook.POST(req("/api/webhook", { method: "POST", body: raw, headers: { "stripe-signature": signWebhook(raw, "whsec_wrong") } }));
  assert.equal(res.status, 400);
});

let toolsPassword, cookie;
const buyer = "Buyer@Example.test";

test("a Tools subscription creates the account and emails a generated password", async () => {
  const r = await sendEvent("checkout.session.completed", checkout(buyer, "infoelev_tools", { subscription: "sub_tools_1" }));
  assert.equal(r.body.result, "account created");
  const mail = lastEmailTo("buyer@example.test");
  assert.match(mail.subject, /Infoelev Tools/);
  toolsPassword = passwordFrom(mail);
  assert.match(toolsPassword, /^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/);
});

test("login works only with the right password", async () => {
  assert.equal((await logIn(buyer, "wrong-password")).status, 401);
  const ok = await logIn("  BUYER@example.test ", toolsPassword);
  assert.equal(ok.status, 200);
  cookie = ok.cookie;
  assert.match(cookie, /^infoelev_session=/);
});

test("Tools members open the apps but not the course chapters", async () => {
  assert.equal(await gate("/app/side-hustle-ledger.html", cookie), "pass");
  assert.equal(await gate("/app/content/side-hustle-ledger.js", cookie), "403 ");
  assert.equal(await gate("/account.html", cookie), "pass");
  assert.match(await gate("/admin.html", cookie), /^302 .*\/account\.html$/);
  const data = await (await me.GET(req("/api/me", { cookie }))).json();
  assert.equal(data.apps.find((a) => a.id === "side-hustle-ledger").level, "tools");
});

test("a second purchase is added to the same account without a new password", async () => {
  const r = await sendEvent("checkout.session.completed", checkout(buyer, "infoelev_all_access", { subscription: "sub_all_1" }));
  assert.equal(r.body.result, "product added");
  assert.doesNotMatch(lastEmailTo("buyer@example.test").text, /Password:/);
  assert.equal(await gate("/app/content/side-hustle-ledger.js", cookie), "pass");
});

test("duplicate webhook deliveries are processed once", async () => {
  const obj = checkout("dup@example.test", "infoelev_side_income_launchpad");
  assert.equal((await sendEvent("checkout.session.completed", obj, "evt_dup")).body.result, "account created");
  assert.equal((await sendEvent("checkout.session.completed", obj, "evt_dup")).body.result, "already processed");
  assert.equal(emails.filter((e) => e.to === "dup@example.test").length, 1);
});

test("canceling a subscription removes only what it granted", async () => {
  await sendEvent("customer.subscription.deleted", { id: "sub_all_1", status: "canceled" });
  const data = await (await me.GET(req("/api/me", { cookie }))).json();
  assert.equal(data.apps.find((a) => a.id === "side-hustle-ledger").level, "tools"); // Tools plan still active
  assert.equal(await gate("/app/content/side-hustle-ledger.js", cookie), "403 ");
  await sendEvent("customer.subscription.deleted", { id: "sub_tools_1", status: "canceled" });
  assert.match(await gate("/app/side-hustle-ledger.html", cookie), /^302 .*account\.html\?locked=side-hustle-ledger$/);
});

test("a full refund revokes a one-time purchase", async () => {
  await sendEvent("checkout.session.completed", checkout("refund@example.test", "infoelev_side_income_launchpad", { payment_intent: "pi_refund_1" }));
  const pw = passwordFrom(lastEmailTo("refund@example.test"));
  const c = (await logIn("refund@example.test", pw)).cookie;
  assert.equal(await gate("/app/side-income-launchpad.html", c), "pass");
  await sendEvent("charge.refunded", { payment_intent: "pi_refund_1", refunded: true });
  assert.match(await gate("/app/side-income-launchpad.html", c), /^302 .*locked=side-income-launchpad$/);
});

test("unpaid (async) checkouts do not grant access", async () => {
  const r = await sendEvent("checkout.session.completed", checkout("pending@example.test", "infoelev_full_library", { payment_status: "unpaid" }));
  assert.equal(r.body.result, "skipped: not paid yet");
});

test("admin sees every member; everyone else gets 404", async () => {
  assert.equal((await adminUsers.GET(req("/api/admin/users", { cookie }))).status, 404);
  const { password: ownerPw } = await grantPurchase("owner@elevpay.test", { id: "manual:owner", product: "infoelev_all_access", source: "manual", note: "Owner account" }, { sendMail: false });
  const owner = (await logIn("owner@elevpay.test", ownerPw)).cookie;
  assert.equal(await gate("/admin.html", owner), "pass");
  const { users } = await (await adminUsers.GET(req("/api/admin/users", { cookie: owner }))).json();
  const buyerRow = users.find((u) => u.email === "buyer@example.test");
  assert.equal(buyerRow.loginCount, 1);
  assert.deepEqual(buyerRow.purchases.map((p) => p.status), ["canceled", "canceled"]);
  assert.equal(users.find((u) => u.email === "owner@elevpay.test").purchases[0].note, "Owner account");
});

test("changing the password logs out old sessions", async () => {
  const fresh = (await logIn(buyer, toolsPassword)).cookie;
  const res = await password.POST(req("/api/password", { method: "POST", cookie: fresh, body: { current: toolsPassword, next: "new-password-123" } }));
  assert.equal(res.status, 200);
  assert.equal((await me.GET(req("/api/me", { cookie: fresh }))).status, 401);
  assert.equal((await logIn(buyer, "new-password-123")).status, 200);
});

test("forgot + reset password", async () => {
  const res = await forgot.POST(req("/api/forgot", { method: "POST", body: { email: buyer } }));
  assert.equal(res.status, 200);
  const token = decodeURIComponent(lastEmailTo("buyer@example.test").text.match(/token=(\S+)/)[1]);
  assert.equal((await reset.POST(req("/api/reset", { method: "POST", body: { token, password: "short" } }))).status, 400);
  assert.equal((await reset.POST(req("/api/reset", { method: "POST", body: { token, password: "reset-password-456" } }))).status, 200);
  assert.equal((await reset.POST(req("/api/reset", { method: "POST", body: { token, password: "another-password-789" } }))).status, 400); // single use
  assert.equal((await logIn(buyer, "reset-password-456")).status, 200);
  // unknown emails get the same answer and no email
  const before = emails.length;
  assert.equal((await forgot.POST(req("/api/forgot", { method: "POST", body: { email: "nobody@example.test" } }))).status, 200);
  assert.equal(emails.length, before);
});

test("login is rate limited", async () => {
  let last;
  for (let i = 0; i < 11; i++) last = await logIn("limited@example.test", "x");
  assert.equal(last.status, 429);
});

test("sprints: each purchase is one credit, used up when a sprint starts", async () => {
  const who = "sprinter@example.test";
  await sendEvent("checkout.session.completed", checkout(who, "infoelev_sprint_7", { payment_intent: "pi_spr_1" }));
  const r2 = await sendEvent("checkout.session.completed", checkout(who, "infoelev_sprint_7", { payment_intent: "pi_spr_2" }));
  assert.equal(r2.body.result, "product added");
  const c = (await logIn(who, passwordFrom(emails.find((e) => e.to === who)))).cookie;
  assert.equal(await gate("/app/sprints.html", c), "pass");
  assert.equal(await gate("/app/side-income-launchpad.html", c).then((g) => g.startsWith("302")), true);

  const post = async (body) => sprints.POST(req("/api/sprints", { method: "POST", body, cookie: c }));
  let data = await (await sprints.GET(req("/api/sprints", { cookie: c }))).json();
  assert.deepEqual(data.credits, { 7: 2, 30: 0, 90: 0 });

  assert.equal((await post({ action: "start", days: 30, goal: "x" })).status, 402);
  assert.equal((await post({ action: "start", days: 7, goal: "" })).status, 400);
  data = await (await post({ action: "start", days: 7, goal: "First 3 gigs", target: "150" })).json();
  assert.equal(data.credits[7], 1);
  const s = data.sprints[0];
  assert.equal(s.target, 150);

  data = await (await post({ action: "checkin", id: s.id, day: 1, done: true, amount: "40.5", note: "<b>hi</b>" })).json();
  assert.deepEqual({ ...data.sprints[0].checkins[1], at: undefined }, { done: true, amount: 40.5, note: "<b>hi</b>", at: undefined });
  assert.equal((await post({ action: "checkin", id: s.id, day: 5, done: true })).status, 400); // not open yet
  assert.equal((await post({ action: "checkin", id: s.id, day: 8, done: true })).status, 400); // past the end

  // Another member can't touch this sprint.
  const other = (await logIn("refund@example.test", passwordFrom(lastEmailTo("refund@example.test")))).cookie;
  const foreign = await sprints.POST(req("/api/sprints", { method: "POST", body: { action: "checkin", id: s.id, day: 1, done: false }, cookie: other }));
  assert.equal(foreign.status, 404);

  // Refunding one purchase removes the unused credit; the started sprint stays.
  await sendEvent("charge.refunded", { payment_intent: "pi_spr_2", refunded: true });
  data = await (await sprints.GET(req("/api/sprints", { cookie: c }))).json();
  assert.equal(data.credits[7], 0);
  assert.equal(data.sprints.length, 1);
  const meData = await (await me.GET(req("/api/me", { cookie: c }))).json();
  assert.deepEqual(meData.sprints, { credits: { 7: 0, 30: 0, 90: 0 }, started: 1 });

  assert.equal((await sprints.GET(req("/api/sprints"))).status, 401);
});

test("admin sales list and invoice come from Stripe, refunds included", async () => {
  process.env.STRIPE_SECRET_KEY = "sk_test_x";
  process.env.ADMIN_EMAILS += ",boss@elevpay.test";
  const sales = await import("../api/admin/sales.js");
  const invoice = await import("../api/admin/invoice.js");
  const charge = {
    id: "ch_3abc12345XYZ", created: 1760500000, status: "succeeded", livemode: true, currency: "usd", amount: 2900, amount_refunded: 2900,
    payment_intent: "pi_123", description: null, billing_details: { name: "Jane <Doe>", email: "jane@example.com", address: { country: "US", postal_code: "10001" } },
    payment_method_details: { card: { brand: "visa", last4: "4242" } },
    refunds: { data: [{ id: "re_1", status: "succeeded", amount: 2900, created: 1760600000 }] },
  };
  const session = {
    id: "cs_live_1", amount_subtotal: 2900, total_details: { amount_discount: 0, amount_tax: 0 }, customer_details: {},
    line_items: { data: [{ description: "Side Income Launchpad", quantity: 1, amount_subtotal: 2900, price: { unit_amount: 2900, recurring: null } }] },
  };
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    const u = String(url);
    if (!u.startsWith("https://api.stripe.com/")) return realFetch(url, opts);
    if (u.includes("/checkout/sessions?")) return new Response(JSON.stringify({ data: [session] }));
    if (u.includes("/charges?")) return new Response(JSON.stringify({ data: [charge, { ...charge, id: "ch_failed", status: "failed" }] }));
    return new Response(JSON.stringify(charge));
  };
  try {
    const { password: bossPw } = await grantPurchase("boss@elevpay.test", { id: "manual:boss", product: "infoelev_all_access", source: "manual" }, { sendMail: false });
    const boss = (await logIn("boss@elevpay.test", bossPw)).cookie;
    assert.equal((await sales.GET(req("/api/admin/sales"))).status, 404);
    const list = await (await sales.GET(req("/api/admin/sales", { cookie: boss }))).json();
    assert.deepEqual(list.sales.map((s) => [s.id, s.name, s.items, s.amount, s.refunded]), [["ch_3abc12345XYZ", "Jane <Doe>", "Side Income Launchpad", 2900, 2900]]);

    assert.equal((await invoice.GET(req("/api/admin/invoice?id=ch_3abc12345XYZ"))).status, 404);
    assert.equal((await invoice.GET(req("/api/admin/invoice?id=bad", { cookie: boss }))).status, 400);
    const page = await (await invoice.GET(req("/api/admin/invoice?id=ch_3abc12345XYZ", { cookie: boss }))).text();
    for (const s of ["INV-20251015-12345XYZ", "Jane &lt;Doe&gt;", "jane@example.com", "Side Income Launchpad", "$29.00", "98-1979147", "pi_123", "REFUNDED", "re_1", "Visa ending in 4242", "Net amount", "$0.00"]) assert.ok(page.includes(s), s);
    assert.ok(!page.includes("Jane <Doe>") && !page.includes(">PAID<"));
    if (process.env.INVOICE_OUT) (await import("node:fs")).writeFileSync(process.env.INVOICE_OUT, page);
  } finally {
    globalThis.fetch = realFetch;
  }
});
