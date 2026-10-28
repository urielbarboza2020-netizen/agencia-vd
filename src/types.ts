export type WorkType = 'H' | 'G' | 'CBO'

export interface Brand {
  id: string
  name: string
  product?: string
  notes?: string
  createdAt: string
}

export interface WorkEntry {
  id: string
  date: string // ISO yyyy-mm-dd
  brandId: string
  brandName: string // snapshot, survives brand rename/deletion
  type: WorkType
  quantity: number
  batch?: string // "tanda" — free text/number, optional
  unitRate: number // snapshot of the rate used at creation time
  currency: string // snapshot of currency at creation time
  total: number // snapshot of computed amount (quantity * unitRate, unless overridden)
  overridden: boolean // true if the user manually typed a custom total
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface CustomRate {
  id: string
  label: string
  amount: number
  currency: string
  notes?: string
}

export interface RatesConfig {
  hRate: number
  gRate: number
  cboRate: number
  currency: string
  customRates: CustomRate[]
  updatedAt: string
}

export interface ProductionLevel {
  id: string
  name: string
  bodies: number
  hooks: number
  amountPerDay: number
  order: number
}

export type WeekStart = 'monday' | 'sunday'
export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'

export interface SummaryFormatOptions {
  header: string // first line of the weekly summary, e.g. "SEMANAL:"
  currencyPrefix: string // e.g. "$"
  totalSuffix: string // e.g. "USD"
  decimalSeparator: ',' | '.'
  hideQuantityForCboWhenOne: boolean
  dateSeparator: '/' | '-'
}

export interface AppSettings {
  currency: string
  dateFormat: DateFormat
  weekStart: WeekStart
  theme: 'light' | 'dark' | 'system'
  summaryFormat: SummaryFormatOptions
}

export interface ProductionTotals {
  countH: number
  countG: number
  countCBO: number
  bodiesFromG: number
  bodiesFromCBO: number
  totalBodies: number
  hooksIndividual: number
  hooksFromG: number
  hooksFromCBO: number
  hooksIncluded: number
  totalHooks: number
  totalAmount: number
  brandsWorked: Set<string>
  batchesWorked: Set<string>
}
