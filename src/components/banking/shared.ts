export const money = (n: number) => n.toLocaleString(undefined, { style: 'currency', currency: 'USD' })

export const inputCls =
  'w-full rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500'
export const labelCls = 'block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1'
export const cardCls = 'bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6'
export const primaryBtn =
  'rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium px-4 py-2 text-sm transition'
export const ghostBtn =
  'rounded-lg px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition disabled:opacity-60'

/** 2026-11-03 -> Nov 3, 2026, without a timezone shifting the day. */
export function fmtDate(ymd: string | null | undefined): string {
  if (!ymd) return ''
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Reads every row of a query that may hold more than the API's per-request limit. */
export async function fetchAllRows<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = []
  const SIZE = 1000
  for (let from = 0; ; from += SIZE) {
    const { data, error } = await page(from, from + SIZE - 1)
    if (error) throw new Error(error.message)
    out.push(...(data ?? []))
    if (!data || data.length < SIZE) break
  }
  return out
}
