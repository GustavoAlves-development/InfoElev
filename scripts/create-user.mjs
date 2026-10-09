// Creates (or extends) a member account without a purchase, e.g. your admin login or a
// reviewer account for Stripe. Writes to the production database configured in .env.local.
//
// Setup once:  npx vercel link   then   npx vercel env pull .env.local
// Usage:       node scripts/create-user.mjs --email reviewer@infoelev.com --product infoelev_all_access --note "Stripe review account"
//              [--password-file admin/stripe-reviewer-password.txt]   use a pre-generated password instead of a new one
//
// The generated password is saved to admin/credentials.txt (git-ignored), never printed.

import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";

const args = Object.fromEntries(
  process.argv.slice(2).join(" ").split("--").filter(Boolean).map((a) => {
    const [k, ...v] = a.trim().split(" ");
    return [k, v.join(" ").replace(/^"|"$/g, "")];
  }),
);
if (!args.email || !args.product) {
  console.error('Usage: node scripts/create-user.mjs --email <email> --product <stripe product id> [--note "..."]');
  process.exit(1);
}

const envFile = new URL("../.env.local", import.meta.url);
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}

const { PRODUCTS } = await import("../api/_lib/catalog.js");
if (!PRODUCTS[args.product]) {
  console.error("Unknown product. Options: " + Object.keys(PRODUCTS).join(", "));
  process.exit(1);
}
const { grantPurchase } = await import("../api/_lib/fulfillment.js");
const { getUser, saveUser } = await import("../api/_lib/users.js");
const { generatePassword, hashPassword } = await import("../api/_lib/password.js");

const existing = await getUser(args.email);
await grantPurchase(args.email, { id: "manual:" + args.product + ":" + Date.now(), product: args.product, source: "manual", note: args.note || "Manual access" }, { sendMail: false });

const out = new URL("../admin/", import.meta.url);
mkdirSync(out, { recursive: true });
if (existing) {
  appendFileSync(new URL("credentials.txt", out), `${new Date().toISOString()}  ${args.email}  +${args.product}  (existing account, password unchanged)\n`);
  console.log(`Added ${PRODUCTS[args.product].name} to existing account ${args.email}. Password unchanged.`);
} else {
  // --password-file lets a password that was already shared (e.g. in the Stripe dossier) be used.
  const password = args["password-file"] ? readFileSync(new URL("../" + args["password-file"], import.meta.url), "utf8").trim() : generatePassword();
  const user = await getUser(args.email);
  user.passwordHash = await hashPassword(password);
  await saveUser(user);
  appendFileSync(new URL("credentials.txt", out), `${new Date().toISOString()}  ${args.email}  ${password}  ${args.product}  ${args.note || ""}\n`);
  console.log(`Created ${args.email} with ${PRODUCTS[args.product].name}. Password saved to admin/credentials.txt`);
}
