// Used by welcome.html to confirm the payment and show where the login was sent.

import { json } from "./_lib/http.js";
import { PRODUCTS } from "./_lib/catalog.js";
import { stripe } from "./_lib/stripe.js";

const mask = (email) => email.replace(/^(.{2})[^@]*(@.*)$/, (_, a, b) => a + "•••" + b);

export async function GET(request) {
  const id = new URL(request.url).searchParams.get("session_id");
  if (!id || !id.startsWith("cs_")) return json({ error: "Missing session." }, 400);
  try {
    const session = await stripe("GET", "/checkout/sessions/" + encodeURIComponent(id));
    const email = session.customer_details?.email || "";
    return json({
      paid: session.payment_status === "paid" || session.payment_status === "no_payment_required",
      email: email ? mask(email) : null,
      product: PRODUCTS[session.metadata?.product]?.name || null,
    });
  } catch {
    return json({ error: "Session not found." }, 404);
  }
}
