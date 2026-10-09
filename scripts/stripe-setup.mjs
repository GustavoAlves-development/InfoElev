// Creates the Infoelev products and prices (one-time and monthly) in Stripe,
// with name, description, cover image and metadata.
//
// Usage:
//   node scripts/stripe-setup.mjs            -> dry run, only prints the plan
//   node scripts/stripe-setup.mjs --apply    -> creates/updates in Stripe (needs STRIPE_SECRET_KEY)
//
// Safe to run more than once: products use fixed IDs and prices use lookup keys.
// Each product has exactly one price, so the checkout always shows the exact tier bought.
// If you change an amount below, a new price is created and the lookup key moves to it
// (Stripe prices are immutable); the old price is archived.
// Covers come from assets/img/products/<cover>.png (regenerate with scripts/covers/render.mjs)
// and are uploaded to Stripe only when the product has no image yet.
// Result is written to scripts/stripe-ids.json.

import { readFileSync, writeFileSync } from "node:fs";

const CURRENCY = "usd";

// Amounts in cents. `monthly: true` makes a recurring monthly price.
const CATALOG = [
  {
    id: "infoelev_side_income_launchpad", name: "Side Income Launchpad", amount: 2900, cover: "launchpad",
    description: "A 90-day, step-by-step system to get out of debt, rebuild your budget, and put your finances on solid ground. Includes the full 90-day roadmap, debt payoff worksheets, bonus budget templates and email support. One-time payment, lifetime access.",
  },
  {
    id: "infoelev_digital_product_academy", name: "Digital Product Academy", amount: 5400, cover: "academy",
    description: "An honest, jargon-free introduction to how investing actually works: risk, diversification, and building a portfolio from zero. Includes the full 5-module guide, a plain-language glossary, the starter portfolio worksheet and email support. One-time payment, lifetime access.",
  },
  {
    id: "infoelev_freelance_kit_starter", name: "The Freelance Starter Kit — Starter", amount: 1200, cover: "freelance",
    description: "A focused plan for building a real emergency fund. Includes the full 5-module blueprint and the target number calculator. One-time payment, lifetime access.",
  },
  {
    id: "infoelev_freelance_kit_complete", name: "The Freelance Starter Kit — Complete", amount: 2200, cover: "freelance",
    description: "A focused plan for building a real emergency fund and the cushion that makes every other decision easier. Includes the full 5-module blueprint, the target number calculator, the autopilot setup guide and email support. One-time payment, lifetime access.",
  },
  {
    id: "infoelev_online_gig_playbook", name: "Online Gig Playbook", amount: 1700, cover: "gigs",
    description: "A practical map of extra-income paths (freelancing, digital services and marketplaces) with real steps for your first 30 days. Includes the 30-day launch plan, the skills-to-income map, outreach scripts and email support. One-time payment, lifetime access.",
  },
  {
    id: "infoelev_side_hustle_ledger_complete", name: "The Side Hustle Ledger — Complete", amount: 1500, cover: "hustle",
    description: "A simple, sustainable budgeting and tracking system for people who bounced off spreadsheets and apps before. Includes the ledger template, the category system guide, the weekly check-in guide and email support. One-time payment, lifetime access.",
  },
  {
    id: "infoelev_side_hustle_ledger_elevated", name: "The Side Hustle Ledger — Elevated", amount: 2800, cover: "hustle",
    description: "Everything in The Side Hustle Ledger Complete (ledger template, category system guide and weekly check-in guide), plus priority email support and all future updates. One-time payment, lifetime access.",
  },
  {
    id: "infoelev_full_library", name: "The Full Infoelev Library", amount: 9000, cover: "library",
    description: "All five Infoelev systems at their complete level: Side Income Launchpad, Online Gig Playbook, The Side Hustle Ledger, Digital Product Academy and The Freelance Starter Kit, plus email support. One-time payment, lifetime access.",
  },
  {
    id: "infoelev_tools", name: "Infoelev Tools", amount: 900, monthly: true, cover: "tools",
    description: "Monthly access to all five Infoelev interactive tools: the budget ledger with weekly check-ins, the debt payoff planner, the emergency fund and income trackers, and the portfolio mix worksheet. Renews monthly, cancel anytime.",
  },
  {
    id: "infoelev_all_access", name: "Infoelev All Access", amount: 1900, monthly: true, cover: "allaccess",
    description: "Monthly access to everything Infoelev: all five full courses with their Action Roadmaps, all five interactive tools, every new product as it is released, and email support. Renews monthly, cancel anytime.",
  },
];

// Products from the first version of this script, which kept two tiers under one product.
// They are replaced by the per-tier products above and get archived (with their prices).
const LEGACY = ["infoelev_freelance_starter_kit", "infoelev_side_hustle_ledger"];

const apply = process.argv.includes("--apply");
const key = process.env.STRIPE_SECRET_KEY;
const money = (cents, monthly) => "$" + (cents / 100).toFixed(2) + (monthly ? " / month" : " one-time");

async function call(url, init) {
  const res = await fetch(url, { ...init, headers: { Authorization: "Bearer " + key, ...init.headers } });
  const json = await res.json();
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(url + ": " + (json.error?.message || res.status));
  return json;
}

function stripe(method, path, params) {
  const body = params ? new URLSearchParams(params).toString() : undefined;
  const url = "https://api.stripe.com/v1" + path + (method === "GET" && body ? "?" + body : "");
  return call(url, {
    method,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: method === "GET" ? undefined : body,
  });
}

// Uploads a cover to Stripe and returns a public URL for it.
const coverUrls = {};
async function coverUrl(cover) {
  if (coverUrls[cover]) return coverUrls[cover];
  const form = new FormData();
  form.append("purpose", "business_logo");
  form.append("file", new Blob([readFileSync(new URL("../assets/img/products/" + cover + ".png", import.meta.url))], { type: "image/png" }), cover + ".png");
  const file = await call("https://files.stripe.com/v1/files", { method: "POST", body: form });
  const link = await stripe("POST", "/file_links", { file: file.id });
  return (coverUrls[cover] = link.url);
}

if (!apply) {
  console.log("DRY RUN — nothing is sent to Stripe. Use --apply to create.\n");
  for (const p of CATALOG) {
    console.log(p.name.padEnd(40) + money(p.amount, p.monthly).padStart(18) + "   cover: " + p.cover + ".png");
    console.log("  " + p.description + "\n");
  }
  process.exit(0);
}

if (!key) {
  console.error("Set STRIPE_SECRET_KEY first.");
  process.exit(1);
}
console.log(key.startsWith("sk_live") || key.startsWith("rk_live") ? "Mode: LIVE\n" : "Mode: TEST\n");

const result = {};
for (const p of CATALOG) {
  const fields = {
    name: p.name,
    description: p.description,
    "metadata[source]": "elevllc",
    "metadata[billing]": p.monthly ? "monthly" : "one_time",
  };
  let product = await stripe("GET", "/products/" + p.id);
  if (!product) {
    product = await stripe("POST", "/products", { id: p.id, ...fields, "images[0]": await coverUrl(p.cover) });
    console.log("+ product " + p.name);
  } else {
    const extra = product.images?.length ? {} : { "images[0]": await coverUrl(p.cover) };
    product = await stripe("POST", "/products/" + p.id, { ...fields, active: "true", ...extra });
    console.log("~ product " + p.name + " (updated)");
  }

  // The lookup key may still point at a price of a legacy product (old keys were "<product>_<tier>"),
  // so a price only counts if it belongs to this product.
  const matches = (pr) =>
    pr && pr.product === p.id && pr.unit_amount === p.amount && pr.currency === CURRENCY &&
    (p.monthly ? pr.recurring?.interval === "month" : !pr.recurring);
  const found = await stripe("GET", "/prices", { "lookup_keys[]": p.id, active: "true" });
  const existing = found.data[0];
  // A matching price from an older run may exist under a different lookup key: adopt it.
  const active = (await stripe("GET", "/prices", { product: p.id, active: "true", limit: "100" })).data;
  const adoptable = matches(existing) ? null : active.find(matches);
  let priceId;
  if (matches(existing)) {
    priceId = existing.id;
    console.log("  = " + money(p.amount, p.monthly));
  } else if (adoptable) {
    await stripe("POST", "/prices/" + adoptable.id, { lookup_key: p.id, transfer_lookup_key: "true", nickname: p.name });
    if (existing?.product === p.id) await stripe("POST", "/prices/" + existing.id, { active: "false" });
    priceId = adoptable.id;
    console.log("  = " + money(p.amount, p.monthly) + " (kept existing price)");
  } else {
    const price = await stripe("POST", "/prices", {
      product: p.id,
      currency: CURRENCY,
      unit_amount: String(p.amount),
      lookup_key: p.id,
      transfer_lookup_key: "true",
      nickname: p.name,
      ...(p.monthly ? { "recurring[interval]": "month" } : {}),
    });
    if (existing?.product === p.id) await stripe("POST", "/prices/" + existing.id, { active: "false" });
    priceId = price.id;
    console.log("  + " + money(p.amount, p.monthly) + (existing?.product === p.id ? " (replaced old price)" : ""));
  }
  if (product.default_price !== priceId) await stripe("POST", "/products/" + p.id, { default_price: priceId });
  // One product, one price: archive anything else still active on it.
  for (const pr of active) {
    if (pr.id !== priceId && pr.active) await stripe("POST", "/prices/" + pr.id, { active: "false" });
  }
  result[p.id] = { product: p.id, price: priceId, amount: p.amount, monthly: !!p.monthly };
}

for (const id of LEGACY) {
  const product = await stripe("GET", "/products/" + id);
  if (!product || !product.active) continue;
  if (product.default_price) await stripe("POST", "/products/" + id, { default_price: "" });
  const prices = await stripe("GET", "/prices", { product: id, active: "true", limit: "100" });
  for (const price of prices.data) await stripe("POST", "/prices/" + price.id, { active: "false" });
  await stripe("POST", "/products/" + id, { active: "false" });
  console.log("- archived old product " + product.name);
}

writeFileSync(new URL("./stripe-ids.json", import.meta.url), JSON.stringify(result, null, 2) + "\n");
console.log("\nSaved scripts/stripe-ids.json");
