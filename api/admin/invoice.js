// Admin-only: printable itemized invoice for one paid Stripe Checkout session (?id=cs_...).
// Every figure comes straight from Stripe; nothing is typed in by hand.

import { currentUser } from "../_lib/http.js";
import { isAdmin } from "../_lib/users.js";
import { stripe } from "../_lib/stripe.js";

const SELLER = {
  name: "Infoelev Digital Business LLC",
  lines: ["8200 NW 41st Street, 2nd Floor", "Doral, FL 33166, United States"],
  ein: "98-1979147",
  email: "infoelevdigitalbusinessllc@gmail.com",
  phone: "+1 (307) 394-5064",
};

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const html = (body, status = 200) => new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });

export async function GET(request) {
  const me = await currentUser(request);
  if (!me || !isAdmin(me.email)) return html("Not found.", 404);

  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^cs_(live|test)_[A-Za-z0-9]+$/.test(id)) return html("Invalid sale id.", 400);
  const s = await stripe("GET", "/checkout/sessions/" + id, { "expand[]": "line_items" });
  if (s.payment_status !== "paid") return html("This sale is not paid.", 400);

  const cur = (s.currency || "usd").toUpperCase();
  const money = (cents) => (cents / 100).toLocaleString("en-US", { style: "currency", currency: cur });
  const created = new Date(s.created * 1000);
  const day = created.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
  const number = "INV-" + created.toISOString().slice(0, 10).replace(/-/g, "") + "-" + id.slice(-8).toUpperCase();
  const c = s.customer_details || {};
  const a = c.address || {};
  const billTo = [c.name, c.email, a.line1, a.line2, [a.city, a.state, a.postal_code].filter(Boolean).join(", "), a.country].filter(Boolean);
  const items = s.line_items?.data || [];
  const discount = s.total_details?.amount_discount || 0;
  const tax = s.total_details?.amount_tax || 0;
  const refs = [
    ["Checkout session", s.id],
    s.payment_intent && ["Payment", s.payment_intent],
    s.subscription && ["Subscription", s.subscription],
    s.invoice && ["Stripe invoice", s.invoice],
  ].filter(Boolean);

  return html(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Invoice ${esc(number)} — ${esc(SELLER.name)}</title>
<style>
  *{box-sizing:border-box} body{margin:0;background:#eef2f0;font:14px/1.5 Inter,Arial,sans-serif;color:#111816}
  .page{max-width:800px;margin:24px auto;background:#fff;padding:48px;border-radius:8px}
  .top{display:flex;justify-content:space-between;gap:24px;border-bottom:3px solid #22B07D;padding-bottom:20px}
  h1{margin:0;font-size:28px;letter-spacing:.04em} .muted{color:#5b6763} .paid{display:inline-block;margin-top:6px;padding:3px 10px;border-radius:99px;background:#d8f3e7;color:#127a54;font-weight:700;font-size:12px}
  .cols{display:flex;justify-content:space-between;gap:24px;margin:28px 0} .cols h3{margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#5b6763}
  table{width:100%;border-collapse:collapse} th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#5b6763;border-bottom:1px solid #d5dcd9;padding:8px 6px}
  td{padding:10px 6px;border-bottom:1px solid #eef2f0} .r{text-align:right}
  .totals{margin-left:auto;width:300px;margin-top:16px} .totals td{border:0;padding:4px 6px} .totals .grand td{border-top:2px solid #111816;font-weight:700;font-size:16px;padding-top:10px}
  .refs{margin-top:32px;font-size:12px} .refs td{border:0;padding:2px 6px 2px 0}
  footer{margin-top:36px;font-size:12px;color:#5b6763;border-top:1px solid #d5dcd9;padding-top:14px}
  .bar{max-width:800px;margin:24px auto 0;text-align:right} button{background:#22B07D;color:#fff;border:0;border-radius:6px;padding:10px 18px;font-weight:700;cursor:pointer}
  @media print{body{background:#fff}.page{margin:0;padding:0}.bar{display:none}}
</style></head><body>
<div class="bar"><button onclick="print()">Download PDF</button></div>
<div class="page">
  <div class="top">
    <div><strong style="font-size:18px">${esc(SELLER.name)}</strong><br>${SELLER.lines.map(esc).join("<br>")}<br>EIN ${esc(SELLER.ein)}<br>${esc(SELLER.email)} · ${esc(SELLER.phone)}</div>
    <div class="r"><h1>INVOICE</h1><div class="muted">${esc(number)}</div><span class="paid">PAID</span></div>
  </div>
  <div class="cols">
    <div><h3>Bill to</h3>${billTo.map(esc).join("<br>") || "—"}</div>
    <div class="r"><h3>Invoice date</h3>${esc(day)}<h3 style="margin-top:12px">Payment date</h3>${esc(day)}<h3 style="margin-top:12px">Payment method</h3>Card via Stripe</div>
  </div>
  <table>
    <thead><tr><th>Description</th><th class="r">Qty</th><th class="r">Unit price</th><th class="r">Amount</th></tr></thead>
    <tbody>${items.map((li) => `<tr><td>${esc(li.description)}${li.price?.recurring ? `<div class="muted">Subscription · billed every ${esc(li.price.recurring.interval)}</div>` : '<div class="muted">Digital course · instant online access</div>'}</td><td class="r">${li.quantity}</td><td class="r">${money(li.price?.unit_amount ?? li.amount_subtotal / (li.quantity || 1))}</td><td class="r">${money(li.amount_subtotal)}</td></tr>`).join("")}</tbody>
  </table>
  <table class="totals">
    <tr><td>Subtotal</td><td class="r">${money(s.amount_subtotal)}</td></tr>
    ${discount ? `<tr><td>Discount</td><td class="r">−${money(discount)}</td></tr>` : ""}
    ${tax ? `<tr><td>Tax</td><td class="r">${money(tax)}</td></tr>` : ""}
    <tr class="grand"><td>Total paid (${esc(cur)})</td><td class="r">${money(s.amount_total)}</td></tr>
  </table>
  <table class="refs">${refs.map(([k, v]) => `<tr><td class="muted">${esc(k)}</td><td>${esc(v)}</td></tr>`).join("")}</table>
  <footer>Thank you for your purchase. Digital products are delivered online through the Infoelev member area. Questions: ${esc(SELLER.email)}.</footer>
</div>
</body></html>`);
}
