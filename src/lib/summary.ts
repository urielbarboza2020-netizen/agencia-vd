import type { SummaryFormatOptions, WorkEntry } from '../types'
import { formatMoney, roundMoney } from './calculations'
import { compareISODates, formatShortDate } from './dateUtils'

export const DEFAULT_SUMMARY_FORMAT: SummaryFormatOptions = {
  header: 'SEMANAL:',
  currencyPrefix: '$',
  totalSuffix: 'USD',
  decimalSeparator: ',',
  hideQuantityForCboWhenOne: true,
  dateSeparator: '/',
}

function formatQuantityType(type: WorkEntry['type'], quantity: number, opts: SummaryFormatOptions): string {
  if (type === 'CBO' && quantity === 1 && opts.hideQuantityForCboWhenOne) {
    return 'CBO'
  }
  return `${quantity}${type}`
}

export function formatEntryLine(entry: WorkEntry, opts: SummaryFormatOptions = DEFAULT_SUMMARY_FORMAT): string {
  const amount = `${opts.currencyPrefix}${formatMoney(entry.total, opts.decimalSeparator)}`
  const qtyType = formatQuantityType(entry.type, entry.quantity, opts)
  const batchPart = entry.batch ? ` (Tanda ${entry.batch})` : ''
  const date = formatShortDate(entry.date, opts.dateSeparator)
  return `${amount} - ${qtyType} ${entry.brandName}${batchPart} ${date}`
}

export interface GeneratedSummary {
  text: string
  totalsByCurrency: Record<string, number>
  entryCount: number
}

export function generateWeeklySummary(
  entries: WorkEntry[],
  opts: SummaryFormatOptions = DEFAULT_SUMMARY_FORMAT,
): GeneratedSummary {
  const sorted = [...entries].sort((a, b) => {
    const byDate = compareISODates(a.date, b.date)
    if (byDate !== 0) return byDate
    return a.createdAt.localeCompare(b.createdAt)
  })

  const lines = sorted.map((e) => formatEntryLine(e, opts))

  const totalsByCurrency: Record<string, number> = {}
  for (const e of sorted) {
    totalsByCurrency[e.currency] = roundMoney((totalsByCurrency[e.currency] ?? 0) + e.total)
  }

  const totalLines = Object.entries(totalsByCurrency).map(
    ([currency, amount]) => `TOTAL: ${formatMoney(amount, opts.decimalSeparator)} ${currency}`,
  )

  const text = [opts.header, '', ...lines, '', ...totalLines].join('\n')

  return { text, totalsByCurrency, entryCount: sorted.length }
}
