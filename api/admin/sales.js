// Admin-only: paid Stripe Checkout sessions, newest first (source for customer invoices).

import { currentUser, json } from "../_lib/http.js";
import { isAdmin } from "../_lib/users.js";
import { stripe } from "../_lib/stripe.js";

export async function GET(request) {
  const me = await currentUser(request);
  if (!me || !isAdmin(me.email)) return json({ error: "Not found." }, 404);

  let list;
  try {
    list = await stripe("GET", "/checkout/sessions", { status: "complete", limit: "100", "expand[]": "data.line_items" });
  } catch (err) {
    return json({ error: String(err.message || err) }, 502);
  }
  const sales = list.data
    .filter((s) => s.payment_status === "paid")
    .map((s) => ({
      id: s.id,
      date: new Date(s.created * 1000).toISOString(),
      name: s.customer_details?.name || null,
      email: s.customer_details?.email || null,
      items: (s.line_items?.data || []).map((li) => li.description).join(", "),
      amount: s.amount_total,
      currency: s.currency,
      livemode: s.livemode,
    }));
  return json({ sales });
}
