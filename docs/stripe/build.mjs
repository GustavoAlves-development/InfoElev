// Renders the Stripe dossier PDF and the final email, filling in the private values.
// Usage:
//   node docs/stripe/build.mjs --shots   capture screenshots from SITE (default https://infoelev.com) into shots/
//   node docs/stripe/build.mjs           → admin/Infoelev-Stripe-Dossier.pdf + admin/stripe-email.{md,html,txt}
//
// Private values live in admin/stripe-values.json (git-ignored):
//   { "EIN": "...", "ACCOUNT ID": "acct_...", "REVIEWER PASSWORD": "...", "YOUR NAME": "...",
//     "SHOT_ACCOUNTS": { "member": { "email": "...", "password": "..." }, "sprint": { ... } } }
// "member" needs every product plus admin rights (account, course app, tool and admin shots);
// "sprint" needs a started sprint. Against a localhost SITE the dev-server demo accounts are used.

import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const adminDir = path.resolve(here, "../../admin");
const SITE = (process.env.SITE || "https://infoelev.com").replace(/\/$/, "");
const browser = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
if (!browser) throw new Error("Chrome or Edge not found");

const valuesFile = path.join(adminDir, "stripe-values.json");
const values = existsSync(valuesFile) ? JSON.parse(readFileSync(valuesFile, "utf8")) : {};
const KEYS = ["EIN", "ACCOUNT ID", "REVIEWER PASSWORD", "YOUR NAME"];
const fill = (text) => text.replace(new RegExp("\\[(" + KEYS.join("|") + ")\\]", "g"), (all, key) => values[key] || all);
const chrome = (args) => execFileSync(browser, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--virtual-time-budget=6000", ...args], { stdio: "ignore" });
const shotsDir = path.join(here, "shots");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Screenshots through headless Chrome over the DevTools protocol; jobs with an `account` are signed in with its session cookie.
async function captureShots(jobs) {
  const port = 9300 + Math.floor(Math.random() * 500);
  const profile = path.join(here, ".chrome-profile");
  const proc = spawn(browser, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--remote-debugging-port=" + port, "--user-data-dir=" + profile, "about:blank"], { stdio: "ignore" });
  try {
    let wsUrl;
    for (let i = 0; i < 50 && !wsUrl; i++) {
      await sleep(200);
      wsUrl = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json()).then((l) => l.find((t) => t.type === "page")?.webSocketDebuggerUrl).catch(() => null);
    }
    if (!wsUrl) throw new Error("Chrome DevTools did not start");
    const ws = new WebSocket(wsUrl);
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    let seq = 0;
    const pending = new Map();
    ws.onmessage = (m) => { const d = JSON.parse(m.data); pending.get(d.id)?.(d); pending.delete(d.id); };
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++seq;
      pending.set(id, (d) => (d.error ? reject(new Error(method + ": " + d.error.message)) : resolve(d.result)));
      ws.send(JSON.stringify({ id, method, params }));
    });
    await send("Page.enable");
    await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });

    const sessions = new Map(); // one login per account; the site rate-limits logins
    for (const job of jobs) {
      await send("Network.clearBrowserCookies");
      let route = job.route;
      if (job.account) {
        if (!sessions.has(job.account.email)) {
          const res = await fetch(SITE + "/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: job.account.email, password: job.account.password }) });
          const set = (res.headers.get("set-cookie") || "").split(";")[0];
          if (!res.ok || !set) throw new Error("login failed for " + job.account.email + " (" + res.status + ")");
          sessions.set(job.account.email, set);
        }
        const cookie = sessions.get(job.account.email);
        const [name, value] = cookie.split("=");
        await send("Network.setCookie", { name, value, url: SITE });
        route = (await job.before?.(cookie)) || route;
      }
      await send("Page.navigate", { url: SITE + route });
      await sleep(2000);
      // Show scroll-reveal content immediately and jump (not smooth-scroll) to the #section.
      await send("Runtime.evaluate", { expression: `document.documentElement.style.scrollBehavior = "auto";
        document.querySelectorAll(".reveal").forEach((e) => e.classList.add("active"));
        const t = location.hash.length > 1 && document.querySelector(location.hash); if (t && !document.querySelector(".app-shell")) t.scrollIntoView();` });
      if (job.script) await send("Runtime.evaluate", { expression: job.script });
      await sleep(900);
      const { data } = await send("Page.captureScreenshot", { format: "png" });
      writeFileSync(path.join(shotsDir, job.name + ".png"), Buffer.from(data, "base64"));
      console.log("captured shots/" + job.name + ".png" + (job.account ? " (signed in)" : ""));
    }
    ws.close();
  } finally {
    proc.kill();
    await sleep(500);
    rmSync(profile, { recursive: true, force: true });
  }
}

if (process.argv.includes("--shots")) {
  const up = await fetch(SITE + "/").then((r) => r.ok).catch(() => false);
  if (!up) throw new Error(SITE + " is not responding; start the site before capturing screenshots");
  mkdirSync(shotsDir, { recursive: true });
  const pub = { home: "/", "product-page": "/side-income-launchpad.html", pricing: "/library.html#pricing", sprints: "/sprints.html", login: "/login.html", welcome: "/welcome.html" };
  const jobs = Object.entries(pub).map(([name, route]) => ({ name, route }));

  // Access email, rendered from the real template with sample data.
  process.env.SITE_URL = SITE;
  const { welcomeEmail } = await import(pathToFileURL(path.resolve(here, "../../api/_lib/email.js")).href);
  const tmpEmail = path.join(here, ".email-sample.html");
  writeFileSync(tmpEmail, welcomeEmail({ email: "customer@example.com", password: "sample-password-123", productName: "Side Income Launchpad" }).html);
  try {
    chrome(["--window-size=700,900", "--screenshot=" + path.join(shotsDir, "email.png"), pathToFileURL(tmpEmail).href]);
    console.log("captured shots/email.png");
  } finally {
    rmSync(tmpEmail, { force: true });
  }

  const local = /^http:\/\/(localhost|127\.0\.0\.1)/.test(SITE);
  const accounts = values.SHOT_ACCOUNTS || (local ? { member: { email: "admin@example.com", password: "dev-admin-pass" }, sprint: { email: "sprint@example.com", password: "dev-sprint-pass" } } : null);
  if (!accounts) {
    console.log("skipped signed-in shots: add SHOT_ACCOUNTS to admin/stripe-values.json");
  } else {
    // Example rows typed into the calculator (browser storage only), so the tool shot isn't empty.
    const sampleFlips = `(() => {
      const set = (el, v) => { el.value = v; el.dispatchEvent(new Event("input")); };
      const rows = [["Vintage denim jacket", 8, 48, 7], ["Board game, complete", 4, 30, 6]];
      rows.forEach((r, i) => {
        if (i) document.querySelector(".tt-add").click();
        const inputs = document.querySelectorAll(".tt-rows tr")[i].querySelectorAll("input");
        r.forEach((v, j) => set(inputs[j], v));
      });
    })()`;
    // Make sure the sprint shot shows a sprint in progress with a check-in.
    const startSprint = async (cookie) => {
      const api = (body) => fetch(SITE + "/api/sprints", { method: body ? "POST" : "GET", headers: { "Content-Type": "application/json", cookie }, body: body && JSON.stringify(body) }).then((r) => r.json());
      let data = await api();
      if (!data.sprints?.length && data.credits?.[30] + data.credits?.[7] > 0) {
        data = await api({ action: "start", days: data.credits[30] ? 30 : 7, goal: "Land my first 3 paid freelance projects", target: 300 });
      }
      const s = data.sprints?.[data.sprints.length - 1];
      if (s && !s.checkins[1]) await api({ action: "checkin", id: s.id, day: 1, done: true, amount: 45, note: "Sent 6 proposals, booked 1 call" });
      return s ? "/app/sprints.html#" + s.id : null;
    };
    jobs.push(
      { name: "account", route: "/account.html", account: accounts.member },
      { name: "app", route: "/app/side-income-launchpad.html#ch2", account: accounts.member },
      { name: "app-tools", route: "/app/flip-playbook.html#tool-flips", account: accounts.member, script: sampleFlips },
      { name: "sprints-app", route: "/app/sprints.html", account: accounts.sprint, before: startSprint },
      { name: "admin", route: "/admin.html", account: accounts.member },
    );
  }
  await captureShots(jobs);
  process.exit(0);
}

const missing = KEYS.filter((k) => !values[k]);
mkdirSync(adminDir, { recursive: true });
// Render from a temporary copy next to the template so relative image paths keep working.
const tmp = path.join(here, ".dossier-filled.html");
writeFileSync(tmp, fill(readFileSync(path.join(here, "dossier.html"), "utf8")));
const pdf = path.join(adminDir, "Infoelev-Stripe-Dossier.pdf");
try {
  chrome(["--no-pdf-header-footer", "--print-to-pdf=" + pdf, pathToFileURL(tmp).href]);
} finally {
  rmSync(tmp, { force: true });
}
const emailMd = fill(readFileSync(path.join(here, "email.md"), "utf8")).replace(/\r\n/g, "\n");
writeFileSync(path.join(adminDir, "stripe-email.md"), emailMd);

// Copy-paste friendly versions of the email body (everything after the first "---"):
// white-background HTML to open in a browser and paste into Gmail, and plain text.
const subject = (emailMd.match(/\*\*Assunto:\*\* (.+)/) || [])[1] || "";
const body = emailMd.split(/\n---\n/)[1].trim();
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/(https?:\/\/[^\s|)]+)/g, '<a href="$1">$1</a>');
const blocks = body.split(/\n\n+/).map((block) => {
  const lines = block.split("\n");
  if (lines[0].startsWith("|")) {
    const rows = lines.filter((l) => !/^\|\s*-/.test(l)).map((l) => l.split("|").slice(1, -1).map((c) => c.trim()));
    const cell = (tag, c) => `<${tag} style="border:1px solid #ccc;padding:6px 10px;text-align:left">${inline(c)}</${tag}>`;
    return `<table style="border-collapse:collapse;margin:0 0 14px">` + rows.map((r, i) => "<tr>" + r.map((c) => cell(i ? "td" : "th", c)).join("") + "</tr>").join("") + "</table>";
  }
  if (lines.every((l) => l.startsWith("- "))) return "<ul>" + lines.map((l) => "<li>" + inline(l.slice(2)) + "</li>").join("") + "</ul>";
  if (lines.every((l) => /^\d+\. /.test(l))) return "<ol>" + lines.map((l) => "<li>" + inline(l.replace(/^\d+\. /, "")) + "</li>").join("") + "</ol>";
  return "<p>" + lines.map(inline).join("<br>") + "</p>";
});
writeFileSync(path.join(adminDir, "stripe-email.html"), `<!doctype html><html><head><meta charset="utf-8"><title>${esc(subject)}</title></head>
<body style="background:#fff;color:#000;margin:0;padding:24px">
<p style="font-family:Arial,sans-serif;font-size:13px;color:#666;border-bottom:1px solid #ddd;padding-bottom:12px">Assunto: <b style="color:#000">${esc(subject)}</b><br>Copie a partir da linha abaixo (Ctrl+A copia tudo, inclusive esta nota).</p>
<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;max-width:720px">${blocks.join("\n")}</div>
</body></html>\n`);
const plain = body.replace(/\*\*(.+?)\*\*/g, "$1").replace(/^\|\s*-.*\n/gm, "").replace(/^\| (.+) \|$/gm, (l, row) => "- " + row.split(" | ").join(" — "));
writeFileSync(path.join(adminDir, "stripe-email.txt"), "Subject: " + subject + "\n\n" + plain + "\n");

console.log("wrote admin/Infoelev-Stripe-Dossier.pdf and admin/stripe-email.{md,html,txt}");
if (missing.length) console.log("still missing in admin/stripe-values.json: " + missing.join(", "));
