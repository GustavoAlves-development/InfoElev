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
    description: "A 30-day, step-by-step method to pick one realistic side income idea, shape it into a clear offer, and put it in front of real buyers. Includes 5 chapters, the 30-day launch calendar, the Idea Scorecard tool, offer and outreach templates, the Action Roadmap and email support. One-time payment, lifetime access.",
  },
  {
    id: "infoelev_digital_product_academy", name: "Digital Product Academy", amount: 5400, cover: "academy",
    description: "A beginner-friendly course on creating a first digital product: validating demand, building version one, pricing, packaging and launching. Includes 5 modules, the validation playbook, the version-one blueprint, the Product Revenue Planner tool and email support. One-time payment, lifetime access.",
  },
  {
    id: "infoelev_freelance_kit_starter", name: "The Freelance Starter Kit — Starter", amount: 1200, cover: "freelance",
    description: "Start freelancing with a plan: define one clear service, set a rate from real numbers, write proposals and find first clients. Includes the full 5-module kit, the Freelance Rate Calculator and the Action Roadmap. One-time payment, lifetime access.",
  },
  {
    id: "infoelev_freelance_kit_complete", name: "The Freelance Starter Kit — Complete", amount: 2200, cover: "freelance",
    description: "Everything in The Freelance Starter Kit Starter (5 modules, Freelance Rate Calculator and Action Roadmap), plus email support and all future updates. One-time payment, lifetime access.",
  },
  {
    id: "infoelev_online_gig_playbook", name: "Online Gig Playbook", amount: 1700, cover: "gigs",
    description: "A practical guide to online gigs: the main gig categories, how to compare platforms, a profile checklist and how to track real net hourly pay. Includes 5 modules, the Gig Earnings Tracker tool and email support. One-time payment, lifetime access.",
  },
  {
    id: "infoelev_flip_playbook", name: "The Flip Playbook", amount: 1900, cover: "flip",
    description: "A practical guide to reselling online: sourcing underpriced items, checking sold prices, listing, shipping and calculating real profit. Includes 5 modules, the sourcing checklist, the listing formula, the Flip Profit Calculator tool and email support. One-time payment, lifetime access.",
  },
  {
    id: "infoelev_tutoring_playbook", name: "The Online Tutoring Playbook", amount: 2700, cover: "tutoring",
    description: "A step-by-step guide to earning extra income by teaching online: choosing a subject and format, pricing sessions, finding first students and running sessions they come back for. Includes 5 modules, the subject finder, a session template, the Tutoring Income Planner tool and email support. One-time payment, lifetime access.",
  },
  {
    id: "infoelev_sprint_7", name: "7-Day Side Hustle Sprint", amount: 600, cover: "sprint7",
    description: "A 7-day Side Hustle Sprint: one goal, a daily focus prompt and a daily check-in in the Infoelev member app, with a progress and earnings summary. Each purchase adds one sprint to your account, to start whenever you choose. One-time payment per sprint.",
  },
  {
    id: "infoelev_sprint_30", name: "30-Day Side Hustle Sprint", amount: 1500, cover: "sprint30",
    description: "A 30-day Side Hustle Sprint: one goal, a weekly rhythm of daily focus prompts and a daily check-in in the Infoelev member app, with a progress and earnings summary. Each purchase adds one sprint to your account, to start whenever you choose. One-time payment per sprint.",
  },
  {
    id: "infoelev_sprint_90", name: "90-Day Side Hustle Sprint", amount: 2800, cover: "sprint90",
    description: "A 90-day Side Hustle Sprint: one goal, 13 weekly cycles of daily focus prompts and a daily check-in in the Infoelev member app, with a progress and earnings summary. Each purchase adds one sprint to your account, to start whenever you choose. One-time payment per sprint.",
  },
  {
    id: "infoelev_full_library", name: "The Full Infoelev Library", amount: 9000, cover: "library",
    description: "All seven Infoelev programs at their complete level: Side Income Launchpad, Online Gig Playbook, The Side Hustle Ledger, Digital Product Academy, The Freelance Starter Kit, The Flip Playbook and The Online Tutoring Playbook, plus email support. One-time payment, lifetime access.",
  },
  {
    id: "infoelev_tools", name: "Infoelev Tools", amount: 900, monthly: true, cover: "tools",
    description: "Monthly access to all seven Infoelev interactive tools: Idea Scorecard, Product Revenue Planner, Freelance Rate Calculator, Gig Earnings Tracker, Side Hustle Ledger, Flip Profit Calculator and Tutoring Income Planner. Courses not included. Renews monthly, cancel anytime.",
  },
  {
    id: "infoelev_all_access", name: "Infoelev All Access", amount: 1900, monthly: true, cover: "allaccess",
    description: "Monthly access to everything Infoelev: all seven full courses with their Action Roadmaps, all seven interactive tools, every new product as it is released, and email support. Renews monthly, cancel anytime.",
  },
];

// Product IDs to archive in Stripe (none yet).
const LEGACY = [];

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
