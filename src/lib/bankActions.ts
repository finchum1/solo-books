import { supabase } from './supabase'
import { errMsg } from './errors'
import type { BankLine, TxType } from './types'

/**
 * Everything that changes matching state. supabase-js has no multi-statement transaction, so each action
 * orders its writes so a failure part-way can be undone, and says so plainly if it cannot. Every update
 * that must only touch not-yet-reviewed rows says so in its filter and checks how many rows it really
 * changed, so two browser windows can't both claim the same line or entry.
 */

const fail = (err: unknown, fallback: string) => new Error(errMsg(err, fallback))

export async function createMatch(args: {
  businessId: string
  lineIds: string[]
  entryIds: string[]
  difference: number
  note?: string
  /** 'imported' when the entry was created from the line itself. */
  lineStatus?: 'matched' | 'imported'
}): Promise<string> {
  const { businessId, lineIds, entryIds, difference, note, lineStatus = 'matched' } = args
  if (lineIds.length === 0) throw new Error('Select at least one statement line.')
  const { data: m, error } = await supabase.from('bank_matches').insert({ business_id: businessId, difference, note: note?.trim() || null }).select('id').single()
  if (error) throw fail(error, 'Could not save the match.')
  const matchId = m.id as string
  try {
    const l = await supabase.from('bank_transactions').update({ match_id: matchId, status: lineStatus }).in('id', lineIds).eq('status', 'pending_review').select('id')
    if (l.error) throw l.error
    if ((l.data?.length ?? 0) !== lineIds.length) throw new Error('One of those statement lines was already reviewed somewhere else. Refresh and try again.')
    if (entryIds.length) {
      const e = await supabase.from('transactions').update({ bank_match_id: matchId }).in('id', entryIds).is('bank_match_id', null).select('id')
      if (e.error) throw e.error
      if ((e.data?.length ?? 0) !== entryIds.length) throw new Error('One of those Ledger entries was already matched somewhere else. Refresh and try again.')
    }
    return matchId
  } catch (err) {
    // Put the lines back to "to review", then drop the group (which clears every link on both sides).
    await supabase.from('bank_transactions').update({ status: 'pending_review' }).eq('match_id', matchId)
    await supabase.from('bank_matches').delete().eq('id', matchId)
    throw fail(err, 'Could not save the match.')
  }
}

/** Takes a match group apart. Its lines go back to "to review". Optionally deletes the entries (when they were created from the line). */
export async function undoMatchGroup(matchId: string, deleteEntries = false): Promise<void> {
  const l = await supabase.from('bank_transactions').update({ status: 'pending_review' }).eq('match_id', matchId)
  if (l.error) throw fail(l.error, 'Could not undo that match.')
  if (deleteEntries) {
    const d = await supabase.from('transactions').delete().eq('bank_match_id', matchId)
    if (d.error) throw fail(d.error, 'Could not remove the Ledger entry.')
  }
  const m = await supabase.from('bank_matches').delete().eq('id', matchId)
  if (m.error) throw fail(m.error, 'Could not undo that match.')
}

/** Makes a new Ledger entry from a statement line and matches the two. */
export async function addLineToLedger(args: {
  line: Pick<BankLine, 'id' | 'business_id' | 'posted_date' | 'amount' | 'description'>
  category: string
  contractor?: string
  client?: string
}): Promise<void> {
  const { line, category, contractor, client } = args
  if (!line.posted_date) throw new Error('This line has no date.')
  const amount = Math.abs(Number(line.amount))
  const type: TxType = Number(line.amount) < 0 ? 'expense' : 'income'
  const ins = await supabase
    .from('transactions')
    .insert({
      business_id: line.business_id,
      date: line.posted_date,
      type,
      category: category.trim(),
      amount,
      description: line.description || null,
      contractor: type === 'expense' && contractor?.trim() ? contractor.trim() : null,
      client: type === 'income' && client?.trim() ? client.trim() : null,
    })
    .select('id')
    .single()
  if (ins.error) throw fail(ins.error, 'Could not create the Ledger entry.')
  const entryId = ins.data.id as string
  try {
    await createMatch({ businessId: line.business_id, lineIds: [line.id], entryIds: [entryId], difference: 0, lineStatus: 'imported' })
  } catch (err) {
    await supabase.from('transactions').delete().eq('id', entryId)
    throw err
  }
}

/** Marks one line, or a pair of lines in two of your accounts, as a transfer between your own accounts. */
export async function markTransfer(lineIds: [string] | [string, string]): Promise<void> {
  const [a, b] = lineIds
  const u = await supabase.from('bank_transactions').update({ status: 'transfer' }).in('id', lineIds).eq('status', 'pending_review').select('id')
  if (u.error) throw fail(u.error, 'Could not mark the transfer.')
  if ((u.data?.length ?? 0) !== lineIds.length) {
    await supabase.from('bank_transactions').update({ status: 'pending_review' }).in('id', (u.data ?? []).map((r) => r.id as string))
    throw new Error('One of those lines was already reviewed somewhere else. Refresh and try again.')
  }
  if (b) {
    const r1 = await supabase.from('bank_transactions').update({ transfer_pair_id: b }).eq('id', a)
    const r2 = await supabase.from('bank_transactions').update({ transfer_pair_id: a }).eq('id', b)
    if (r1.error || r2.error) {
      await supabase.from('bank_transactions').update({ status: 'pending_review', transfer_pair_id: null }).in('id', lineIds)
      throw fail(r1.error ?? r2.error, 'Could not link the two sides of the transfer.')
    }
  }
}

export async function setIgnored(lineId: string, ignored: boolean): Promise<void> {
  const q = supabase.from('bank_transactions').update({ status: ignored ? 'ignored' : 'pending_review' }).eq('id', lineId)
  const { error } = await (ignored ? q.eq('status', 'pending_review') : q.eq('status', 'ignored'))
  if (error) throw fail(error, 'Could not update that line.')
}

/** Puts a reviewed line back to "to review", whatever it was reviewed as. */
export async function undoLine(line: Pick<BankLine, 'id' | 'status' | 'match_id' | 'transfer_pair_id'>): Promise<void> {
  if (line.status === 'ignored') return setIgnored(line.id, false)
  if (line.status === 'transfer') {
    const ids = [line.id, ...(line.transfer_pair_id ? [line.transfer_pair_id] : [])]
    const { error } = await supabase.from('bank_transactions').update({ status: 'pending_review', transfer_pair_id: null }).in('id', ids)
    if (error) throw fail(error, 'Could not undo that transfer.')
    return
  }
  if (line.match_id) return undoMatchGroup(line.match_id, line.status === 'imported')
}
