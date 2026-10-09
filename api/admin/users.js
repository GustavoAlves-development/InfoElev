// Admin-only: every member with their access, purchases and activity.

import { currentUser, json } from "../_lib/http.js";
import { PRODUCTS, accessOf } from "../_lib/catalog.js";
import { isAdmin, listUsers } from "../_lib/users.js";

export async function GET(request) {
  const me = await currentUser(request);
  if (!me || !isAdmin(me.email)) return json({ error: "Not found." }, 404);

  const users = (await listUsers())
    .map((u) => ({
      email: u.email,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
      loginCount: u.loginCount || 0,
      admin: isAdmin(u.email),
      access: accessOf(u),
      purchases: u.purchases.map((p) => ({
        product: PRODUCTS[p.product]?.name || p.product,
        monthly: !!PRODUCTS[p.product]?.monthly,
        source: p.source,
        note: p.note || null,
        amount: p.amount ?? null,
        currency: p.currency || null,
        status: p.status,
        date: p.createdAt,
      })),
    }))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return json({ users });
}
