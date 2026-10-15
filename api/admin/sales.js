// Admin-only: every successful Stripe charge (refunded ones included), newest first — source for customer invoices.

import { currentUser, json } from "../_lib/http.js";
import { isAdmin } from "../_lib/users.js";
import { stripe } from "../_lib/stripe.js";

export async function GET(request) {
  const me = await currentUser(request);
  if (!me || !isAdmin(me.email)) return json({ error: "Not found." }, 404);

  let list;
  try {
    list = await stripe("GET", "/charges", { limit: "100" });
  } catch (err) {
    return json({ error: String(err.message || err) }, 502);
  }
  const charges = list.data.filter((c) => c.status === "succeeded");
  const sessions = await Promise.all(charges.map((c) => checkoutFor(c.payment_intent)));
  const sales = charges.map((c, i) => ({
      id: c.id,
      date: new Date(c.created * 1000).toISOString(),
      name: c.billing_details?.name || sessions[i]?.customer_details?.name || null,
      email: c.billing_details?.email || c.receipt_email || sessions[i]?.customer_details?.email || null,
      items: (sessions[i]?.line_items?.data || []).map((li) => li.description).join(", ") || c.description || "",
      amount: c.amount,
      currency: c.currency,
      refunded: c.amount_refunded || 0,
      livemode: c.livemode,
    }));
  return json({ sales });
}

// The Checkout session behind a payment (for line items and customer details), or null.
export async function checkoutFor(paymentIntent) {
  if (!paymentIntent) return null;
  try {
    const { data } = await stripe("GET", "/checkout/sessions", { payment_intent: paymentIntent, "expand[]": "data.line_items" });
    return data[0] || null;
  } catch {
    return null;
  }
}
