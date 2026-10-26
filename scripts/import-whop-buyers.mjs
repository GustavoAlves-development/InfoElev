// Gives member access to buyers who paid on Whop (no automatic Whop -> site integration yet).
// Input: one line per purchase, "email — Product name — DD/MM/YYYY" (file is git-ignored under admin/).
//
// Usage:  node scripts/import-whop-buyers.mjs admin/whop-buyers.txt            -> dry run
//         node scripts/import-whop-buyers.mjs admin/whop-buyers.txt --apply    -> writes to production
//
// Safe to run again: each line gets a stable purchase id, so nothing is added twice.
// New accounts get a generated password saved to admin/credentials.txt (never printed). No email is sent.

import { appendFileSync, existsSync, readFileSync } from "node:fs";

const [file, flag] = process.argv.slice(2);
const apply = flag === "--apply";
if (!file) {
  console.error("Usage: node scripts/import-whop-buyers.mjs <file> [--apply]");
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
const { getUser, normalizeEmail, saveUser } = await import("../api/_lib/users.js");
const { generatePassword, hashPassword } = await import("../api/_lib/password.js");

const byName = Object.fromEntries(Object.entries(PRODUCTS).map(([id, p]) => [p.name.toLowerCase(), id]));

// Parse, and number repeated purchases (same email + product + date) so each keeps its own id.
const seen = {};
const rows = readFileSync(new URL("../" + file, import.meta.url), "utf8").split(/\r?\n/).filter((l) => l.trim()).map((line, i) => {
  const [email, name, date] = line.split(/\s+[—–-]\s+/).map((s) => s.trim());
  const product = byName[(name || "").toLowerCase()];
  const [d, m, y] = (date || "").split("/");
  if (!email?.includes("@") || !product || !y) throw new Error(`Line ${i + 1} not understood: ${line}`);
  const key = `${normalizeEmail(email)}:${product}:${y}-${m}-${d}`;
  seen[key] = (seen[key] || 0) + 1;
  return { email: normalizeEmail(email), product, createdAt: `${y}-${m}-${d}T12:00:00.000Z`, id: `whop:${key}:${seen[key]}` };
});

let created = 0, added = 0, skipped = 0;
const users = {};
for (const r of rows) {
  let user = users[r.email] || (await getUser(r.email));
  if (!user) {
    const password = generatePassword();
    user = { email: r.email, passwordHash: await hashPassword(password), sessionVersion: 1, createdAt: new Date().toISOString(), purchases: [], loginCount: 0, lastLoginAt: null, _password: password };
    created++;
  }
  users[r.email] = user;
  if (user.purchases.some((p) => p.id === r.id)) { skipped++; continue; }
  user.purchases.push({ id: r.id, product: r.product, source: "whop", note: "Whop purchase", status: "active", createdAt: r.createdAt });
  added++;
}

console.log(`${rows.length} lines · ${Object.keys(users).length} buyers · ${created} new accounts · ${added} purchases to add · ${skipped} already there`);
if (!apply) {
  console.log("Dry run. Re-run with --apply to write.");
  process.exit(0);
}

const out = new URL("../admin/credentials.txt", import.meta.url);
for (const user of Object.values(users)) {
  const password = user._password;
  delete user._password;
  await saveUser(user);
  if (password) appendFileSync(out, `${new Date().toISOString()}  ${user.email}  ${password}  whop-import\n`);
}
console.log("Saved. New passwords are in admin/credentials.txt");
