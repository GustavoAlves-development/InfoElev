// Transactional email via Resend's REST API.
// Env: RESEND_API_KEY, EMAIL_FROM (e.g. "Infoelev <access@infoelev.com>"), SITE_URL.
// Without RESEND_API_KEY (local dev) emails are printed to the console instead.

const env = () => globalThis.process?.env || {};
export const siteUrl = () => (env().SITE_URL || "https://infoelev.com").replace(/\/$/, "");

const escape = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function layout(title, bodyHtml) {
  return `<!doctype html><html><body style="margin:0;background:#f3f6f4;font-family:Arial,Helvetica,sans-serif;color:#1f2724;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px;"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #d5e2db;border-radius:14px;padding:36px;">
<tr><td style="font-family:Georgia,serif;font-size:22px;font-weight:bold;color:#111816;">Elev<span style="color:#0f8a5f;font-style:italic;">Pay</span></td></tr>
<tr><td style="padding-top:24px;"><h1 style="font-family:Georgia,serif;font-size:24px;color:#111816;margin:0 0 16px;">${escape(title)}</h1>${bodyHtml}</td></tr>
<tr><td style="padding-top:28px;border-top:1px solid #d5e2db;font-size:12px;color:#6b7a74;line-height:1.6;">
Questions? Reply to this email or visit ${siteUrl()}/contact.html<br>
Infoelev Digital Business LLC &middot; 8200 NW 41st Street, 2nd Floor, Doral, FL 33166, United States</td></tr>
</table></td></tr></table></body></html>`;
}

const p = (html) => `<p style="font-size:15px;line-height:1.6;margin:0 0 14px;">${html}</p>`;
const button = (href, label) =>
  `<p style="margin:22px 0;"><a href="${href}" style="background:#111816;color:#f3f6f4;text-decoration:none;padding:13px 26px;border-radius:999px;font-weight:bold;font-size:14px;">${escape(label)}</a></p>`;
const credentials = (email, password) =>
  `<table cellpadding="0" cellspacing="0" style="background:#f3f6f4;border-radius:10px;padding:16px 20px;margin:6px 0 10px;font-size:15px;">
<tr><td style="padding:4px 16px 4px 0;color:#6b7a74;">Login</td><td style="font-weight:bold;">${escape(email)}</td></tr>
<tr><td style="padding:4px 16px 4px 0;color:#6b7a74;">Password</td><td style="font-weight:bold;font-family:monospace;font-size:16px;">${escape(password)}</td></tr></table>`;

export async function sendEmail({ to, subject, html, text }) {
  const { RESEND_API_KEY, EMAIL_FROM } = env();
  if (!RESEND_API_KEY) {
    console.log(`[email] to=${to} subject="${subject}"\n${text}\n`);
    globalThis.__elevSentEmails?.push({ to, subject, text });
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + RESEND_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ from: EMAIL_FROM || "Infoelev <access@infoelev.com>", to: [to], subject, html, text }),
  });
  if (!res.ok) throw new Error("email failed: " + res.status + " " + (await res.text()));
}

export function welcomeEmail({ email, password, productName }) {
  const login = siteUrl() + "/login.html";
  return {
    to: email,
    subject: `Your access to ${productName} is ready`,
    html: layout("Your access is ready", [
      p(`Thank you for purchasing <strong>${escape(productName)}</strong>. Your member account has been created.`),
      credentials(email, password),
      button(login, "Log in to your account"),
      p(`You can change this password anytime from your account page. Keep this email for your records.`),
      p(`Not what you expected? You can request a full refund within 7 days: ${siteUrl()}/refund.html`),
    ].join("")),
    text: `Thank you for purchasing ${productName}. Your member account has been created.\n\nLogin: ${email}\nPassword: ${password}\n\nLog in: ${login}\n\nYou can change this password anytime from your account page.\nRefund policy (7 days): ${siteUrl()}/refund.html`,
  };
}

export function productAddedEmail({ email, productName }) {
  const login = siteUrl() + "/login.html";
  return {
    to: email,
    subject: `${productName} was added to your account`,
    html: layout("New product unlocked", [
      p(`Thank you for purchasing <strong>${escape(productName)}</strong>. It has been added to your existing Infoelev account (${escape(email)}).`),
      button(login, "Open my account"),
      p(`Use the password you already have. Forgot it? Use "Forgot password" on the login page.`),
    ].join("")),
    text: `Thank you for purchasing ${productName}. It has been added to your existing Infoelev account (${email}).\n\nLog in: ${login}\nForgot your password? Use "Forgot password" on the login page.`,
  };
}

export function resetEmail({ email, token }) {
  const link = siteUrl() + "/reset.html?token=" + encodeURIComponent(token);
  return {
    to: email,
    subject: "Reset your Infoelev password",
    html: layout("Reset your password", [
      p(`We received a request to reset the password for ${escape(email)}.`),
      button(link, "Choose a new password"),
      p(`This link expires in 1 hour. If you didn't ask for this, you can ignore this email.`),
    ].join("")),
    text: `We received a request to reset the password for ${email}.\n\nChoose a new password: ${link}\n\nThis link expires in 1 hour. If you didn't ask for this, ignore this email.`,
  };
}
