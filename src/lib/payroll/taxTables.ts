/**
 * 2026 payroll tax constants. Everything here is dated: when the IRS or the
 * Oklahoma Tax Commission publish new tables, this file is the only thing that
 * should need to change (and TAX_YEAR, which gates payroll runs to the year the
 * tables are valid for).
 *
 * Sources (read 2026-11-11):
 *  - Federal withholding: IRS Publication 15-T (2026), Section 1, "Percentage
 *    Method Tables for Automated Payroll Systems" (Worksheet 1A, annual tables).
 *  - Oklahoma withholding: Oklahoma Tax Commission Packet OW-2 (rev. 11-2025),
 *    "Tables for Percentage Method of Withholding" and the allowance table.
 *  - FICA/FUTA: IRS Pub. 15 (2026) and SSA's 2026 wage base announcement.
 */

export const TAX_YEAR = 2026

export type PayFrequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly'

export const PAY_PERIODS: Record<PayFrequency, number> = {
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
}

export const PAY_FREQUENCY_LABELS: Record<PayFrequency, string> = {
  weekly: 'Weekly',
  biweekly: 'Every 2 weeks',
  semimonthly: 'Twice a month',
  monthly: 'Monthly',
}

// ---------------------------------------------------------------- FICA / FUTA

export const SOCIAL_SECURITY_RATE = 0.062
export const SOCIAL_SECURITY_WAGE_BASE = 184_500
export const MEDICARE_RATE = 0.0145
/** Employee-only extra Medicare tax on wages above this amount in the calendar year. */
export const ADDITIONAL_MEDICARE_THRESHOLD = 200_000
export const ADDITIONAL_MEDICARE_RATE = 0.009
/** Net FUTA rate (6.0% less the 5.4% state-unemployment credit) on the first $7,000 per employee. */
export const FUTA_RATE = 0.006
export const FUTA_WAGE_BASE = 7_000

// ------------------------------------------------- Supplemental wages (bonuses)

/**
 * Bonuses are "supplemental wages". For a bonus paid separately from regular
 * pay, an employer may withhold federal income tax at a flat 22% (IRS Pub. 15,
 * section 7), or 37% on the part of the year's supplemental wages above $1M
 * (mandatory). The alternative is the aggregate method (combine with regular
 * pay and run the percentage method).
 */
export const SUPPLEMENTAL_FEDERAL_RATE = 0.22
export const SUPPLEMENTAL_FEDERAL_HIGH_RATE = 0.37
export const SUPPLEMENTAL_FEDERAL_HIGH_THRESHOLD = 1_000_000
/**
 * Oklahoma (OAC 710:90-1-6(b)(1)(A)): flat withholding "at the highest applicable
 * rate" for the year, which in the 2026 OW-2 tables is 4.5%.
 */
export const SUPPLEMENTAL_OKLAHOMA_RATE = 0.045

export type BonusMethod = 'flat' | 'aggregate'

export const BONUS_METHOD_LABELS: Record<BonusMethod, string> = {
  flat: 'Flat rate (22% federal, 4.5% Oklahoma)',
  aggregate: 'Aggregate with regular pay',
}

// ------------------------------------------------------------ Federal (15-T)

export type FederalFilingStatus = 'single' | 'married' | 'head_of_household'

export const FEDERAL_FILING_LABELS: Record<FederalFilingStatus, string> = {
  single: 'Single or Married filing separately',
  married: 'Married filing jointly',
  head_of_household: 'Head of household',
}

/** Worksheet 1A line 1g -- only subtracted when the W-4 Step 2 box is NOT checked. */
export const FEDERAL_STEP_1G: Record<FederalFilingStatus, number> = {
  married: 12_900,
  single: 8_600,
  head_of_household: 8_600,
}

interface Bracket {
  /** "At least" column. */
  over: number
  /** Marginal rate applied to the amount above `over`. */
  rate: number
}

/**
 * Only the thresholds and rates are transcribed; the "tentative amount to
 * withhold" base for each row is derived cumulatively in `federalTentativeTax`.
 * (a one-off check compared the derived bases against the IRS-printed ones.)
 */
export const FEDERAL_STANDARD: Record<FederalFilingStatus, Bracket[]> = {
  married: [
    { over: 0, rate: 0 },
    { over: 19_300, rate: 0.1 },
    { over: 44_100, rate: 0.12 },
    { over: 120_100, rate: 0.22 },
    { over: 230_700, rate: 0.24 },
    { over: 422_850, rate: 0.32 },
    { over: 531_750, rate: 0.35 },
    { over: 788_000, rate: 0.37 },
  ],
  single: [
    { over: 0, rate: 0 },
    { over: 7_500, rate: 0.1 },
    { over: 19_900, rate: 0.12 },
    { over: 57_900, rate: 0.22 },
    { over: 113_200, rate: 0.24 },
    { over: 209_275, rate: 0.32 },
    { over: 263_725, rate: 0.35 },
    { over: 648_100, rate: 0.37 },
  ],
  head_of_household: [
    { over: 0, rate: 0 },
    { over: 15_550, rate: 0.1 },
    { over: 33_250, rate: 0.12 },
    { over: 83_000, rate: 0.22 },
    { over: 121_250, rate: 0.24 },
    { over: 217_300, rate: 0.32 },
    { over: 271_750, rate: 0.35 },
    { over: 656_150, rate: 0.37 },
  ],
}

/** "Form W-4 Step 2 Checkbox" schedules. */
export const FEDERAL_STEP2_CHECKED: Record<FederalFilingStatus, Bracket[]> = {
  married: [
    { over: 0, rate: 0 },
    { over: 16_100, rate: 0.1 },
    { over: 28_500, rate: 0.12 },
    { over: 66_500, rate: 0.22 },
    { over: 121_800, rate: 0.24 },
    { over: 217_875, rate: 0.32 },
    { over: 272_325, rate: 0.35 },
    { over: 400_450, rate: 0.37 },
  ],
  single: [
    { over: 0, rate: 0 },
    { over: 8_050, rate: 0.1 },
    { over: 14_250, rate: 0.12 },
    { over: 33_250, rate: 0.22 },
    { over: 60_900, rate: 0.24 },
    { over: 108_938, rate: 0.32 },
    { over: 136_163, rate: 0.35 },
    { over: 328_350, rate: 0.37 },
  ],
  head_of_household: [
    { over: 0, rate: 0 },
    { over: 12_075, rate: 0.1 },
    { over: 20_925, rate: 0.12 },
    { over: 45_800, rate: 0.22 },
    { over: 64_925, rate: 0.24 },
    { over: 112_950, rate: 0.32 },
    { over: 140_175, rate: 0.35 },
    { over: 332_375, rate: 0.37 },
  ],
}

/** IRS-printed "tentative amount to withhold" bases, used only by the self-check. */
export const FEDERAL_PRINTED_BASES = {
  standard: {
    married: [0, 0, 2_480, 11_600, 35_932, 82_048, 116_896, 206_583.5],
    single: [0, 0, 1_240, 5_800, 17_966, 41_024, 58_448, 192_979.25],
    head_of_household: [0, 0, 1_770, 7_740, 16_155, 39_207, 56_631, 191_171],
  },
  step2: {
    married: [0, 0, 1_240, 5_800, 17_966, 41_024, 58_448, 103_291.75],
    single: [0, 0, 620, 2_900, 8_983, 20_512, 29_224, 96_489.63],
    head_of_household: [0, 0, 885, 3_870, 8_077.5, 19_603.5, 28_315.5, 95_585.5],
  },
} as const

// ------------------------------------------------------------------ Oklahoma

export type OklahomaFilingStatus = 'single' | 'married' | 'married_higher_single'

export const OKLAHOMA_FILING_LABELS: Record<OklahomaFilingStatus, string> = {
  single: 'Single',
  married: 'Married',
  married_higher_single: 'Married, but withhold at higher Single rate',
}

interface OkRow {
  /** Net wage (after allowances) at or above which this row applies. */
  over: number
  base: number
  rate: number
}

type OkTable = { single: OkRow[]; married: OkRow[] }

/** OW-2 Tables 1-4. Values are copied exactly as printed (they are per-period, already rounded by the OTC). */
export const OKLAHOMA_TABLES: Record<PayFrequency, OkTable> = {
  weekly: {
    single: [
      { over: 0, base: 0, rate: 0 },
      { over: 194, base: 0, rate: 0.025 },
      { over: 216, base: 0.55, rate: 0.035 },
      { over: 261, base: 2.1, rate: 0.045 },
    ],
    married: [
      { over: 0, base: 0, rate: 0 },
      { over: 388, base: 0, rate: 0.025 },
      { over: 433, base: 1.11, rate: 0.035 },
      { over: 521, base: 4.2, rate: 0.045 },
    ],
  },
  biweekly: {
    single: [
      { over: 0, base: 0, rate: 0 },
      { over: 388, base: 0, rate: 0.025 },
      { over: 433, base: 1.11, rate: 0.035 },
      { over: 521, base: 4.2, rate: 0.045 },
    ],
    married: [
      { over: 0, base: 0, rate: 0 },
      { over: 777, base: 0, rate: 0.025 },
      { over: 865, base: 2.21, rate: 0.035 },
      { over: 1_042, base: 8.4, rate: 0.045 },
    ],
  },
  semimonthly: {
    single: [
      { over: 0, base: 0, rate: 0 },
      { over: 421, base: 0, rate: 0.025 },
      { over: 469, base: 1.2, rate: 0.035 },
      { over: 565, base: 4.55, rate: 0.045 },
    ],
    married: [
      { over: 0, base: 0, rate: 0 },
      { over: 842, base: 0, rate: 0.025 },
      { over: 938, base: 2.4, rate: 0.035 },
      { over: 1_129, base: 9.1, rate: 0.045 },
    ],
  },
  monthly: {
    single: [
      { over: 0, base: 0, rate: 0 },
      { over: 842, base: 0, rate: 0.025 },
      { over: 938, base: 2.4, rate: 0.035 },
      { over: 1_129, base: 9.1, rate: 0.045 },
    ],
    married: [
      { over: 0, base: 0, rate: 0 },
      { over: 1_683, base: 0, rate: 0.025 },
      { over: 1_875, base: 4.79, rate: 0.035 },
      { over: 2_258, base: 18.21, rate: 0.045 },
    ],
  },
}

/** Withholding allowance amount per pay period: $1,000 personal exemption / periods, rounded to cents as printed in OW-2. */
export const OKLAHOMA_ALLOWANCE: Record<PayFrequency, number> = {
  weekly: 19.23,
  biweekly: 38.46,
  semimonthly: 41.67,
  monthly: 83.33,
}
