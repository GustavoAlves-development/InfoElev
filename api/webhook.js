// Stripe webhook. Subscribe the endpoint to: checkout.session.completed,
// checkout.session.async_payment_succeeded, charge.refunded,
// customer.subscription.updated, customer.subscription.deleted.

import { json } from "./_lib/http.js";
import { verifyWebhook } from "./_lib/stripe.js";
import { handleStripeEvent } from "./_lib/fulfillment.js";
import { redis } from "./_lib/redis.js";

export async function POST(request) {
  const raw = await request.text();
  let event;
  try {
    event = verifyWebhook(raw, request.headers.get("stripe-signature"));
  } catch (err) {
    return json({ error: "Invalid signature: " + err.message }, 400);
  }

  // Stripe retries deliveries; process each event once.
  const first = await redis("SET", "evt:" + event.id, "1", "NX", "EX", 60 * 60 * 24 * 7);
  if (first === null) return json({ received: true, result: "already processed" });

  try {
    const result = await handleStripeEvent(event);
    console.log(`[webhook] ${event.type} ${event.id}: ${result}`);
    return json({ received: true, result });
  } catch (err) {
    await redis("DEL", "evt:" + event.id); // let Stripe retry
    console.error(`[webhook] ${event.type} ${event.id} failed:`, err);
    return json({ error: "Processing failed" }, 500);
  }
}
