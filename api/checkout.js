// GET /api/checkout?product=<stripe product id> → redirects to a Stripe Checkout page.
// The price is found by lookup key (= product id, set by scripts/stripe-setup.mjs).

import { PRODUCTS } from "./_lib/catalog.js";
import { stripe } from "./_lib/stripe.js";
import { siteUrl } from "./_lib/email.js";

export async function GET(request) {
  const url = new URL(request.url);
  const product = url.searchParams.get("product");
  if (!PRODUCTS[product]) return new Response("Unknown product", { status: 404 });

  const prices = await stripe("GET", "/prices", { "lookup_keys[]": product, active: "true" });
  const price = prices.data[0];
  if (!price) return new Response("This product is not available right now.", { status: 503 });

  const monthly = !!price.recurring;
  const back = request.headers.get("referer")?.startsWith(siteUrl()) ? request.headers.get("referer") : siteUrl() + "/";
  const session = await stripe("POST", "/checkout/sessions", {
    mode: monthly ? "subscription" : "payment",
    "line_items[0][price]": price.id,
    "line_items[0][quantity]": "1",
    success_url: siteUrl() + "/welcome.html?session_id={CHECKOUT_SESSION_ID}",
    cancel_url: back,
    "metadata[product]": product,
    ...(monthly ? { "subscription_data[metadata][product]": product } : { customer_creation: "always", "payment_intent_data[metadata][product]": product }),
    "custom_text[submit][message]":
      "Instant digital access: your login is emailed right after payment. By purchasing you agree to our Terms of Use and Refund Policy at infoelev.com" +
      (monthly ? ". Renews monthly until you cancel." : "."),
  });
  return Response.redirect(session.url, 303);
}
