import type { Brand, WorkType } from '../types'
import { addDays, toISODate } from './dateUtils'

export interface ParsedDraft {
  id: string
  rawText: string
  date: string
  brandName: string | null
  type: WorkType | null
  quantity: number | null
  batch: string | null
  missingBrand: boolean
  missingQuantity: boolean
  missingType: boolean
}

const TYPE_PATTERNS: { type: WorkType; regex: RegExp }[] = [
  { type: 'CBO', regex: /\bcbo\b/i },
  { type: 'G', regex: /(?:^|\d|\s)g\b(?!\w)/i },
  { type: 'H', regex: /(?:^|\d|\s)h\b(?!\w)/i },
]

function splitIntoSegments(text: string): string[] {
  return text
    .split(/\r?\n|(?<=[.;])\s+|\by también\b|\btambién\b|\by terminé\b|\by\s(?=\d)/i)
    .map((s) => s.trim())
    .filter(Boolean)
}

function extractType(segment: string): WorkType | null {
  for (const { type, regex } of TYPE_PATTERNS) {
    if (regex.test(segment)) return type
  }
  return null
}

function extractQuantity(segment: string, type: WorkType | null): number | null {
  if (!type) return null
  const re = new RegExp(`(\\d+)\\s*${type}\\b`, 'i')
  const m = segment.match(re)
  if (m) return Number(m[1])
  return null
}

function extractBatch(segment: string): string | null {
  const m = segment.match(/tanda\s*#?\s*(\d+\w*)/i)
  return m ? m[1] : null
}

function extractDate(segment: string, fallback: Date): string {
  if (/\bhoy\b/i.test(segment)) return toISODate(fallback)
  if (/\bayer\b/i.test(segment)) return toISODate(addDays(fallback, -1))
  const m = segment.match(/(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?/)
  if (m) {
    const day = Number(m[1])
    const month = Number(m[2])
    const year = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : fallback.getFullYear()
    return toISODate(new Date(year, month - 1, day))
  }
  return toISODate(fallback)
}

function extractBrand(segment: string, knownBrands: Brand[]): string | null {
  const lower = segment.toLowerCase()
  const known = knownBrands.find((b) => {
    const name = b.name.toLowerCase()
    return new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(lower)
  })
  if (known) return known.name

  const m = segment.match(/(?:de|para)\s+([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ]*(?:\s+[A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ]*){0,2})/)
  if (m) {
    return m[1].replace(/\s*,\s*tanda.*$/i, '').trim()
  }
  return null
}

export function parseQuickText(text: string, knownBrands: Brand[], referenceDate: Date = new Date()): ParsedDraft[] {
  const segments = splitIntoSegments(text)
  const drafts: ParsedDraft[] = []

  segments.forEach((segment, i) => {
    const type = extractType(segment)
    if (!type) return // segment without a recognizable H/G/CBO token isn't a work line

    const quantity = extractQuantity(segment, type)
    const brandName = extractBrand(segment, knownBrands)
    const batch = extractBatch(segment)
    const date = extractDate(segment, referenceDate)

    drafts.push({
      id: `draft-${i}-${Date.now()}`,
      rawText: segment,
      date,
      brandName,
      type,
      quantity,
      batch,
      missingBrand: !brandName,
      missingQuantity: !quantity,
      missingType: !type,
    })
  })

  return drafts
}
