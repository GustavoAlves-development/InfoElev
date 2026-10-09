import { currentUser, json } from "./_lib/http.js";
import { APPS, PRODUCTS, accessOf } from "./_lib/catalog.js";
import { isAdmin } from "./_lib/users.js";

export async function GET(request) {
  const user = await currentUser(request);
  if (!user) return json({ error: "Not logged in." }, 401);
  const access = accessOf(user);
  return json({
    email: user.email,
    admin: isAdmin(user.email),
    apps: Object.entries(APPS).map(([id, name]) => ({ id, name, level: access[id] || null })),
    purchases: user.purchases.map((p) => ({
      product: PRODUCTS[p.product]?.name || p.product,
      monthly: !!PRODUCTS[p.product]?.monthly,
      status: p.status,
      date: p.createdAt,
    })),
  });
}
