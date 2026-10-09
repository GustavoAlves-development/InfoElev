// Password hashing (scrypt) and generation. Node functions only.

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64);
  return "scrypt$" + salt.toString("base64") + "$" + hash.toString("base64");
}

export async function verifyPassword(password, stored) {
  const [scheme, salt, hash] = String(stored || "").split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const actual = await scryptAsync(String(password), Buffer.from(salt, "base64"), expected.length);
  return timingSafeEqual(expected, actual);
}

// Readable random password, e.g. "k7qm-4tzp-9wre" (~60 bits). No 0/o/1/l to avoid confusion.
export function generatePassword() {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(12);
  const chars = [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
  return chars.match(/.{4}/g).join("-");
}

export const randomToken = () => randomBytes(24).toString("base64url");
