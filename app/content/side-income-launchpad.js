// Course chapters for side-income-launchpad. Served only to members with full access (see middleware.js).
window.ELEV_CHAPTERS = [
  {
    id: "ch1", label: "1. Where You Stand", module: "Module 1",
    heading: "Where You Stand", dek: "A full, judgment-free financial audit — before you change anything.",
    body: [
      { type: "p", text: "Before you touch a budget or a payoff plan, you need one honest snapshot of where things stand today. Most people skip this step because it's uncomfortable, but it's the only way to know if what you try next is actually working." },
      { type: "h", text: "What to gather" },
      { type: "list", items: [
        "Every account balance: checking, savings, credit cards, loans.",
        "Every recurring bill, even the small ones you pay on autopilot.",
        "Your actual take-home income for the last three months, not just your salary."
      ] },
      { type: "action", text: "List every debt you currently carry — balance, minimum payment, and interest rate if you know it. You'll use this list again in the next chapter." }
    ]
  },
  {
    id: "ch2", label: "2. The Debt Map", module: "Module 2",
    heading: "The Debt Map", dek: "Turning a list of debts into a map you can actually act on.",
    body: [
      { type: "p", text: "Once you have your numbers, the next step is ordering them — not by how much you owe, but by how you'll attack them." },
      { type: "h", text: "Two ways to sort your list" },
      { type: "list", items: [
        "By balance, smallest to largest — the \"snowball\" order.",
        "By interest rate, highest to lowest — the \"avalanche\" order.",
        "Flag any debt that's in collections or past due; those often need attention first, regardless of size."
      ] },
      { type: "action", text: "Open the Debt Snapshot tool, enter every debt from Chapter 1, and try sorting it both ways to see which order feels more sustainable to you." }
    ]
  },
  {
    id: "ch3", label: "3. Choosing Your Payoff Strategy", module: "Module 3",
    heading: "Choosing Your Payoff Strategy", dek: "Snowball or avalanche — picking the one you'll actually stick with.",
    body: [
      { type: "p", text: "The avalanche method tends to save more in interest. The snowball method tends to keep people motivated longer because of early wins. Neither is \"wrong\" — the one you finish beats the one you abandon." },
      { type: "h", text: "Questions to help you decide" },
      { type: "list", items: [
        "Do quick wins keep you motivated, or do you need to see the math to stay disciplined?",
        "How many separate debts are you juggling right now?",
        "Is any single debt costing you noticeably more in interest than the others?"
      ] },
      { type: "action", text: "Commit to one method in the Debt Snapshot tool and mark your first target debt." }
    ]
  },
  {
    id: "ch4", label: "4. Rebuilding Your Budget", module: "Module 4",
    heading: "Rebuilding Your Budget", dek: "A budget designed to survive a real month, not a perfect one.",
    body: [
      { type: "p", text: "A budget only works if it matches how you actually live. Instead of starting from a generic template, build yours from your last three months of real spending." },
      { type: "h", text: "A structure that tends to hold up" },
      { type: "list", items: [
        "Fixed essentials — housing, utilities, minimum debt payments — first.",
        "A realistic, not aspirational, number for variable spending like food and transport.",
        "A specific line for debt payoff, treated like a bill, not an afterthought."
      ] },
      { type: "action", text: "Write down your fixed essentials total and your debt payoff target for next month." }
    ]
  },
  {
    id: "ch5", label: "5. Automating Progress", module: "Module 5",
    heading: "Automating Progress", dek: "Systems that keep moving even on your busiest weeks.",
    body: [
      { type: "p", text: "Willpower runs out. Automation doesn't. The goal here is to make your plan the default, not something you have to remember to do every week." },
      { type: "h", text: "What's worth automating first" },
      { type: "list", items: [
        "An automatic transfer toward your debt target, timed right after payday.",
        "Bill reminders or autopay for anything with a late fee.",
        "A recurring 10-minute weekly check-in on your calendar."
      ] },
      { type: "action", text: "Set up one automatic transfer this week, even a small one, tied to your chosen debt target." }
    ]
  },
  {
    id: "ch6", label: "6. Locking In the Gains", module: "Module 6",
    heading: "Locking In the Gains", dek: "What happens after a debt is paid off.",
    body: [
      { type: "p", text: "The most common mistake after clearing a debt is letting that freed-up money quietly disappear into daily spending. The habit that got you here is the same one that builds what comes next." },
      { type: "h", text: "Redirecting the win" },
      { type: "list", items: [
        "Roll the payment you were making into your next debt target, or into savings once debts are cleared.",
        "Set one new, specific savings goal before the \"extra\" money has a chance to vanish.",
        "Revisit your Debt Snapshot tool monthly to watch the balance actually move."
      ] },
      { type: "action", text: "Decide right now where your first freed-up payment will go once your first debt is cleared, and write it down." }
    ]
  }
];
