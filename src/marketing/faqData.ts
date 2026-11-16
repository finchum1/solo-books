/**
 * Every question on the public site lives here once, so the full FAQ page, the home page and each feature page say the same thing.
 * Answers are plain text. Keep them true to what the app does today (see PRODUCT.md): no promises about things that are not built.
 */
export interface Faq {
  q: string
  a: string
  link?: { to: string; label: string }
}

export const FAQ: Record<string, Faq> = {
  what: {
    q: 'What is Solo Books?',
    a: 'Bookkeeping for people who run their own business. You record what comes in and goes out, keep receipts, set budgets, bring in your bank statements and check them each month, run payroll for your employees, and pull reports. It all lives in one private account, whether you run one business or several.',
    link: { to: '/features', label: 'See everything it does' },
  },
  notAccountant: {
    q: 'I’m not an accountant. Is this for me?',
    a: 'Yes, that is exactly who it is for. You don’t need to know debits and credits: you record what you earned and what you spent, and Solo Books does the adding up. If you work with an accountant, the PDF reports give them what they need.',
  },
  ledger: {
    q: 'What is a ledger?',
    a: 'It’s just the running list of everything your business earns and spends. In Solo Books each entry has a date, a business, a category and an amount, plus an optional note, receipt, contractor or client.',
  },
  multiple: {
    q: 'Can I run more than one business?',
    a: 'Yes. Add as many as you need to one login. Each has its own books, and every report can show one business or all of them combined.',
  },
  phone: {
    q: 'Does it work on my phone?',
    a: 'Yes. Open it in any phone browser and add it to your home screen, and it runs full screen like an app. It isn’t an App Store download, and it doesn’t keep your financial data on the phone for offline use.',
  },
  bank: {
    q: 'Does Solo Books connect to my bank?',
    a: 'No, and that’s on purpose. You download a statement file from your bank’s website and upload it. Solo Books never asks for your online banking login, so there is no bank password for it to lose.',
    link: { to: '/features/banking', label: 'How banking works' },
  },
  files: {
    q: 'Which statement files can I upload?',
    a: 'CSV, OFX and QFX files, which almost every bank offers under “Download transactions” or “Export”. Solo Books works out which column is which and shows you a preview before anything is saved.',
  },
  fileKept: {
    q: 'What happens to the statement file I upload?',
    a: 'Only each transaction’s date, amount and description are saved. The file itself is never kept.',
  },
  reconcile: {
    q: 'What does “reconcile” mean?',
    a: 'It means proving your books match your bank. Once a month you enter the statement’s ending balance, and Solo Books adds up your reviewed transactions and shows the difference. When it’s $0.00, you finish the month and its lines are locked so they can’t change by accident.',
  },
  difference: {
    q: 'What if the difference isn’t $0.00?',
    a: 'You can’t finish the month until it is, which is the point. Solo Books points you to the usual causes: a transaction that is missing, one that appears twice, a wrong amount, or a mistyped balance. Fix it and the number updates.',
  },
  undoBank: {
    q: 'Can I undo an import or fix a month I already finished?',
    a: 'You can undo an import until you start reviewing its lines. A finished month can be reopened (the most recent one first), changed, and finished again.',
  },
  liveFeed: {
    q: 'Will my bank transactions come in automatically?',
    a: 'Not today. Statements are uploaded, usually once a month. Nothing connects to your bank in the background.',
  },
  budget: {
    q: 'How do budgets work?',
    a: 'You set a monthly limit for each spending category and a target for each kind of income. Solo Books compares them with what you’ve recorded and shows a bar for each: green while you’re under 85% of the limit, gold when you’re close, red when you’re over. It also offers shortcuts: copy last month, fill blanks from your 3-month average, or carry a month through the rest of the year.',
    link: { to: '/features/budgets', label: 'How budgets work' },
  },
  budgetBusiness: {
    q: 'Can I budget for more than one business?',
    a: 'Yes. Each business has its own budget for each month. A combined “all businesses” view lets you see them together, and it is view-only so a number can’t be changed by accident.',
  },
  budgetAlerts: {
    q: 'Will it warn me or stop me when I’m over budget?',
    a: 'It shows you, but it doesn’t send alerts or block anything. The bars update as you record transactions, so you see where you stand whenever you open the page.',
  },
  budgetBank: {
    q: 'Do imported bank lines count toward my budget?',
    a: 'Budgets are measured against your records, so a bank line counts once it is in them. Matching a line to an entry you already made, or adding it with one click, puts it there.',
  },
  payrollDoes: {
    q: 'Does Solo Books pay my employees and file my payroll taxes?',
    a: 'No. It works out the withholding and employer taxes, writes the pay stubs, and records the cost in your books. You pay your people, make the tax deposits and file your returns yourself, using the totals it gives you.',
    link: { to: '/features/payroll', label: 'How payroll works' },
  },
  payrollStates: {
    q: 'Which states does payroll support?',
    a: 'Oklahoma employers for now, using the 2026 IRS and Oklahoma Tax Commission tables. Other states aren’t built yet.',
  },
  payrollBonus: {
    q: 'Can it handle bonuses?',
    a: 'Yes. Bonuses are taxed correctly for Social Security and Medicare, and for income tax you choose per payroll: a flat rate on the bonus alone, or combined with the regular paycheck.',
  },
  payrollDeductions: {
    q: 'What about 401(k), health premiums or garnishments?',
    a: 'Not yet. Payroll today covers pay, bonuses, and the standard federal and Oklahoma withholding and employer taxes. It doesn’t handle pre-tax deductions or garnishments, so ask a payroll professional if you need those.',
  },
  payrollForms: {
    q: 'Does it produce Forms 941, 940, W-2 and 1099?',
    a: 'It gives you the totals to fill them in: quarterly figures for Forms 941 and 940, and each employee’s yearly W-2 box totals. It doesn’t create or file the IRS forms. The contractor report totals what you paid each contractor, which helps with 1099s, but it doesn’t produce them.',
  },
  payrollBank: {
    q: 'How do payroll payments show up when I import my bank statement?',
    a: 'Solo Books knows the exact amounts from your pay stubs, so it recognizes each employee’s net-pay line and the tax deposits that come later, even one deposit covering several payrolls, and suggests the match. You confirm each one. It never matches anything on its own.',
  },
  team: {
    q: 'Can my bookkeeper or team use it?',
    a: 'Yes. Invite people to a business by email. They sign in with their own account, and you choose what each can do: an Admin can also add and remove people, a Bookkeeper can do all the bookkeeping, and a View-only person can read the books but can’t change anything or see payroll. You can change or remove anyone at any time.',
  },
  teamPrivate: {
    q: 'Can someone I invite see my other businesses?',
    a: 'No. A person sees only the businesses they were invited to, and everything else in your account stays private to you.',
  },
  ai: {
    q: 'Can I connect Claude, Grok or another AI to my books?',
    a: 'Yes. Under Settings, AI connections, you make an access key for an AI app. You choose read-only or read and write, which businesses it may use, and when it expires, and you can revoke it at any time. It can only do what you can do, nothing can be deleted, and payroll is never available to it. It works with Claude Code and the Claude and Grok APIs, and with other apps that support MCP. Claude’s own website connectors aren’t supported yet.',
  },
  private: {
    q: 'Is my data private?',
    a: 'Each account’s records are kept separate by rules enforced in the database itself, not just in the app. Receipts are stored privately and open only through a short-lived link for your signed-in account. The only people who can see a business are the ones you invite to it.',
    link: { to: '/security', label: 'Read how we protect your data' },
  },
  sell: {
    q: 'Do you sell my data or use it to train AI?',
    a: 'No. Your information is used only to run the app for you. We don’t sell it, use it for advertising, share it with data brokers, or use it to train AI models.',
    link: { to: '/privacy', label: 'Privacy Policy' },
  },
  sensitive: {
    q: 'Does it store my bank password, Social Security numbers or card numbers?',
    a: 'No. The app has no fields for them and never asks for them. Please keep them out of notes and descriptions too.',
  },
  delete: {
    q: 'Can I delete my account and my data?',
    a: 'You can edit or delete your businesses, transactions, contractors, clients, employees and payroll runs yourself. To delete the whole account, email us from the address on it and we’ll remove it and the data tied to it. Download any payroll PDFs you need first, because employers are often required to keep those records.',
  },
  export: {
    q: 'Can I get my records out?',
    a: 'Yes. Profit & Loss, contractor, client and payroll reports, and pay stubs, all export as clean PDFs you can keep or hand to an accountant.',
  },
  help: {
    q: 'How do I get help?',
    a: 'Email terrence@latchpointstudios.com and a real person will reply. Solo Books is built and run by Latchpoint Studios, LLC.',
  },
}

export interface FaqGroup {
  id: string
  title: string
  blurb: string
  items: string[]
}

/** The full /faq page, grouped by what people are trying to find out. */
export const GROUPS: FaqGroup[] = [
  { id: 'basics', title: 'The basics', blurb: 'What it is and who it’s for.', items: ['what', 'notAccountant', 'ledger', 'multiple', 'phone', 'export'] },
  { id: 'banking', title: 'Bank statements and reconciling', blurb: 'Bringing your bank in without handing over a login.', items: ['bank', 'files', 'fileKept', 'reconcile', 'difference', 'undoBank', 'liveFeed'] },
  { id: 'budgets', title: 'Budgets', blurb: 'Planning the month and watching it.', items: ['budget', 'budgetBusiness', 'budgetAlerts', 'budgetBank'] },
  { id: 'payroll', title: 'Payroll', blurb: 'What it does for your W-2 employees, and what it doesn’t.', items: ['payrollDoes', 'payrollStates', 'payrollBonus', 'payrollDeductions', 'payrollForms', 'payrollBank'] },
  { id: 'teams', title: 'Teams and AI', blurb: 'Working with other people, and with AI.', items: ['team', 'teamPrivate', 'ai'] },
  { id: 'privacy', title: 'Privacy and your data', blurb: 'Who can see it and how to take it back.', items: ['private', 'sell', 'sensitive', 'delete', 'help'] },
]

export const pick = (ids: string[]): Faq[] => ids.map((id) => FAQ[id])
