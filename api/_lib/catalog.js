// What each Stripe product unlocks in the member apps.
// Access levels per app: "full" (course chapters + tools) or "tools" (tools only).
// Stripe product IDs must match scripts/stripe-setup.mjs.

export const APPS = {
  "side-income-launchpad": "Side Income Launchpad",
  "digital-product-academy": "Digital Product Academy",
  "freelance-starter-kit": "The Freelance Starter Kit",
  "online-gig-playbook": "Online Gig Playbook",
  "side-hustle-ledger": "The Side Hustle Ledger",
};

const ALL = Object.keys(APPS);
const every = (level) => Object.fromEntries(ALL.map((app) => [app, level]));

export const PRODUCTS = {
  infoelev_side_income_launchpad: { name: "Side Income Launchpad", grants: { "side-income-launchpad": "full" } },
  infoelev_digital_product_academy: { name: "Digital Product Academy", grants: { "digital-product-academy": "full" } },
  infoelev_freelance_kit_starter: { name: "The Freelance Starter Kit — Starter", grants: { "freelance-starter-kit": "full" } },
  infoelev_freelance_kit_complete: { name: "The Freelance Starter Kit — Complete", grants: { "freelance-starter-kit": "full" } },
  infoelev_online_gig_playbook: { name: "Online Gig Playbook", grants: { "online-gig-playbook": "full" } },
  infoelev_side_hustle_ledger_complete: { name: "The Side Hustle Ledger — Complete", grants: { "side-hustle-ledger": "full" } },
  infoelev_side_hustle_ledger_elevated: { name: "The Side Hustle Ledger — Elevated", grants: { "side-hustle-ledger": "full" } },
  infoelev_full_library: { name: "The Full Infoelev Library", grants: every("full") },
  infoelev_tools: { name: "Infoelev Tools", grants: every("tools"), monthly: true },
  infoelev_all_access: { name: "Infoelev All Access", grants: every("full"), monthly: true },
};

// Merges the grants of every active purchase; "full" wins over "tools".
export function accessOf(user) {
  const access = {};
  for (const purchase of user?.purchases || []) {
    if (purchase.status !== "active") continue;
    const grants = PRODUCTS[purchase.product]?.grants || {};
    for (const [app, level] of Object.entries(grants)) {
      if (access[app] !== "full") access[app] = level;
    }
  }
  return access;
}
