// Turns paid Stripe events into member access, and refunds/cancellations into revoked access.

import { PRODUCTS } from "./catalog.js";
import { findByIndex, getUser, normalizeEmail, saveUser, setIndex } from "./users.js";
import { generatePassword, hashPassword } from "./password.js";
import { productAddedEmail, sendEmail, welcomeEmail } from "./email.js";

// Grants a product to an email, creating the account (and emailing a generated password) if needed.
// `purchase` = { id, product, source, amount, currency, paymentIntent?, subscription?, customer?, note? }
export async function grantPurchase(email, purchase, { sendMail = true } = {}) {
  email = normalizeEmail(email);
  const product = PRODUCTS[purchase.product];
  if (!product) throw new Error("unknown product " + purchase.product);

  let user = await getUser(email);
  let password = null;
  if (!user) {
    password = generatePassword();
    user = { email, passwordHash: await hashPassword(password), sessionVersion: 1, createdAt: new Date().toISOString(), purchases: [], loginCount: 0, lastLoginAt: null };
  }
  if (user.purchases.some((p) => p.id === purchase.id)) return { user, created: false, duplicate: true };

  user.purchases.push({ ...purchase, status: "active", createdAt: new Date().toISOString() });
  await saveUser(user);
  await setIndex("pi", purchase.paymentIntent, email);
  await setIndex("sub", purchase.subscription, email);

  if (sendMail) {
    await sendEmail(password ? welcomeEmail({ email, password, productName: product.name }) : productAddedEmail({ email, productName: product.name }));
  }
  return { user, created: !!password, password };
}

async function setPurchaseStatus(user, match, status) {
  if (!user) return false;
  let changed = false;
  for (const p of user.purchases) {
    if (match(p) && p.status !== status) {
      p.status = status;
      p.statusChangedAt = new Date().toISOString();
      changed = true;
    }
  }
  if (changed) await saveUser(user);
  return changed;
}

export async function handleStripeEvent(event) {
  const obj = event.data.object;
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      if (obj.payment_status !== "paid" && obj.payment_status !== "no_payment_required") return "skipped: not paid yet";
      const email = obj.customer_details?.email || obj.customer_email;
      const product = obj.metadata?.product;
      if (!email || !PRODUCTS[product]) return "skipped: missing email or product";
      const result = await grantPurchase(email, {
        id: obj.id,
        product,
        source: "stripe",
        amount: obj.amount_total,
        currency: obj.currency,
        paymentIntent: obj.payment_intent || null,
        subscription: obj.subscription || null,
        customer: obj.customer || null,
      });
      return result.duplicate ? "duplicate" : result.created ? "account created" : "product added";
    }
    case "charge.refunded": {
      if (!obj.refunded) return "skipped: partial refund";
      const user = await findByIndex("pi", obj.payment_intent);
      const changed = await setPurchaseStatus(user, (p) => p.paymentIntent === obj.payment_intent, "refunded");
      return changed ? "access revoked (refund)" : "no matching purchase";
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const user = await findByIndex("sub", obj.id);
      const live = ["active", "trialing", "past_due"].includes(obj.status) && event.type !== "customer.subscription.deleted";
      const changed = await setPurchaseStatus(user, (p) => p.subscription === obj.id && p.status !== "refunded", live ? "active" : "canceled");
      return changed ? "subscription " + (live ? "active" : "canceled") : "no change";
    }
    default:
      return "ignored";
  }
}
