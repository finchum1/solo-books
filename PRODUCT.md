# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary user is a small-business owner-operator doing their own bookkeeping — anywhere from one
business to several (e.g. a film-services company, a home inspection business, other ventures). A
single-business owner is a full, equally-served user, not an edge case: everything (income/expense
logging, receipts, contractor and client tracking, P&L, payroll) works the moment they add their first
business, and nothing in the product nags them to add a second. Multi-business support is real headroom
this product has that spreadsheets and single-tenant tools don't, not a requirement to use it. The app is
multi-tenant: anyone can sign up from the landing page and gets their own fully private ledger (own
businesses, categories, contractors, customers, transactions, employees, payroll) — there is no shared data between
accounts. The landing page is a real product pitch aimed at those signups, not just a private login
screen, and its messaging must read as true and inviting to a one-business owner first, with room-to-grow
for more as a supporting point — not the other way around.

## Product Purpose

Lets a small-business owner record income and expenses, attach receipts to expenses, track how much has been
paid to each contractor and received from each client, run payroll for W-2 employees (2026 federal and
Oklahoma withholding, pay stubs, ledger posting, 941/940/W-2 totals), and generate a Profit & Loss report —
without separate bookkeeping software or a spreadsheet. It scales cleanly from one business to several:
add a second business at any time and every report gains a combined-vs-single-business toggle for free,
with no migration, no new account, and no separate subscription per entity.

## Positioning

Generic accounting software (QuickBooks-style tools) is built around one company/tenant at a time; plain
spreadsheets require manual per-business upkeep and don't roll up cleanly. Solo Books treats "which
business" as just a field on every transaction — one login, one ledger, whether that ledger covers one
business today or several later, and a Profit & Loss report that either combines every business or
isolates any single one instantly. Businesses and categories are self-managed lists inside the app
(add/rename/deactivate), not hardcoded or requiring a code change or a separate account per entity. The
pitch to a one-business owner is the everyday bookkeeping itself — clean books, receipts, payroll
next to the ledger, a real P&L; the multi-business capability is the thing that's simply still there, unlocked and
free, the day they need it.

## Operating Context

Weekly manual-entry workflow: the owner sits down periodically and logs the week's transactions. Each
transaction is tagged to a business, a type (income/expense), and a category. Receipts (photos or PDFs)
attach to expenses via drag-and-drop for recordkeeping. P&L is pulled for a preset or custom date range,
viewed on screen, or exported as a clean PDF to hand to an accountant or keep for records.

## Capabilities and Constraints

- Public sign-up (Supabase Auth email/password) from the landing page, added when the app went
  multi-tenant. Every table carries an `owner_id` (defaults to `auth.uid()` on insert) and RLS scopes
  every read/write to `auth.uid() = owner_id`, so each account's data is fully isolated — proven by
  simulating a stranger's JWT against the database directly and confirming zero rows are visible across
  every table, alongside the original operator's data being completely unaffected. The landing page nav
  and hero both offer "Sign In" and "Get Started" (sign-up); the sign-in panel toggles between the two
  modes in place rather than being a separate page. If Supabase Auth email confirmation is enabled,
  sign-up shows a "check your email" notice instead of auto-logging in (session comes back null).
- Businesses and categories are both self-managed lists (add/rename/deactivate) inside the app, not
  hardcoded. Categories stay free text even with a managed suggestion list, so a one-off category is
  never blocked.
- Receipts are stored privately (not public) and viewed via short-lived signed URLs; attaching one
  supports drag-and-drop or click-to-browse.
- Reports page (in-app nav label "Reports", not "P&L Reports") holds two report types as tabs: Profit
  & Loss and Contractors. Both share the same combined/single-business scope and date-range presets
  (this month, last month, this quarter, YTD, last year, all time, custom) and both export as a PDF
  that lists which businesses are rolled into a combined report.
- Contractors and Clients each have their own top-level nav item (not tucked under Settings) and are both
  **per-business rosters** — every contractor/client belongs to exactly one business, and each page has a
  business selector. An expense's free-text "who this was paid to" field and an income's client field stay free
  text with suggestions (matching categories), scoped to the transaction's own business. The Contractor and
  Client reports aggregate by name text, so the same name used across two businesses is treated as one in a
  combined-scope report. Clients carry optional email/phone/address.
- **Removed, no longer part of the product**: Invoicing/quotes/Sales (unwired, tables left empty in the database)
  and SimpleFIN live bank feed (removed 2026-09-02, may return). Do not market either; the manual-upload Banking module below is different and is advertised.
- **Payroll (added 2026-11-11)**: per-business employee roster with W-4 and Oklahoma OK-W-4 setup; run payroll
  (hourly regular/overtime or salary) with optional bonuses taxed as supplemental wages (flat 22% federal /
  4.5% Oklahoma, or combined with regular pay; bonus-only runs use flat); 2026 IRS Pub. 15-T and OTC OW-2 tables,
  Social Security/Medicare/Additional Medicare, FUTA, SUTA from the user's own rate; pay-stub PDFs; gross wages
  and employer taxes post to the ledger as two expenses; Payroll report with quarterly 941/940 totals and W-2
  box totals. **Calculates and records only**: it does not pay anyone, deposit taxes, or file; Oklahoma only; no
  pre-tax deductions or garnishments yet; never stores SSNs or bank details.
- **Budget (added 2026-11-15)**: its own top-level module at /budget (not a Reports tab). Monthly spending limits and income
  targets per business and category, compared with the live ledger; copy-last-month, fill-from-3-month-average and
  apply-to-rest-of-year helpers; an all-businesses roll-up that is view-only. Table `budgets` (owner-scoped).
- **Banking (built 2026-11-15)**: its own module at /banking. Checking and savings accounts per business (name, optional last
  4 digits, opening balance as of a date); import a bank's CSV or OFX/QFX download (columns, date order and sign auto-detected and
  confirmable on a preview; overlapping statements are de-duplicated; each import can be undone). Each account has three tabs:
  **Lines** (searchable statement lines), **Review** (suggested matches between statement lines and ledger entries, one-to-one or
  group matches with a recorded difference, add-to-ledger, transfers between own accounts kept out of income/expense, ignore),
  and **Reconcile** (once a month: closing date + ending balance, difference must be $0.00 with nothing unreviewed, finishing
  locks the lines, only the latest month can be reopened). **Payroll auto-match**: net-pay lines and tax deposits (federal,
  Oklahoma, FUTA/SUTA, combined or spanning several runs) are recognized from the saved pay stubs and proposed for confirmation;
  never applied automatically. No bank login, no live connection, no full account numbers; only parsed lines are saved, never the
  file. Tables: bank_accounts, bank_transactions, bank_imports, bank_matches, bank_reconciliations.
- **Marketing (updated 2026-11-15)**: Budget and Banking are advertised on / and /features (new screenshots shot-budget, shot-banking,
  shot-reconcile in public/landing, light and dark, from sample data) and the payroll page mentions bank-line recognition. A
  new-user one-page PDF lives in docs/ (Solo-Books-Budget-and-Banking-Quick-Start.pdf, source .html next to it). The older shots
  (home, ledger, reports, payroll, payroll-report, mobile) were retaken 2026-11-15 with the new logo and the More folder; sample data is Riverside Landscaping / Northgate Consulting / Blue Harbor Coffee Co. and the Payroll shot's three employees reproduce the $5,924.85 net the home-page overlay card quotes.
- **Marketing pages (2026-11-16)**: home hero is now "Bookkeeping made easy." (many visitors don't know what a ledger is; marketing
  copy says "your records"/"your books" and defines "Ledger" once on /features). New pages /features/budgets (live sample with a
  slider) and /features/banking, linked from the header (NEW badges), footer, /features and the home page. The header's desktop nav
  switches to the menu below 1024px because five links no longer fit. The Banking page is deliberately NOT called "bank feeds":
  nothing connects to a bank, and it says so.
- **App shell (2026-11-16)**: the desktop sidebar is a collapsible drawer modeled on The Agency Dashboard's: open (208-340px, drag the
  right edge; default 240) or a 64px icon rail with hover name tags and a More popover; chevron or double-click on the edge toggles;
  width remembered in localStorage (solobooks-nav). The user block at the bottom (headshot or initials + name) opens Settings, whose
  first tab is Profile (headshot with drag/zoom cropper, name, theme, change password, sign out); Businesses and Categories follow.
  The phone header shows the headshot instead of the gear. The photo is a 320px JPEG in the private `avatars` bucket (one folder per
  user id, migration 0016), its path and the display name in auth user_metadata (avatar_path, full_name); shown via signed links.
- **Teams (built 2026-11-16, see supabase/migrations/0017_team_access.sql)**: several logins can share one business. Roles: owner (creator),
  admin (all + manage people), bookkeeper (everything incl. payroll, no people), view-only (read, no payroll/pay stubs, can't change
  anything). Access follows the business (business_id), not the creator; owner_id stays "created by". Join by invite link
  (business_invites.token, single use, 7 days; sign-up doesn't verify email so the secret link, not the address, grants access):
  Settings > Team creates it and api/send-invite.js emails it via Resend (needs RESEND_API_KEY in Vercel; without it the UI shows a
  copy-link fallback). /join/<token> works signed in or out (pending token kept in localStorage 'pendingInvite'). Categories can be
  shared per business (categories.business_id; a business with its own list uses only that list, else the person's personal list).
  Roles are enforced by RLS via readable/writable/managed_business_ids(); src/lib/access.tsx only hides what would fail. Privacy policy
  updated to say invited teammates can see a business's records.
- **AI connections / MCP (built 2026-11-17, migration 0018)**: a Model Context Protocol server at /api/mcp (Streamable HTTP, stateless) for Claude
  Code, the Claude and Grok (xAI) APIs and any MCP client, using a personal access token (`sb_` + 64 hex, shown once, stored hashed) made under
  Settings > AI connections (read-only or read+write, all or chosen businesses, optional expiry, revocable; max 20 active; 600 calls/hour/token).
  Design choice: NO service-role key. api/mcp.js holds only the anon key and forwards the token to two database functions (mcp_whoami, mcp_run);
  the tools live in Postgres (_mcp_* functions), scoped to the token owner's readable/writable businesses (so team roles apply; a view-only
  person's token can never write). Tools: list_businesses, list_categories, list_transactions, profit_and_loss, contractor_report,
  client_report, get_budget, list_bank_accounts, list_bank_lines, list_contractors, list_clients (read); add_transaction, update_transaction
  (matched entries keep date/type/amount), add_contractor, add_client, add_category, set_budget (write). No deletes; payroll/employee data never
  exposed; entries made are tagged transactions.source = 'ai:<token name>'. 401s deliberately omit OAuth discovery so Claude Code keeps using the
  static header. NOT built: OAuth, which claude.ai's website connectors need (they don't accept a static token); bank matching/reconciling by bots.
- **Planned next**: an optional live bank feed; auto-categorization rules; credit cards and loans are not supported yet.
- **Public site (rebuilt 2026-11-12)**: real pages at /, /features, /features/payroll, /security, /signin,
  /signup, /privacy, /terms with a light/dark toggle, a floating liquid-glass pill header, and a footer that
  ends in a full-width "SOLO BOOKS" wordmark. Sign-up is open, email confirmation off, password reset by email
  through Resend. Hosted at solobooks.latchpointstudios.com.
- Built with React + Vite + TypeScript + Tailwind v4 + Supabase (Postgres + Auth + Storage; one shared Supabase
  project hosts this app alongside two others), deployed on Vercel (project solo-books).

## Brand Commitments

Name is **Solo Books** (2026-09-11), renamed from "Sovereign Books" (2026-08-25), itself renamed from the
original "Business Ledger". "Solo" speaks to the owner-operator running their own books. The mark is a single clean S
(2026-11-12; it replaced the signet-seal S inside concentric rings), drawn from the outline of the wordmark face,
Libre Caslon Display, so the mark and the name read as one family. The favicon and phone icons are that S in
gold on near-black. Operated by Latchpoint Studios, LLC.

**Standing visual preference (2026-08-25)**: when offered a bespoke-tailoring
concept direction ("Cut to Measure") for the third landing-page world in one day, the user said "play it
straight" — the category-standard premium-fintech look, executed at full craft, no governing metaphor.
**Re-confirmed 2026-11-12**: black, white and gold, with a light/dark toggle, a floating liquid-glass pill
header, and a giant bottom wordmark; the footer and Payroll band stay black in both themes. Craft bar named
explicitly: **Mercury, Ramp, Brex** (dark, precise, restrained SaaS polish — not a
literal object/place metaphor like the two prior worlds). Future landing-page work should default to
this canon register rather than proposing another concept-driven world, unless the user asks otherwise.

## Evidence on Hand

Real screenshots of the current app (Ledger, Reports, Payroll run, Payroll report, mobile Home and Payroll), in
light and dark, are captured into public/landing/shot-*.jpg from the running app with mocked, synthetic data
(placeholder businesses, employees and round-number amounts, never the owner's real data). The public site's
payroll demo runs the app's real calculator on a made-up employee and is labeled as a sample. No existing customer testimonials, press mentions, or case studies exist and none
should be fabricated.

## Product Principles

1. One login, every business — no per-entity account setup or context-switching.
2. Reports roll up or drill down instantly — combined P&L and single-business P&L are the same click.
3. Free text where it matters — categories and business names are typed, not locked to a fixed schema.
4. Private by default — single-user auth, private receipt storage, no public data exposure.
5. Built for a weekly ritual, not daily babysitting — designed around periodic batch entry, not
   obsessive real-time tracking.
