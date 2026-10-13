# E-mail para a Stripe (Risk / Compliance)

> Gerado por `node docs/stripe/build.mjs`, que preenche os [CAMPOS] a partir de admin/stripe-values.json.
> Anexe `Infoelev-Stripe-Dossier.pdf`. Envie do mesmo e-mail cadastrado na conta Stripe.

**Assunto:** Request for a proactive review of our account and products — Infoelev Digital Business LLC ([ACCOUNT ID])

---

Hello Stripe Risk and Compliance team,

I hope this message finds you well.

I am reaching out on behalf of Infoelev Digital Business LLC, which recently opened Stripe account [ACCOUNT ID]. Before we begin accepting customer payments, I would like to ask your team to review the account, the products we have set up, and the way our business operates. We intend to use Stripe as our main payment provider, so it is important to us that everything is in line with Stripe's policies and risk requirements from the very beginning.

**About the company**

- Legal name: Infoelev Digital Business LLC (Wyoming limited liability company)
- EIN: [EIN]
- Principal office: 8200 NW 41st Street, 2nd Floor, Doral, FL 33166, United States
- Website: https://infoelev.com
- Support: support@infoelev.com

**What we do**

Infoelev creates and sells its own educational digital products about building extra income: self-paced online courses, interactive planning tools, and short guided programs. Every product is written and maintained by us and delivered online in a private member area. We do not sell physical goods, third-party products, coaching, or financial or investment advice, and we make no income promises. All prices are in USD.

Each product has its own sales page, and every purchase goes through Stripe Checkout, created by our server for the specific product the customer selected.

| Product | Format | Price | Sales page |
|---|---|---|---|
| Side Income Launchpad | 30-day program, 5 chapters + Idea Scorecard tool | $29 one-time | https://infoelev.com/side-income-launchpad.html |
| Digital Product Academy | Course, 5 modules + Product Revenue Planner | $54 one-time | https://infoelev.com/digital-product-academy.html |
| The Freelance Starter Kit | Course, 5 modules + Rate Calculator | $12 Starter / $22 Complete | https://infoelev.com/freelance-starter-kit.html |
| Online Gig Playbook | Course, 5 modules + Earnings Tracker | $17 one-time | https://infoelev.com/online-gig-playbook.html |
| The Flip Playbook | Course, 5 modules + Profit Calculator | $19 one-time | https://infoelev.com/flip-playbook.html |
| Full Infoelev Library | All six programs, lifetime access | $90 one-time | https://infoelev.com/library.html |
| Side Hustle Sprints | 7 / 30 / 90-day goal tracker | $6 / $15 / $28 per sprint | https://infoelev.com/sprints.html |
| Infoelev Tools | All six interactive tools | $9 / month | https://infoelev.com/library.html#pricing |
| Infoelev All Access | All courses and tools | $19 / month | https://infoelev.com/library.html#pricing |

Two points we would like to make clear upfront:

- Side Hustle Sprints are designed to be bought more than once. Each purchase adds one sprint (a fixed period with one goal and a daily check-in) to the customer's account, and it is used up when the customer starts it. A customer with several sprint purchases has simply bought several sprints; this is expected behavior, not unusual activity.
- Our two monthly plans renew every month until canceled. This is stated on the sales pages, in our Terms, and on the Stripe Checkout page itself.

**How customers receive their purchase**

1. The customer pays on Stripe Checkout. The checkout page explains that access is delivered by email and links to our Terms and Refund Policy.
2. Our Stripe webhook confirms the payment, creates the customer's member account, and immediately emails their login details.
3. The customer signs in at https://infoelev.com/login.html and opens their products from their account page. Access is checked on our server for every product.
4. Refunds and subscription cancellations remove the related access automatically, and a refunded sprint that has not been started is removed from the account.

**How we protect customers**

- Full refund within 7 days on every one-time purchase and on the first payment of a membership: https://infoelev.com/refund.html
- Memberships can be canceled at any time, with access kept until the end of the paid period
- Terms of Use: https://infoelev.com/terms.html
- Privacy Policy: https://infoelev.com/privacy.html
- Contact page: https://infoelev.com/contact.html (replies within 1–2 business days)
- Every sales page and our Terms state that the products are educational, are not financial advice, and do not guarantee any income

**Access for your review team**

So you can see exactly what a paying customer receives, we created a member account with access to every course, tool, and sprint:

- Login page: https://infoelev.com/login.html
- Email: stripe-review@infoelev.com
- Password: [REVIEWER PASSWORD]

**Current status**

This is a new operation and we have not processed customer payments yet. The attached dossier documents the website, the sales pages, the checkout and delivery flow, the member area, and our admin panel as they work today, instead of historical sales data.

If your team sees anything we should change before we start processing payments — in the products, the pages, the business model, or the account settings — we would be grateful to hear it now. We would much rather adjust things upfront than run into a review, a reserve, or a hold later on.

I am glad to provide any further information, documents, or screenshots that would help.

Thank you very much for your time.

Kind regards,

[YOUR NAME]
Infoelev Digital Business LLC
support@infoelev.com
https://infoelev.com
