# Hot Lunch Reimagined

**Unofficial concept.** This is a personal case study, not a product offered to a school.

Maple Hollow Elementary, and every household, student, and vendor in the demo, are made up. The project has no connection to any school, parent advisory council (PAC), or food vendor. It does not use their names, logos, or branding. No lunch order, payment, email, or text in the demo is real.

Live demo: [hot-lunch-reimagined.vercel.app](https://hot-lunch-reimagined.vercel.app)

## The problem

A lot of elementary hot lunch still runs on paper slips, a shared inbox, or a spreadsheet that one volunteer maintains.

For a parent, the cutoff is easy to miss. The menu lives in a newsletter or a Facebook post. A missed form means a child with no lunch, and the reminder, when there is one, is a personal text from someone on the PAC.

For the volunteer, the week ends in counting. Orders have to be totalled by vendor and by day, cash and e-transfers have to be matched to families, and someone has to notice which children were never marked down. The next school year often starts by copying last year’s spreadsheet and fixing grades by hand.

## What changed

The demo is a parent view (Home, Orders, and Payments) and a volunteer workspace for that fictional school.

- Each menu day shows a countdown and locks at the cutoff, in America/Vancouver.
- Households can opt into a mock email or text reminder. The app records it in a mock outbox. Nothing is sent.
- Household accounts stay in the browser. A volunteer can preview a school-year rollover, then apply it: students move up a grade, Grade 5 is archived, and that year’s orders, reminders, and payments stay on file instead of counting as the new year. Preferences carry over. The sample data reseeds each Vancouver day.
- The interface uses shadcn/ui, with large touch targets and a parent view and a volunteer view.
- The volunteer dashboard totals orders by vendor and by day, reconciles each household as paid, short, or credit, lists students who still need a meal, and downloads orders and reconciliation as CSV.

## Time

Nothing here was timed in a school. This is a qualitative picture, plus an illustration with its assumptions written out.

Parents spend less time hunting for the cutoff, because it is on the order screen, and a reminder can be queued before it. Volunteers spend less time tallying slips and matching payments, because the totals, the reconciliation, and the missing-order list are already on the volunteer page.

**Illustrative estimate, not a measurement.** Assume a small elementary PAC, once a week, where a parent spends about 8 minutes finding the menu and filling a paper slip or an email, and one volunteer spends about 90 minutes counting orders and matching payments. Moving those two tasks onto this screen would return most of that volunteer evening, and some of the parent’s 8 minutes. Those numbers are assumptions for scale. This demo did not record either task.

## Stack

- Next.js 16 (App Router) and React 19
- TypeScript
- Tailwind CSS v4 and shadcn/ui
- Vitest for unit tests, Playwright for end-to-end tests
- Demo state in the browser. No database, no email provider, and no payment provider.

## Run it locally

Node.js 22 or newer.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The parent view is `/`. The volunteer view is `/admin`. Both say the school is fictional.

## Tests and CI

```bash
npm test
npm run lint
npm run typecheck
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
```

GitHub Actions (`.github/workflows/ci.yml`) runs lint, typecheck, unit tests, the production build, and Playwright on pull requests and on pushes to `main`.

## Hosting

The live demo is a personal project on Vercel’s Hobby plan.

[Vercel’s fair use guidelines](https://vercel.com/docs/limits/fair-use-guidelines) say the Hobby plan is for non-commercial, personal use. A deployment that takes lunch payments, or is run for a PAC as an organization, would need a plan that allows that use. The same page says commercial use of the platform requires Pro or Enterprise. This README does not list other plan limits.
