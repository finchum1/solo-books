---
name: Solo Books
description: Black, white and one champagne gold; a calm private ledger for people who run their own businesses, with a light and a dark theme.
colors:
  gold: "#cbb078"
  gold-text-on-white: "#85692f"
  gold-bright-light: "#b8995a"
  gold-bright-dark: "#e2cb97"
  on-gold: "#0a0b0d"
  ink-light: "#0a0b0d"
  ink-dim-light: "#585a61"
  page-light: "#ffffff"
  band-light: "#f6f6f4"
  raised-light: "#ffffff"
  well-light: "#efefec"
  ink-dark: "#f5f4f0"
  ink-dim-dark: "#a0a2a9"
  page-dark: "#07080a"
  band-dark: "#0c0d10"
  raised-dark: "#14161a"
  well-dark: "#1b1e23"
  income-light: "#047857"
  income-dark: "#34d399"
  expense-light: "#b91c1c"
  expense-dark: "#f87171"
typography:
  display:
    fontFamily: "Hanken Grotesk, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "clamp(2.5rem, 6.2vw, 5rem)"
    fontWeight: 600
    lineHeight: 1.02
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Hanken Grotesk, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "clamp(1.9rem, 4vw, 3.1rem)"
    fontWeight: 600
    lineHeight: 1.06
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Hanken Grotesk, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "1.25rem to 1.5rem"
    fontWeight: 600
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Hanken Grotesk, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "16px to 17px"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "Hanken Grotesk, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "14px to 15px"
    fontWeight: 500
  figure:
    fontFamily: "Hanken Grotesk, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "1.25rem to 2.25rem"
    fontWeight: 600
    fontFeature: "tabular-nums"
rounded:
  xl: "12px"
  2xl: "16px"
  3xl: "24px"
  full: "9999px"
spacing:
  gutter: "20px"
  gutter-sm: "32px"
  band: "96px"
  band-lg: "128px"
components:
  button-primary:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.on-gold}"
    rounded: "{rounded.full}"
    padding: "12px 24px"
  button-outline:
    textColor: "{colors.ink-light}"
    rounded: "{rounded.full}"
    padding: "12px 24px"
  button-ghost:
    textColor: "{colors.ink-light}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
  surface:
    backgroundColor: "{colors.raised-light}"
    rounded: "{rounded.3xl}"
  input:
    backgroundColor: "{colors.well-light}"
    textColor: "{colors.ink-light}"
    rounded: "{rounded.xl}"
    padding: "12px 16px"
  browser-frame:
    backgroundColor: "{colors.raised-light}"
    rounded: "{rounded.2xl}"
---

# Design System: Solo Books

## Overview

**Creative North Star: "The Quiet Ledger"**

The public site is a calm, black-and-white page with a single metal in it. Gold is the only color; everything else is ink, paper and the real product. It reads as a serious financial tool for someone who runs their own books, not a startup toy: one typeface, hairline borders, large type, real screenshots of the app and a live payroll calculator in place of illustration. It follows the app's own light/dark toggle (the `html.dark` class, `lib/theme.ts`), so the visitor's theme carries from the app to the site and back.

Depth comes from one idea, liquid glass: a floating pill header that refracts the page beneath it, and the gold light-leaks at the top of each hero that give it something to refract. The page closes on the product name set edge to edge in flat gold on black. Nothing else glows, blurs or floats.

**Key Characteristics:**
- Black, white and gold only; gold carries all emphasis. Green and red appear solely as money signs.
- Light and dark themes from the same tokens; the footer and Payroll band stay black in both.
- Hanken Grotesk for all reading and figures; Libre Caslon Display for the name only. Tight tracking on large type, tabular figures for money.
- Liquid glass reserved for the header pill and one hero chip.
- Real product evidence: theme-following app screenshots and a payroll demo that runs the app's calculator.
- Headings stand alone; no labels, kickers or eyebrows above them.

## Colors

A monochrome field with one champagne gold. Tokens are CSS variables (`--mk-*`) on `:root` (light), `.dark` (dark) and `.mk-dark` (always black); components read them through `panel.*` in `lib/landingTheme.ts`.

### Primary
- **Champagne Gold** (#cbb078): the only accent, identical in both themes. Used as fill: primary buttons, the BrandMark, check chips, the footer wordmark, focus rings, selected-row dots, the hero light-leaks (at 40% light / 26% dark alpha).
- **Library Brass** (#85692f, `--mk-gold-text`): gold used AS text or a link on white, deepened to pass contrast. On black regions `--mk-gold-text` resolves back to #cbb078.
- **Gold Highlight** (#b8995a light, #e2cb97 dark, `--mk-gold-bright`): hover/brightened gold.

### Neutral
- **Ink** (#0a0b0d light, #f5f4f0 dark): headings and primary text. Also the text color on gold fills in both themes.
- **Dim Ink** (#585a61 light, #a0a2a9 dark): running copy, captions, secondary rows.
- **Paper / Void** (#ffffff light, #07080a dark): page ground (`--mk-bg-deep`).
- **Band** (#f6f6f4 light, #0c0d10 dark): alternate section ground.
- **Raised** (#ffffff light, #14161a dark): cards, frames. **Well** (#efefec light, #1b1e23 dark): inputs and chips inside a card.
- **Hairlines**: ink at 10% (light) or white at 9% (dark) for borders; 18% / 16% for strong borders.

### Semantic
- **Income green** (#047857 light, #34d399 dark) and **Expense red** (#b91c1c light, #f87171 dark): money figures only, never decoration.

### Named Rules
**The One Metal Rule.** Gold is the only chromatic color on the site. No second accent, no gradient text, no gold-to-anything gradient on type.

**The Brass On White Rule.** Gold as a fill is #cbb078 everywhere; gold as text or link on a light ground is #85692f. Never set #cbb078 text on white.

**The Black Stays Black Rule.** The footer and the Payroll band carry `.mk-dark` and are black in both themes. The header pill flips to the dark token set while it overlaps them (detected by `data-mk-band` on those regions), so its glass, mark and links keep contrast.

## Typography

**Display / Body / Label Font:** Hanken Grotesk (with system-ui, Segoe UI, Roboto, sans-serif), weights 400 to 800, for every headline, paragraph, label and figure.

**Brand Font:** Libre Caslon Display (400 only, with Iowan Old Style, Palatino and Georgia fallbacks), used for the name and nothing else: the header and footer "Solo Books", the app sidebar and mobile header, the reset screen, and the giant footer wordmark. It has a single weight, so it is never set bold (the browser would fake it). Chosen by the user from ten candidates for being the most elegant; its hairline serifs make it a name-only face, never body or UI text. Token: `brandFont` in `lib/landingTheme.ts`, `font-brand` in Tailwind. The S mark (`BrandMark`) is the same face's S, thickened with a 40-unit round-joined stroke because the face's hairlines vanish when small; the favicon and phone icons use a heavier stroke still. Do not remove the stroke.

**Character:** Confident and plain. Weight and size do the hierarchy; large type is tightened, body is relaxed. Money is set in the same sans with tabular numerals, never a mono costume.

### Hierarchy
- **Display** (600, clamp(2.5rem, 6.2vw, 5rem), 1.02, -0.035em): page H1, balanced wrap.
- **Headline** (600, clamp(1.9rem, 4vw, 3.1rem), 1.06, -0.03em): section H2.
- **Title** (600, 20px / 24px at sm, tight tracking): H3 inside cards and tiles.
- **Body** (400, 16px / 17px at sm, 1.625, dim ink): running copy at a 62ch maximum.
- **Label** (500, 14 to 15px): nav, buttons, row names, captions at 12 to 14px dim ink.
- **Figure** (600, tabular-nums, 20 to 36px): totals and net pay.
- **Wordmark** (Libre Caslon Display 400, tracking +2 at size 100, SVG): the footer's SOLO BOOKS only.

### Named Rules
**The Tabular Money Rule.** Every dollar amount uses tabular numerals (`tabular-nums`) so columns and tickers do not jitter.

**The Headings Stand Alone Rule.** No small uppercase label, kicker, eyebrow or pill sits above a heading. The heading is the first thing in its block.

## Layout

Single-column centered pages built from full-bleed bands on a `max-w-6xl` container (`Wrap`; `max-w-5xl` for hero shots, `max-w-4xl` for the header and hero copy, `max-w-3xl` for section intros) with 20px gutters, 32px from sm. Bands are separated by 96px vertical padding (128px from sm), alternating page ground and Band ground, with one black band. Feature tiles sit on a 6-column grid at lg (4+2 and 2+4 splits), one column below. Hero copy is centered under a 128 to 176px top pad that clears the floating header. Screenshots may bleed off a tile's bottom-right edge. Pages: `/`, `/features`, `/features/payroll`, `/security`, `/signin`, `/signup`, `/privacy`, `/terms`.

## Elevation & Depth

Hybrid: hairline-bordered flat surfaces for content, glass for the one floating layer, and soft large-radius shadows only under product frames and the primary button.

### Shadow Vocabulary
- **Hairline** (`box-shadow: 0 0 0 1px var(--mk-border)`): every Surface and BrowserFrame edge instead of a CSS border.
- **Frame lift** (`--mk-frame-shadow`: `0 40px 80px -30px rgba(10,11,13,0.35)` light, `0 50px 90px -30px rgba(0,0,0,0.8)` dark): app screenshots in BrowserFrame and the interactive demo card.
- **Gold button glow** (`0 1px 0 rgba(255,255,255,0.45) inset, 0 8px 22px -8px rgba(203,176,120,0.55)`): primary button only.
- **Glass** (`.mk-glass`): `backdrop-filter: blur(24px) saturate(1.9) brightness(1.04)`, a 135deg fill gradient from `--mk-glass-fill-a` to `-b`, a 1px edge, a lit top edge (`inset 0 1px 0 --mk-glass-lit`), and a `::before` sheen: a 120px radial highlight following the pointer (`--mx`, `--my`) over a diagonal specular streak. Falls back to a solid raised pane without backdrop-filter.
- **Focus ring**: 2px gold outline, 3px offset, on `.mk-root :focus-visible`; inputs get a 3px gold 40% halo.

### Named Rules
**The One Glass Rule.** Glass is for the floating header pill (and its mobile menu) and the single hero "Payroll recorded" chip. Not cards, not tiles, not modals.

**The Light-Leak Rule.** Each hero carries two soft gold radial leaks at the top (`HeroGlow`, `--mk-glow`) so the glass has something to refract. They are atmosphere at the top edge, not a background pattern for the rest of the page.

## Shapes

Round and soft against a precise grid. Buttons, the header pill, chips and the theme toggle are fully round (9999px). Content surfaces are 24px (`rounded-3xl`); browser frames and floating chips 16px; inputs, list rows and wells 12px. Surfaces are never nested. Dividers are 1px hairlines; the dashed 1.5px "+ Add a business" well is the only dashed edge. Icons are inline SVG strokes (2 to 2.4px, round caps).

## Components

### Buttons
- **Shape:** pill (9999px), 97% scale on press, 200ms transitions.
- **Primary:** Champagne Gold fill, ink text, gold glow. Sizes: sm 16x8, md 24x12 (15px text), lg 32x16 (16px text). Hover brightens 5%.
- **Outline:** transparent, 1px inset strong hairline, ink text; hover tints ink at 7%.
- **Ghost:** ink text only; same hover tint. Used for Sign in.

### Navigation
The floating glass pill header: 56px tall, max 896px wide, 12px from the top, mark and "Solo Books" at left, Features / Payroll / Security centered, theme toggle (sun/moon rotate swap), Sign in and Get started at right. Active link is Library Brass. Below md, links collapse into a hamburger opening a glass panel. Signed-in visitors see "Open app". **It is not a pill at the top of the page**: at scroll 0 it is a plain bar (no glass, no border) as wide as the page content (max 1152px) and aligned to the page gutters; once the page scrolls past 12px the bar condenses to the 896px glass pill (width and padding transition over 650ms, the glass layer fades in over 500ms) and returns to a plain bar at the top.

### Surfaces and Browser Frame
Surface: Raised ground, 24px radius, hairline edge, 24 to 40px padding. BrowserFrame: 16px radius, hairline plus frame lift, with a strip of three neutral dots over a real screenshot.

### Inputs / Fields
`.sb-input`: 12px radius, well ground, 1px inset hairline, 12x16 padding, 15px text. Focus: strong hairline plus 3px gold 40% halo. Used on sign-in, sign-up and reset password.

### Screenshots (Shot)
Real app captures that follow the page theme: `/landing/shot-{name}-{dark|light}.jpg` (home, ledger, reports, payroll, payroll-report, mobile-home, mobile-payroll), swapped live via a `useIsDark` observer on `<html>`. Meaningful alt text; first-viewport shot loads eagerly.

### Live Payroll Demo (PayrollSample)
A made-up employee run through the app's own payroll calculator, shown with tabular figures; evidence of the product rather than an illustration. Lives in the black Payroll band and on the Payroll feature page.

### Footer and Wordmark
Always black. Gold hairline across the top, four-column link grid, then SOLO BOOKS as an SVG wordmark (`FitWordmark`): 400 weight (Libre Caslon Display), flat gold, measured to its ink bounds with canvas `measureText` after the font loads, pinned by `textLength`, spanning edge to edge (gutter clamp(10px, 1.6vw, 28px)) with the baseline resting on the bottom edge. It rises 34% and fades in once on view. The wordmark carries one looping motion made of two things in step (4.4s loop): nine separate SVG `<text>` letters each rise 9 units (about 18px at desktop) and settle, one after the next left to right (0.26s stagger), while a band of near-white gold (#fff5d0 core, deeper gold #b79852 shoulders) sweeps across and a soft halo rides with it, two blurred copies of the letters (std deviation 2.4 and 8, filled with a gradient that is transparent everywhere except under the light, peak opacity about 0.78) so the halo jumps with the letters. The halo is deliberately a little softer than the first version of this effect, per the user. All gradients slide with identical SMIL `animateTransform` timing. At rest the letters are the brand gold. Letter positions are measured from the font with canvas `measureText` prefix widths so kerning is kept. With `prefers-reduced-motion` it renders the single flat-gold static text with no halo and does not move. This is the page's single looping animation. The user asked for the jumping letters to come back after trying a glow-only version; do not remove them.

### Interactive Row (RowDot, TickerTotal)
Selectable business rows with a gold-filled 18px dot and digit-climbing totals; select to isolate, select again to restore.

### Motion
`Reveal`: fade and rise 22px once, 0.7s on ease `cubic-bezier(0.16, 1, 0.3, 1)`, triggered 10% inside the viewport. Hero copy and shot rise on load; the hero chip scales in at 0.9s. `prefers-reduced-motion` collapses transitions to near-zero.

## Do's and Don'ts

### Do:
- **Do** keep gold as the single accent: #cbb078 for fills, #85692f for gold text on white, via `panel.*` variables, never hard-coded hex.
- **Do** build every new page from `MarketingShell`, `Wrap`, `H1`/`H2`/`H3`/`P`, `Surface`, `MkLink` and `Reveal`.
- **Do** let heading and copy start every block; put context in the heading or the paragraph.
- **Do** use `DarkBand` for the one black band and keep the footer black in both themes.
- **Do** show real product: `Shot` captures in both themes, or a demo that runs the real calculator, labeled "sample data" when made up.
- **Do** set every money value with `tabular-nums`; use green and red only for income and expense.
- **Do** use `.mk-glass` only on the header pill and the one hero chip, over a `HeroGlow` hero.
- **Do** use hairline `0 0 0 1px` edges instead of borders and keep radii to 12 / 16 / 24 / full.

### Don't:
- **Don't** put a label, kicker, eyebrow or pill above a heading. A finish review removed a "NEW" pill that did exactly this.
- **Don't** use gradient text, or a second accent color.
- **Don't** use glass on cards, tiles, modals or footers.
- **Don't** make the footer or Payroll band follow the light theme; black stays black.
- **Don't** set #cbb078 as text on a white ground.
- **Don't** nest Surfaces or add side-stripe accent borders.
- **Don't** add display faces, a mono costume for numbers, or glyph/emoji icons; icons are inline SVG.
- **Don't** invent testimonials, logos or invented metrics; sample data is labeled as sample.
- **Don't** reuse the small "New" badge on the Payroll nav link as a decoration. It is a deliberate, single status marker for the newest module (it sits on a nav item, not above a heading) and should be removed once Payroll is no longer new.
