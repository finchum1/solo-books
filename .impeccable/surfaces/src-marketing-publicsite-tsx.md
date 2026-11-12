---
version: 1
slug: "src-marketing-publicsite-tsx"
primary_target: "src/marketing/PublicSite.tsx"
related_targets: ["src/index.css","src/lib/landingTheme.ts","src/pages/LegalPages.tsx"]
---

## Scope & mode
The whole public, signed-out site (`src/marketing/*`, routed by `PublicSite.tsx`), Persuade mode: Home, Features, Payroll, Security, Sign in, Sign up, plus Privacy/Terms in the same shell. Replaces the single-scroll `Landing.tsx` ("House Ledger" / "Played Straight" worlds are retired).

## Audience, job, action, proof, constraints
- Audience: owner-operators doing their own books, one business or several; the new Payroll module speaks to those with W-2 employees (Oklahoma).
- Job: believe it is private, trustworthy and complete enough, then sign up. Action: "Get started" (/signup).
- Proof on hand: real app screenshots (light + dark) in `public/landing/shot-*.jpg` from mocked synthetic data; a live payroll demo that runs the app's real calculator on a made-up employee. No testimonials, prices, customers or press exist; none may be invented.
- Constraints: payroll copy must say Oklahoma-only and that the app does not pay, deposit or file; invoicing and banking are removed and must not be marketed; hero line stays "One ledger — for every business you run."

## Chosen direction
Pinned by the user (no concept roll): black, white and one champagne gold, Hanken Grotesk only, light + dark toggle in the header, a floating liquid-glass pill header, and "SOLO BOOKS" set edge to edge on the footer's bottom edge. Footer and Payroll band stay black in both themes. Tokens live in `index.css` (`--mk-*`); `panel.*` in `lib/landingTheme.ts` points at them.

## Memorable moment
The footer's wordmark resting on the bottom of the page; and the Payroll demo where changing the bonus or the withholding method recomputes a real paycheck live.

## Unresolved decisions
- Light-theme legibility of the glass pill over the always-black Payroll hero (header mark uses the deepened gold).
- No hover/focus screenshot coverage beyond the toggle and buttons; verify by hand.
