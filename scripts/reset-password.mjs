// Sets a new generated password on an existing account (e.g. when the admin password is lost
// and reset emails are not set up). Writes to the production database configured in .env.local.
//
// Usage:  node scripts/reset-password.mjs --email you@example.com
//
// The new password is saved to admin/credentials.txt (git-ignored), never printed.
// Existing sessions of that account are signed out.

import { appendFileSync, existsSync, readFileSync } from "node:fs";

const i = process.argv.indexOf("--email");
const email = i > 0 ? process.argv[i + 1] : null;
if (!email) {
  console.error("Usage: node scripts/reset-password.mjs --email <email>");
  process.exit(1);
}

const envFile = new URL("../.env.local", import.meta.url);
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}

const { getUser, saveUser } = await import("../api/_lib/users.js");
const { generatePassword, hashPassword } = await import("../api/_lib/password.js");

const user = await getUser(email);
if (!user) {
  console.error("No account for " + email);
  process.exit(1);
}
const password = generatePassword();
user.passwordHash = await hashPassword(password);
user.sessionVersion = (user.sessionVersion || 1) + 1;
await saveUser(user);
appendFileSync(new URL("../admin/credentials.txt", import.meta.url), `${new Date().toISOString()}  ${user.email}  ${password}  NEW PASSWORD (reset)\n`);
console.log(`New password set for ${user.email}. Saved to admin/credentials.txt (last line).`);
