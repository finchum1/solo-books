import { supabase } from '../supabase'
import type { PayrollRun } from '../types'
import type { PayStubResult } from './calc'

export const WAGES_CATEGORY = 'Payroll Wages'
export const EMPLOYER_TAXES_CATEGORY = 'Payroll Taxes (Employer)'

export interface StubToSave {
  employeeId: string
  employeeName: string
  regularHours: number
  overtimeHours: number
  result: PayStubResult
}

const sum = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) * 100) / 100

/** Make sure the two expense categories payroll posts to exist for this account (categories are per-owner). */
async function ensureCategories() {
  const { data, error } = await supabase.from('categories').select('name').eq('type', 'expense')
  if (error) throw error
  const existing = new Set((data ?? []).map((c: { name: string }) => c.name))
  const missing = [WAGES_CATEGORY, EMPLOYER_TAXES_CATEGORY].filter((n) => !existing.has(n))
  if (missing.length === 0) return
  const { error: insErr } = await supabase
    .from('categories')
    .insert(missing.map((name, i) => ({ name, type: 'expense', sort_order: 900 + i })))
  if (insErr) throw insErr
}

/**
 * Records a payroll run: two expense rows in the ledger (gross wages and the
 * employer's share of payroll taxes), the run itself, and one pay stub per
 * employee. supabase-js has no multi-table transaction, so this is ordered
 * ledger -> run -> stubs and undoes what it created if a later step fails.
 *
 * Withheld employee taxes are NOT a separate expense: they come out of gross
 * wages, which is already posted in full.
 */
export async function savePayrollRun(args: {
  businessId: string
  payDate: string
  periodStart: string | null
  periodEnd: string | null
  stubs: StubToSave[]
}): Promise<string> {
  const { businessId, payDate, periodStart, periodEnd, stubs } = args
  const totalGross = sum(stubs.map((s) => s.result.gross))
  const totalEmployerTaxes = sum(stubs.map((s) => s.result.totalEmployerTaxes))
  const description = `Payroll ${payDate} (${stubs.length} employee${stubs.length === 1 ? '' : 's'})`

  await ensureCategories()

  const createdTx: string[] = []
  let runId: string | null = null
  try {
    let wageTx: string | null = null
    let taxTx: string | null = null

    const wages = await supabase
      .from('transactions')
      .insert({ business_id: businessId, date: payDate, type: 'expense', category: WAGES_CATEGORY, amount: totalGross, description })
      .select('id')
      .single()
    if (wages.error) throw wages.error
    wageTx = wages.data.id as string
    createdTx.push(wageTx)

    if (totalEmployerTaxes > 0) {
      const taxes = await supabase
        .from('transactions')
        .insert({
          business_id: businessId,
          date: payDate,
          type: 'expense',
          category: EMPLOYER_TAXES_CATEGORY,
          amount: totalEmployerTaxes,
          description,
        })
        .select('id')
        .single()
      if (taxes.error) throw taxes.error
      taxTx = taxes.data.id as string
      createdTx.push(taxTx)
    }

    const run = await supabase
      .from('payroll_runs')
      .insert({
        business_id: businessId,
        pay_date: payDate,
        period_start: periodStart,
        period_end: periodEnd,
        wage_transaction_id: wageTx,
        tax_transaction_id: taxTx,
      })
      .select('id')
      .single()
    if (run.error) throw run.error
    runId = run.data.id as string

    const { error: stubErr } = await supabase.from('pay_stubs').insert(
      stubs.map((s) => ({
        run_id: runId,
        business_id: businessId,
        employee_id: s.employeeId,
        employee_name: s.employeeName,
        pay_date: payDate,
        regular_hours: s.regularHours,
        overtime_hours: s.overtimeHours,
        bonus: s.result.bonus,
        gross: s.result.gross,
        federal_withholding: s.result.federalWithholding,
        social_security_employee: s.result.socialSecurityEmployee,
        medicare_employee: s.result.medicareEmployee,
        additional_medicare: s.result.additionalMedicare,
        state_withholding: s.result.stateWithholding,
        net: s.result.net,
        social_security_employer: s.result.socialSecurityEmployer,
        medicare_employer: s.result.medicareEmployer,
        futa: s.result.futa,
        suta: s.result.suta,
      })),
    )
    if (stubErr) throw stubErr
    return runId
  } catch (err) {
    // Best-effort undo so a half-saved run never leaves orphaned ledger rows behind.
    if (runId) await supabase.from('payroll_runs').delete().eq('id', runId)
    if (createdTx.length) await supabase.from('transactions').delete().in('id', createdTx)
    throw err
  }
}

/** Deletes a run, its pay stubs (cascade), and the two ledger rows it created. */
export async function deletePayrollRun(run: PayrollRun) {
  const { error } = await supabase.from('payroll_runs').delete().eq('id', run.id)
  if (error) throw error
  const txIds = [run.wage_transaction_id, run.tax_transaction_id].filter((x): x is string => !!x)
  if (txIds.length) {
    const { error: txErr } = await supabase.from('transactions').delete().in('id', txIds)
    if (txErr) throw txErr
  }
}
