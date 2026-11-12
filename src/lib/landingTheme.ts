// Palette for the public marketing site (landing, features, payroll, security,
// sign-in/sign-up, privacy/terms). Black, white and one champagne gold.
//
// Every value is a CSS custom property, not a hex: the site has a light and a
// dark theme (the same toggle as the app, see lib/theme.ts), and the tokens
// themselves are defined in index.css -- light on :root, dark under `.dark`,
// and always-dark under `.mk-dark` for the regions that stay black in both
// themes (the Payroll band and the footer). Components read `panel.*` in
// inline styles exactly as before, so nothing else needed to change.
//
// The app's own Tailwind tokens (index.css @theme) are a separate system that
// derives from the same gold hex.
export const panel = {
  bgDeep: 'var(--mk-bg-deep)', // page ground
  bg: 'var(--mk-bg)', // alternate band ground
  bgRaised: 'var(--mk-raised)', // cards, frames
  bgRaised2: 'var(--mk-raised2)', // inputs, wells
  ink: 'var(--mk-ink)',
  inkDim: 'var(--mk-dim)',
  gold: 'var(--mk-gold)', // fills: buttons, marks (same in both themes)
  goldBright: 'var(--mk-gold-bright)',
  goldDim: 'var(--mk-gold-dim)',
  goldText: 'var(--mk-gold-text)', // gold used AS text/links: deepened on white for contrast
  income: 'var(--mk-income)',
  incomeDim: 'var(--mk-income-dim)',
  expense: 'var(--mk-expense)',
  expenseDim: 'var(--mk-expense-dim)',
  border: 'var(--mk-border)',
  borderStrong: 'var(--mk-border-strong)',
  onGold: '#0a0b0d', // text on a gold fill, both themes
} as const
