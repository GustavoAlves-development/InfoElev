// Course chapters for side-hustle-ledger. Served only to members with full access (see middleware.js).
window.ELEV_CHAPTERS = [
  {
    id: "ch1", label: "1. Why Most Budgets Fail", module: "Module 1",
    heading: "Why Most Budgets Fail", dek: "The real reasons budgeting tools get abandoned.",
    body: [
      { type: "p", text: "Most budgets don't fail because of bad math — they fail because they demand daily attention most people can't sustain. The system has to survive a busy week, not just a calm one." },
      { type: "h", text: "The usual failure points" },
      { type: "list", items: [
        "Too many categories to log accurately every day.",
        "No fixed time set aside to actually review it.",
        "A single overspend feels like \"failure,\" so the whole thing gets abandoned."
      ] },
      { type: "action", text: "Write down the last budgeting method you tried and the specific point where you stopped using it." }
    ]
  },
  {
    id: "ch2", label: "2. Building Your Ledger", module: "Module 2",
    heading: "Building Your Ledger", dek: "Setting up your ledger in one sitting, with real numbers.",
    body: [
      { type: "p", text: "A ledger works best when it's built from your actual bank statements, not a guess. Pull up the last month of transactions before you fill anything in." },
      { type: "h", text: "What goes in first" },
      { type: "list", items: [
        "Your total income for the month, after taxes.",
        "Every fixed bill, in one column.",
        "A single \"everything else\" total to start — you'll split it in the next chapter."
      ] },
      { type: "action", text: "Open the Weekly Ledger tool and enter this month's income and fixed bills as your starting point." }
    ]
  },
  {
    id: "ch3", label: "3. Categorizing Without Overcomplicating", module: "Module 3",
    heading: "Categorizing Without Overcomplicating", dek: "A short list of categories that covers almost everything.",
    body: [
      { type: "p", text: "More categories feel more precise, but they're also more work to maintain. A shorter list you'll actually keep using beats a detailed one you abandon in week two." },
      { type: "h", text: "A category list that covers most spending" },
      { type: "list", items: [
        "Essentials: housing, utilities, groceries, transport.",
        "Flexible: dining out, entertainment, shopping.",
        "Future: savings, debt payoff, investing."
      ] },
      { type: "action", text: "Sort last month's \"everything else\" total into these three groups in the Weekly Ledger tool." }
    ]
  },
  {
    id: "ch4", label: "4. The Weekly 10-Minute Check-In", module: "Module 4",
    heading: "The Weekly 10-Minute Check-In", dek: "The ritual that makes the ledger actually stick.",
    body: [
      { type: "p", text: "A once-a-month review is too infrequent to catch problems early. A short weekly check-in, done the same day every week, is what keeps the ledger accurate." },
      { type: "h", text: "What the check-in covers" },
      { type: "list", items: [
        "Update actual spending against your planned amounts.",
        "Note anything unusual before you forget why it happened.",
        "Adjust next week's plan if something's clearly off track."
      ] },
      { type: "action", text: "Put a recurring 10-minute reminder on your calendar, same day and time every week, labeled \"Ledger check-in.\"" }
    ]
  },
  {
    id: "ch5", label: "5. Adjusting When Life Happens", module: "Module 5",
    heading: "Adjusting When Life Happens", dek: "What to do when an unexpected expense throws off your plan.",
    body: [
      { type: "p", text: "An overspent category isn't a sign the system is broken — it's information. The goal is to adjust the plan, not abandon the habit." },
      { type: "h", text: "A simple way to reset" },
      { type: "list", items: [
        "Identify which category absorbed the unexpected cost.",
        "Rebalance next week's plan to cover the gap, rather than ignoring it.",
        "If it's a true one-time event, note it separately instead of treating it as your new normal."
      ] },
      { type: "action", text: "Think of the last unexpected expense you had, and decide right now which category would have absorbed it in your ledger." }
    ]
  }
];
