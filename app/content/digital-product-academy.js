// Course chapters for digital-product-academy. Served only to members with full access (see middleware.js).
window.ELEV_CHAPTERS = [
  {
    id: "ch1", label: "1. What Investing Actually Is", module: "Module 1",
    heading: "What Investing Actually Is", dek: "The core idea, without the jargon.",
    body: [
      { type: "p", text: "Investing means putting money into something today with the expectation that it will be worth more later, in exchange for taking on some risk that it won't be. That's the entire concept underneath every product and acronym in this space." },
      { type: "h", text: "Why people invest instead of just saving" },
      { type: "list", items: [
        "Cash sitting still tends to lose purchasing power to inflation over time.",
        "Investing gives your money a chance to grow faster than a standard savings account.",
        "The tradeoff is that value can go down as well as up, especially in the short term."
      ] },
      { type: "action", text: "Write one sentence, in your own words, explaining why you personally want to start investing." }
    ]
  },
  {
    id: "ch2", label: "2. Risk, Return, and Time Horizon", module: "Module 2",
    heading: "Risk, Return, and Time Horizon", dek: "Why risk isn't something to avoid entirely.",
    body: [
      { type: "p", text: "Risk and potential return are linked — you generally can't reduce one without reducing the other. The right amount of risk depends heavily on when you'll actually need the money." },
      { type: "h", text: "How time horizon changes the picture" },
      { type: "list", items: [
        "Money you need within a year or two generally shouldn't carry much investment risk at all.",
        "Money you won't touch for a decade or more has time to recover from downturns.",
        "Your comfort with seeing the value drop temporarily matters as much as the math."
      ] },
      { type: "action", text: "Write down your top financial goal, its rough time horizon, and whether that money should carry high, medium, or low risk." }
    ]
  },
  {
    id: "ch3", label: "3. Account Types Explained", module: "Module 3",
    heading: "Account Types Explained", dek: "Brokerage vs. retirement accounts, and why it matters.",
    body: [
      { type: "p", text: "The account you use can matter as much as what you invest in, mainly because of the tax treatment attached to it. This module explains the differences in plain terms, not which specific account to open." },
      { type: "h", text: "The broad categories" },
      { type: "list", items: [
        "Taxable brokerage accounts: flexible, no withdrawal restrictions, but no special tax treatment.",
        "Tax-advantaged retirement accounts: tax benefits in exchange for restrictions on withdrawing before retirement age.",
        "Employer-sponsored plans: may include a company match, worth understanding before anything else."
      ] },
      { type: "action", text: "Find out whether your employer offers any kind of matching contribution, and write down the details if so." }
    ]
  },
  {
    id: "ch4", label: "4. Building a Starter Portfolio", module: "Module 4",
    heading: "Building a Starter Portfolio", dek: "A guided exercise, not a stock pick.",
    body: [
      { type: "p", text: "A starter portfolio doesn't need to be complicated. Broad diversification — owning small pieces of many companies rather than betting on a few — is the foundation most long-term approaches are built on." },
      { type: "h", text: "What to think through" },
      { type: "list", items: [
        "How much of your portfolio should be in stocks versus more stable assets, given your time horizon.",
        "Whether you want built-in diversification through a fund, versus assembling it yourself.",
        "How often you'll actually rebalance, and putting that on a calendar now."
      ] },
      { type: "action", text: "Use the Starter Portfolio Worksheet to sketch a simple target allocation across a few broad categories." }
    ]
  },
  {
    id: "ch5", label: "5. Staying the Course", module: "Module 5",
    heading: "Staying the Course", dek: "Handling market swings without panic-selling.",
    body: [
      { type: "p", text: "Markets move up and down regularly; that's not a malfunction, it's how they work. Investors who do best over time are usually the ones who stuck to a plan rather than reacting to every swing." },
      { type: "h", text: "What tends to help" },
      { type: "list", items: [
        "Checking your portfolio on a set schedule, not every time the market moves.",
        "Revisiting your original time horizon before making any change.",
        "Remembering that a loss on paper isn't a real loss until you actually sell."
      ] },
      { type: "action", text: "Decide now, in advance, how often you'll actually check your investments — and write that number down." }
    ]
  }
];
