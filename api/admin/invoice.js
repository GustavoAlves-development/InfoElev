// Admin-only: printable itemized invoice for one Stripe charge (?id=ch_...), refunds included.
// Every figure comes straight from Stripe; nothing is typed in by hand.

import { currentUser } from "../_lib/http.js";
import { isAdmin } from "../_lib/users.js";
import { stripe } from "../_lib/stripe.js";
import { checkoutFor } from "./sales.js";

const SELLER = {
  name: "Infoelev Digital Business LLC",
  lines: ["8200 NW 41st Street, 2nd Floor", "Doral, FL 33166, United States"],
  ein: "98-1979147",
  email: "infoelevdigitalbusinessllc@gmail.com",
  phone: "+1 (307) 394-5064",
};

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const html = (body, status = 200) => new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
const day = (sec) => new Date(sec * 1000).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

export async function GET(request) {
  const me = await currentUser(request);
  if (!me || !isAdmin(me.email)) return html("Not found.", 404);

  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^(ch|py)_[A-Za-z0-9]+$/.test(id)) return html("Invalid sale id.", 400);
  let c;
  try {
    c = await stripe("GET", "/charges/" + id, { "expand[]": "refunds" });
  } catch (err) {
    return html("Could not load this sale from Stripe: " + esc(err.message), 502);
  }
  if (c.status !== "succeeded") return html("This charge did not succeed.", 400);
  const s = await checkoutFor(c.payment_intent);

  const cur = (c.currency || "usd").toUpperCase();
  const money = (cents) => (cents / 100).toLocaleString("en-US", { style: "currency", currency: cur });
  const number = "INV-" + new Date(c.created * 1000).toISOString().slice(0, 10).replace(/-/g, "") + "-" + id.slice(-8).toUpperCase();
  const cd = s?.customer_details || {};
  const b = c.billing_details || {};
  const a = (b.address?.country ? b.address : cd.address) || {};
  const billTo = [b.name || cd.name, b.email || c.receipt_email || cd.email, a.line1, a.line2, [a.city, a.state, a.postal_code].filter(Boolean).join(", "), a.country].filter(Boolean);
  const items = s?.line_items?.data?.length
    ? s.line_items.data.map((li) => ({ desc: li.description, note: li.price?.recurring ? "Subscription · billed every " + li.price.recurring.interval : "Digital course · instant online access", qty: li.quantity, unit: li.price?.unit_amount ?? li.amount_subtotal / (li.quantity || 1), amount: li.amount_subtotal }))
    : [{ desc: c.description || "Infoelev digital product", note: "Digital product · online access", qty: 1, unit: c.amount, amount: c.amount }];
  const subtotal = s?.amount_subtotal ?? c.amount;
  const discount = s?.total_details?.amount_discount || 0;
  const tax = s?.total_details?.amount_tax || 0;
  const refunds = (c.refunds?.data || []).filter((r) => r.status === "succeeded" || r.status === "pending");
  const refunded = c.amount_refunded || 0;
  const status = refunded >= c.amount ? ["REFUNDED", "#fde2e1", "#a8261d"] : refunded ? ["PARTIALLY REFUNDED", "#fdf0d5", "#8a5a00"] : ["PAID", "#d8f3e7", "#127a54"];
  const card = c.payment_method_details?.card;
  const method = card ? (card.brand || "card").replace(/^./, (x) => x.toUpperCase()) + " ending in " + card.last4 : "Card via Stripe";
  const refs = [["Stripe charge", c.id], c.payment_intent && ["Payment", c.payment_intent], s && ["Checkout session", s.id], ...refunds.map((r) => ["Refund", r.id])].filter(Boolean);

  return html(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Invoice ${esc(number)} — ${esc(SELLER.name)}</title>
<style>
  *{box-sizing:border-box} body{margin:0;background:#eef2f0;font:14px/1.5 Inter,Arial,sans-serif;color:#111816}
  .page{max-width:800px;margin:24px auto;background:#fff;padding:48px;border-radius:8px}
  .top{display:flex;justify-content:space-between;gap:24px;border-bottom:3px solid #22B07D;padding-bottom:20px}
  h1{margin:0;font-size:28px;letter-spacing:.04em} .muted{color:#5b6763} .badge{display:inline-block;margin-top:6px;padding:3px 10px;border-radius:99px;font-weight:700;font-size:12px}
  .cols{display:flex;justify-content:space-between;gap:24px;margin:28px 0} .cols h3{margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#5b6763}
  table{width:100%;border-collapse:collapse} th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#5b6763;border-bottom:1px solid #d5dcd9;padding:8px 6px}
  td{padding:10px 6px;border-bottom:1px solid #eef2f0} .r{text-align:right}
  .totals{margin-left:auto;width:320px;margin-top:16px} .totals td{border:0;padding:4px 6px} .totals .grand td{border-top:2px solid #111816;font-weight:700;font-size:16px;padding-top:10px}
  .refs{margin-top:32px;font-size:12px} .refs td{border:0;padding:2px 12px 2px 0}
  footer{margin-top:36px;font-size:12px;color:#5b6763;border-top:1px solid #d5dcd9;padding-top:14px}
  .bar{max-width:800px;margin:24px auto 0;text-align:right} button{background:#22B07D;color:#fff;border:0;border-radius:6px;padding:10px 18px;font-weight:700;cursor:pointer}
  @media print{body{background:#fff}.page{margin:0;padding:0}.bar{display:none}}
</style></head><body>
<div class="bar"><button onclick="print()">Download PDF</button></div>
<div class="page">
  <div class="top">
    <div><strong style="font-size:18px">${esc(SELLER.name)}</strong><br>${SELLER.lines.map(esc).join("<br>")}<br>EIN ${esc(SELLER.ein)}<br>${esc(SELLER.email)} · ${esc(SELLER.phone)}</div>
    <div class="r"><h1>INVOICE</h1><div class="muted">${esc(number)}</div><span class="badge" style="background:${status[1]};color:${status[2]}">${status[0]}</span></div>
  </div>
  <div class="cols">
    <div><h3>Bill to</h3>${billTo.map(esc).join("<br>") || "—"}</div>
    <div class="r"><h3>Invoice date</h3>${esc(day(c.created))}<h3 style="margin-top:12px">Payment date</h3>${esc(day(c.created))}<h3 style="margin-top:12px">Payment method</h3>${esc(method)}</div>
  </div>
  <table>
    <thead><tr><th>Description</th><th class="r">Qty</th><th class="r">Unit price</th><th class="r">Amount</th></tr></thead>
    <tbody>${items.map((it) => `<tr><td>${esc(it.desc)}<div class="muted">${esc(it.note)}</div></td><td class="r">${it.qty}</td><td class="r">${money(it.unit)}</td><td class="r">${money(it.amount)}</td></tr>`).join("")}</tbody>
  </table>
  <table class="totals">
    <tr><td>Subtotal</td><td class="r">${money(subtotal)}</td></tr>
    ${discount ? `<tr><td>Discount</td><td class="r">−${money(discount)}</td></tr>` : ""}
    ${tax ? `<tr><td>Tax</td><td class="r">${money(tax)}</td></tr>` : ""}
    <tr class="grand"><td>Total paid (${esc(cur)})</td><td class="r">${money(c.amount)}</td></tr>
    ${refunds.length ? refunds.map((r) => `<tr><td>Refunded ${esc(day(r.created))}</td><td class="r">−${money(r.amount)}</td></tr>`).join("") : refunded ? `<tr><td>Refunded</td><td class="r">−${money(refunded)}</td></tr>` : ""}
    ${refunded ? `<tr class="grand"><td>Net amount (${esc(cur)})</td><td class="r">${money(c.amount - refunded)}</td></tr>` : ""}
  </table>
  <table class="refs">${refs.map(([k, v]) => `<tr><td class="muted">${esc(k)}</td><td>${esc(v)}</td></tr>`).join("")}</table>
  <footer>${refunded ? "This payment was refunded to the customer's original payment method as shown above. " : "Thank you for your purchase. "}Digital products are delivered online through the Infoelev member area. Questions: ${esc(SELLER.email)}.</footer>
</div>
</body></html>`);
}
