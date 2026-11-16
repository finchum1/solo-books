export interface NavItem {
  to: string
  label: string
  end: boolean
  /**
   * On a phone the bottom bar holds at most five tabs, so these destinations sit behind
   * a "More" tab instead of getting their own. The desktop sidebar ignores this.
   */
  moreOnMobile?: boolean
  /**
   * On the desktop sidebar these sit inside a collapsible "More" folder at the bottom of the
   * list instead of being top-level. The phone bar ignores this (it uses moreOnMobile).
   */
  inMoreFolder?: boolean
}

export const NAV: NavItem[] = [
  { to: '/', label: 'Home', end: true },
  { to: '/ledger', label: 'Ledger', end: false },
  { to: '/budget', label: 'Budget', end: false, moreOnMobile: true },
  { to: '/contractors', label: 'Contractors', end: false, moreOnMobile: true, inMoreFolder: true },
  { to: '/clients', label: 'Clients', end: false, moreOnMobile: true, inMoreFolder: true },
  { to: '/payroll', label: 'Payroll', end: false },
  { to: '/reports', label: 'Reports', end: false },
]
