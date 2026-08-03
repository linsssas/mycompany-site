# Sellculator — Business Plan

## 1. Idea selection

Criteria: profitability, competition, automatability, zero-budget start, scalability, speed
to first revenue, risk, likelihood of success. Scored 1 (worst) – 5 (best), unweighted.

| Idea | Profit | Competition | Automation | No-budget start | Scalability | Speed to $ | Risk (lower=better) | Score |
|---|---|---|---|---|---|---|---|---|
| Programmatic SEO fee/profit calculators (chosen) | 4 | 4 | 5 | 5 | 5 | 3 | 1 | 27 |
| Notion/Canva template store (Gumroad/Etsy) | 3 | 2 | 3 | 5 | 3 | 4 | 2 | 20 |
| AI prompt packs marketplace | 2 | 1 | 4 | 5 | 3 | 4 | 2 | 19 |
| Telegram/Discord bot SaaS | 3 | 3 | 3 | 4 | 3 | 2 | 2 | 20 |
| YouTube/TikTok faceless automation channel | 4 | 2 | 3 | 4 | 4 | 1 | 3 | 21 |
| Niche AI micro-SaaS (paid API wrapper) | 4 | 2 | 3 | 2 | 4 | 2 | 3 | 20 |
| Freelance AI agency (Fiverr/Upwork gigs) | 3 | 2 | 1 | 5 | 2 | 4 | 2 | 19 |
| Affiliate content blog (general niche) | 3 | 2 | 4 | 5 | 4 | 1 | 2 | 21 |

**Why programmatic SEO fee calculators won:** it requires no paid APIs, no inventory, no
recurring content production, and no per-unit marginal cost — the code is written once and
compounds via organic search. It also converts several of the explicitly-listed target
niches (Etsy, Fiverr, Upwork, Gumroad, YouTube, and later AppSumo/TikTok) into **one coherent
product family** instead of scattering effort across unrelated ventures. Precedent: sites
like calculator.net, omnicalculator.com, and countless single-purpose fee calculators rank
well and monetize via display ads + affiliate links with near-zero operating cost.

Kept separate from the existing SES structural-load calculator product (different audience,
different brand, no reason to dilute either).

## 2. Product: Sellculator

Free web calculators that tell online sellers and creators exactly what they take home after
platform fees: Etsy, Fiverr, Upwork, Gumroad, YouTube (v1). No login, no backend, no
per-request cost — pure client-side computation, statically exported.

Live at `/tools` in this repo (`src/app/tools/`). Fee logic lives in `src/lib/sellerFees/*.ts`,
sourced from each platform's public fee schedule as of 2026 (see in-app source notes and
disclaimers — rates are called out as subject to change, with a link-out prompt to verify).

## 3. Architecture

- Next.js App Router, static export (`output: "export"`) — same toolchain already used by
  this repo, deployable to GitHub Pages, Vercel, Cloudflare Pages, or any static host at zero
  cost.
- No database, no server, no API keys required to run the calculators themselves.
- `AdSlot` component is inert until `NEXT_PUBLIC_ADSENSE_CLIENT` is set — ad monetization is
  opt-in and requires a real AdSense account (human-only step, see §9).
- `sitemap.ts` / `robots.ts` at the app root cover both the existing calculator and all
  `/tools/*` pages.

## 4. Financial model (illustrative, not a forecast)

Zero fixed costs at this stage (static hosting is free on Vercel/Cloudflare Pages/GitHub
Pages tiers; a custom domain is the only near-term cash cost, ~$10–15/yr).

| Monthly organic sessions | Est. AdSense RPM | Ad revenue/mo | + Affiliate/Gumroad upsell (rough) |
|---|---|---|---|
| 1,000 | $8–15 | $8–15 | $0–20 |
| 10,000 | $8–15 | $80–150 | $50–150 |
| 50,000 | $8–15 | $400–750 | $250–600 |

RPM ranges are industry rule-of-thumb for English finance/business-tool content, not a
guarantee. Reaching 10k+ monthly sessions on 5 pages realistically takes several months of
sustained content/SEO expansion (§7) — this is a compounding-traffic business, not a
fast-cash one; the "speed to first $" score above reflects that honestly.

## 5. Automation plan

- Content: each new calculator follows the existing `ToolPageShell` pattern — adding a niche
  is a code change (formula + page), not manual writing per traffic tier.
  Everything that can be code (fee math, on-page SEO content, sitemap, structured FAQ) is code;
  nothing here is done by a human in the loop.
- Deployment: existing GitHub Actions workflow (`.github/workflows/deploy-pages.yml`) already
  builds and deploys on every push to `main` — no manual release step.
  Same policy: continue everything that can be automated, and note when a step is claimed
  as complete without a human ever having created the required account (that would be a
  false completion, not automation).

## 6. Scaling plan

1. **v1 (this change):** 5 calculators — Etsy, Fiverr, Upwork, Gumroad, YouTube.
2. **v2:** AppSumo partner payout, TikTok Creator Fund/Creativity Program estimator, Amazon
   FBA fee calculator, Pinterest/affiliate link commission calculator, Depop/Poshmark fee
   calculator — same pattern, one PR per tool.
3. **v3:** "save & compare" (pure client-side, localStorage — no account system needed),
   embeddable calculator widgets for other sites (backlink acquisition), CSV/PDF export as a
   paid one-time unlock via Gumroad.
4. Long-term: spin out to its own domain once traffic justifies it, so it stops sharing a
   deploy target with the structural-calculator product.

## 7. SEO plan

- Target long-tail, high-intent queries per tool (e.g. "etsy fee calculator", "upwork service
  fee calculator 2026") — each already has an existing SERP with calculators ranking, proving
  demand and a template to beat on clarity/accuracy.
- On-page: unique title/description per tool (done), FAQ blocks answering the queries people
  actually search (done), internal linking between related calculators (done via
  `relatedTools`), sitemap.xml + robots.txt (done).
- Off-page (needs the human, §9): submit sitemap in Google Search Console, get the first
  handful of backlinks (relevant subreddits, Indie Hackers, freelancer forums — organic
  posting only, no spam/link schemes).

## 8. Content, sales & growth plan

- No separate "sales" motion — the product is the content. Growth = adding calculators for
  every platform/fee structure people already search for, so the plan point-by-point:
  - **Content:** new tool pages, expanded FAQs, "how X's fees changed in 2026" explainer
    posts linking back to the relevant calculator.
  - **Sales:** none needed for the free tier; a $9–19 one-time Gumroad "seller toolkit" (CSV
    export, saved calculations, printable invoice) is the only paid SKU, sold through
    Sellculator's own traffic — genuinely low-pressure, opt-in.
  - **Growth:** organic search compounding + the v2/v3 roadmap above. No paid ads planned
    until organic traffic and conversion data justify the spend.

## 9. What requires you (cannot be automated by the agent)

Per the ground rules for this project, only steps that need real account ownership, payment,
or physical action are yours:

- [ ] Buy a domain (optional; can launch on the free GitHub Pages / Vercel subdomain first).
- [ ] Create a Google AdSense account and get the site approved, then set
      `NEXT_PUBLIC_ADSENSE_CLIENT` in deployment config — ads stay off until you do.
- [ ] Sign up for any affiliate programs you want to link (Gumroad affiliate, etc.).
- [ ] Create the Gumroad product for the paid "seller toolkit" if/when you want to sell it.
- [ ] Verify the site in Google Search Console and submit the sitemap.
- [ ] Confirm you're fine with the Sellculator brand/name before it goes live publicly (easy
      to rename — it's just strings in `src/app/tools/layout.tsx` and this doc).

Everything else — code, copy, on-page SEO, sitemap/robots, the fee formulas and their
disclaimers — is done.
