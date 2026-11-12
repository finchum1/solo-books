export interface NavItem {
  to: string
  label: string
  end: boolean
  /**
   * On a phone the bottom bar holds at most five tabs, so these destinations sit behind
   * a "More" tab instead of getting their own. The desktop sidebar ignores this.
   */
  moreOnMobile?: boolean
}

export const NAV: NavItem[] = [
  { to: '/', label: 'Home', end: true },
  { to: '/ledger', label: 'Ledger', end: false },
  { to: '/contractors', label: 'Contractors', end: false, moreOnMobile: true },
  { to: '/clients', label: 'Clients', end: false, moreOnMobile: true },
  { to: '/payroll', label: 'Payroll', end: false },
  { to: '/reports', label: 'Reports', end: false },
]
