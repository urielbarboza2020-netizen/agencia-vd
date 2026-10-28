import type { WeekStart } from '../types'

export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function todayISO(): string {
  return toISODate(new Date())
}

export function formatShortDate(dateStr: string, separator: '/' | '-' = '/'): string {
  const d = parseISODate(dateStr)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}${separator}${mm}`
}

export function formatFullDate(dateStr: string, format: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'): string {
  const d = parseISODate(dateStr)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = String(d.getFullYear())
  if (format === 'MM/DD/YYYY') return `${mm}/${dd}/${yyyy}`
  if (format === 'YYYY-MM-DD') return `${yyyy}-${mm}-${dd}`
  return `${dd}/${mm}/${yyyy}`
}

/** Monday-Sunday (or Sunday-Saturday) range containing referenceDate. */
export function getWeekRange(referenceDate: Date, weekStart: WeekStart = 'monday'): { start: Date; end: Date } {
  const day = referenceDate.getDay() // 0=Sun..6=Sat
  let diffToStart: number
  if (weekStart === 'monday') {
    diffToStart = day === 0 ? -6 : 1 - day
  } else {
    diffToStart = -day
  }
  const start = new Date(referenceDate)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() + diffToStart)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

export function isDateInRange(dateStr: string, start: Date, end: Date): boolean {
  const d = parseISODate(dateStr)
  return d.getTime() >= new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime() &&
    d.getTime() <= new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999).getTime()
}

export function getMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7) // yyyy-mm
}

export function getWeekLabel(start: Date, end: Date): string {
  const dd1 = String(start.getDate()).padStart(2, '0')
  const mm1 = String(start.getMonth() + 1).padStart(2, '0')
  const dd2 = String(end.getDate()).padStart(2, '0')
  const mm2 = String(end.getMonth() + 1).padStart(2, '0')
  return `${dd1}/${mm1} - ${dd2}/${mm2}`
}

export function addDays(d: Date, days: number): Date {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + days)
  return copy
}

export function compareISODates(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

export const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
