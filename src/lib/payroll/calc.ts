import {
  ADDITIONAL_MEDICARE_RATE,
  ADDITIONAL_MEDICARE_THRESHOLD,
  FEDERAL_STANDARD,
  FEDERAL_STEP2_CHECKED,
  FEDERAL_STEP_1G,
  FUTA_RATE,
  FUTA_WAGE_BASE,
  MEDICARE_RATE,
  OKLAHOMA_ALLOWANCE,
  OKLAHOMA_TABLES,
  PAY_PERIODS,
  SOCIAL_SECURITY_RATE,
  SOCIAL_SECURITY_WAGE_BASE,
  SUPPLEMENTAL_FEDERAL_HIGH_RATE,
  SUPPLEMENTAL_FEDERAL_HIGH_THRESHOLD,
  SUPPLEMENTAL_FEDERAL_RATE,
  SUPPLEMENTAL_OKLAHOMA_RATE,
} from './taxTables'
import type { BonusMethod, FederalFilingStatus, OklahomaFilingStatus, PayFrequency } from './taxTables'

const cents = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

/** Everything the calculator needs to know about an employee's tax setup. */
export interface TaxProfile {
  payFrequency: PayFrequency
  federalFilingStatus: FederalFilingStatus
  /** W-4 Step 2 box checked (multiple jobs / working spouse). */
  w4Step2Checked: boolean
  /** W-4 Step 3: annual dollar amount of credits (dependents etc.). */
  w4Step3Credits: number
  /** W-4 Step 4(a): other income, annual. */
  w4Step4aOtherIncome: number
  /** W-4 Step 4(b): deductions, annual. */
  w4Step4bDeductions: number
  /** W-4 Step 4(c): extra withholding, per pay period. */
  w4Step4cExtra: number
  oklahomaFilingStatus: OklahomaFilingStatus
  oklahomaAllowances: number
}

/** Wages already paid to this employee earlier in the same calendar year. */
export interface YearToDate {
  /** Gross wages incl. bonuses (all taxable for Social Security / Medicare in v1 -- no pre-tax deductions yet). */
  wages: number
  /** Bonuses (supplemental wages) already paid this year -- only matters for the $1M mandatory-37% rule. */
  supplementalWages: number
}

export interface BusinessTaxRates {
  /** State unemployment tax rate for the employer, as a fraction (0.015 = 1.5%). */
  sutaRate: number
  sutaWageBase: number
}

export interface PayStubTaxes {
  federalWithholding: number
  socialSecurityEmployee: number
  medicareEmployee: number
  additionalMedicare: number
  stateWithholding: number
  socialSecurityEmployer: number
  medicareEmployer: number
  futa: number
  suta: number
}

export interface PayStubResult extends PayStubTaxes {
  /** Regular pay plus bonus. */
  gross: number
  bonus: number
  /** The method actually applied to the bonus ('flat' is forced when there is no regular pay to aggregate with). */
  bonusMethodUsed: BonusMethod | null
  totalEmployeeDeductions: number
  net: number
  totalEmployerTaxes: number
}

/** Annual tentative withholding from the 15-T annual table, deriving each row's base cumulatively. */
function federalTentativeTax(adjustedAnnualWage: number, brackets: { over: number; rate: number }[]): number {
  let tax = 0
  for (let i = 0; i < brackets.length; i++) {
    const lower = brackets[i].over
    const upper = i + 1 < brackets.length ? brackets[i + 1].over : Infinity
    if (adjustedAnnualWage <= lower) break
    tax += (Math.min(adjustedAnnualWage, upper) - lower) * brackets[i].rate
  }
  return tax
}

/** IRS Pub. 15-T (2026) Worksheet 1A, percentage method for automated payroll systems (W-4 from 2020 or later). */
export function federalWithholding(gross: number, p: TaxProfile): number {
  const periods = PAY_PERIODS[p.payFrequency]
  const annualWages = gross * periods // 1c
  const line1g = p.w4Step2Checked ? 0 : FEDERAL_STEP_1G[p.federalFilingStatus]
  const adjusted = Math.max(0, annualWages + p.w4Step4aOtherIncome - (p.w4Step4bDeductions + line1g)) // 1i
  const table = p.w4Step2Checked ? FEDERAL_STEP2_CHECKED : FEDERAL_STANDARD
  const tentativePerPeriod = federalTentativeTax(adjusted, table[p.federalFilingStatus]) / periods // 2h
  const afterCredits = Math.max(0, tentativePerPeriod - p.w4Step3Credits / periods) // 3c
  return cents(afterCredits + p.w4Step4cExtra) // 4b
}

/** OTC Packet OW-2 (2026) percentage formula method. Rounded to whole dollars as the OTC requires. */
export function oklahomaWithholding(gross: number, p: TaxProfile): number {
  const allowance = OKLAHOMA_ALLOWANCE[p.payFrequency] * p.oklahomaAllowances
  const net = Math.max(0, gross - allowance)
  const useMarried = p.oklahomaFilingStatus === 'married'
  const rows = OKLAHOMA_TABLES[p.payFrequency][useMarried ? 'married' : 'single']
  let row = rows[0]
  for (const r of rows) if (net >= r.over) row = r
  const tax = row.base + (net - row.over) * row.rate
  // "Round to the nearest whole dollar by dropping any amount under 50 cents and
  // increasing amounts from 50 to 99 cents to the next higher dollar."
  return Math.round(tax + 1e-9)
}

/** Flat federal withholding on a bonus: 22%, or 37% on the part of the year's supplemental wages above $1M. */
export function federalFlatBonusWithholding(bonus: number, ytdSupplemental: number): number {
  const over =
    Math.max(0, ytdSupplemental + bonus - SUPPLEMENTAL_FEDERAL_HIGH_THRESHOLD) -
    Math.max(0, ytdSupplemental - SUPPLEMENTAL_FEDERAL_HIGH_THRESHOLD)
  return cents(over * SUPPLEMENTAL_FEDERAL_HIGH_RATE + (bonus - over) * SUPPLEMENTAL_FEDERAL_RATE)
}

/**
 * One employee's pay stub: every employee-side withholding and employer-side
 * tax for a single paycheck, with wage-base caps applied against `ytd`.
 *
 * `regular` and `bonus` are taxed differently for income-tax withholding
 * (bonuses are supplemental wages) but identically for Social Security,
 * Medicare, FUTA and SUTA, which all apply to the combined gross.
 */
export function calculatePayStub(args: {
  regular: number
  bonus: number
  bonusMethod: BonusMethod
  profile: TaxProfile
  ytd: YearToDate
  business: BusinessTaxRates
}): PayStubResult {
  const { profile, ytd, business } = args
  const regular = cents(args.regular)
  const bonus = cents(args.bonus)
  const gross = cents(regular + bonus)

  const ssTaxable = Math.min(gross, Math.max(0, SOCIAL_SECURITY_WAGE_BASE - ytd.wages))
  const futaTaxable = Math.min(gross, Math.max(0, FUTA_WAGE_BASE - ytd.wages))
  const sutaTaxable = Math.min(gross, Math.max(0, business.sutaWageBase - ytd.wages))
  const addlMedicareTaxable =
    Math.max(0, ytd.wages + gross - ADDITIONAL_MEDICARE_THRESHOLD) -
    Math.max(0, ytd.wages - ADDITIONAL_MEDICARE_THRESHOLD)

  // Income-tax withholding. Aggregate needs regular pay to combine with; a
  // bonus-only paycheck always uses the flat rate (annualizing a lone bonus
  // would withhold at a wildly inflated rate).
  const bonusMethodUsed: BonusMethod | null = bonus > 0 ? (regular > 0 ? args.bonusMethod : 'flat') : null
  let federal: number
  let state: number
  if (bonusMethodUsed === 'aggregate') {
    federal = federalWithholding(gross, profile)
    state = oklahomaWithholding(gross, profile)
  } else {
    federal = regular > 0 ? federalWithholding(regular, profile) : 0
    state = regular > 0 ? oklahomaWithholding(regular, profile) : 0
    if (bonusMethodUsed === 'flat') {
      federal = cents(federal + federalFlatBonusWithholding(bonus, ytd.supplementalWages))
      state += Math.round(bonus * SUPPLEMENTAL_OKLAHOMA_RATE + 1e-9)
    }
  }

  const socialSecurity = cents(ssTaxable * SOCIAL_SECURITY_RATE)
  const medicare = cents(gross * MEDICARE_RATE)
  const additionalMedicare = cents(addlMedicareTaxable * ADDITIONAL_MEDICARE_RATE)

  const totalEmployeeDeductions = cents(federal + socialSecurity + medicare + additionalMedicare + state)
  const futa = cents(futaTaxable * FUTA_RATE)
  const suta = cents(sutaTaxable * business.sutaRate)

  return {
    gross,
    bonus,
    bonusMethodUsed,
    federalWithholding: federal,
    socialSecurityEmployee: socialSecurity,
    medicareEmployee: medicare,
    additionalMedicare,
    stateWithholding: state,
    socialSecurityEmployer: socialSecurity,
    medicareEmployer: medicare,
    futa,
    suta,
    totalEmployeeDeductions,
    net: cents(gross - totalEmployeeDeductions),
    totalEmployerTaxes: cents(socialSecurity + medicare + futa + suta),
  }
}

/** Gross pay for one period from an employee's pay setup. */
export function grossForPeriod(args: {
  payType: 'hourly' | 'salary'
  /** Hourly rate, or annual salary. */
  payRate: number
  payFrequency: PayFrequency
  regularHours: number
  overtimeHours: number
}): number {
  if (args.payType === 'salary') return cents(args.payRate / PAY_PERIODS[args.payFrequency])
  return cents(args.regularHours * args.payRate + args.overtimeHours * args.payRate * 1.5)
}
