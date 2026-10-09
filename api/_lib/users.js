// User records. One JSON document per user at user:<email>, plus a set of all emails
// and lookup indexes from Stripe payment intents / subscriptions to the owner's email.

import { redis } from "./redis.js";

export const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

export async function getUser(email) {
  const raw = await redis("GET", "user:" + normalizeEmail(email));
  return raw ? JSON.parse(raw) : null;
}

export async function saveUser(user) {
  user.email = normalizeEmail(user.email);
  await redis("SET", "user:" + user.email, JSON.stringify(user));
  await redis("SADD", "users", user.email);
  return user;
}

export async function listUsers() {
  const emails = await redis("SMEMBERS", "users");
  const users = await Promise.all(emails.map(getUser));
  return users.filter(Boolean);
}

export async function setIndex(kind, id, email) {
  if (id) await redis("SET", "idx:" + kind + ":" + id, normalizeEmail(email));
}

export async function findByIndex(kind, id) {
  if (!id) return null;
  const email = await redis("GET", "idx:" + kind + ":" + id);
  return email ? getUser(email) : null;
}

export function isAdmin(email) {
  const admins = (globalThis.process?.env?.ADMIN_EMAILS || "").split(",").map(normalizeEmail).filter(Boolean);
  return admins.includes(normalizeEmail(email));
}
