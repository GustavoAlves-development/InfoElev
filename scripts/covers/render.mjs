// Renders scripts/covers/cover.html to assets/img/products/<key>.png with headless Chrome/Edge.
// Usage: node scripts/covers/render.mjs

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const KEYS = ["launchpad", "gigs", "hustle", "academy", "freelance", "flip", "tutoring", "sprint7", "sprint30", "sprint90", "library", "tools", "allaccess"];

const BROWSERS = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
];
const browser = BROWSERS.find((b) => existsSync(b));
if (!browser) throw new Error("Chrome or Edge not found");

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, "../../assets/img/products");
mkdirSync(outDir, { recursive: true });
const template = pathToFileURL(path.join(here, "cover.html")).href;

for (const key of KEYS) {
  const out = path.join(outDir, key + ".png");
  execFileSync(browser, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--window-size=1000,1000",
    "--virtual-time-budget=4000",
    "--screenshot=" + out,
    template + "?p=" + key,
  ], { stdio: "ignore" });
  console.log("rendered " + path.relative(process.cwd(), out));
}
