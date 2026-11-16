/**
 * Reads every row of a query. The API returns at most 1000 rows per request, so a plain
 * `await query` silently drops the rest. The query MUST have a stable, unique sort
 * (e.g. `.order('id')` last) or rows can repeat or go missing between pages.
 */
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
