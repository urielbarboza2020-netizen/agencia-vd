import { supabase } from './supabaseClient'
import type { AppSettings, Brand, CustomRate, ProductionLevel, RatesConfig, WorkEntry } from '../types'

// ---- Row <-> domain-model mappers (snake_case DB <-> camelCase TS) ----

interface BrandRow {
  id: string
  name: string
  product: string | null
  notes: string | null
  created_at: string
}
const brandFromRow = (r: BrandRow): Brand => ({
  id: r.id,
  name: r.name,
  product: r.product ?? undefined,
  notes: r.notes ?? undefined,
  createdAt: r.created_at,
})

interface EntryRow {
  id: string
  date: string
  brand_id: string | null
  brand_name: string
  type: 'H' | 'G' | 'CBO'
  quantity: number
  batch: string | null
  unit_rate: number
  currency: string
  total: number
  overridden: boolean
  notes: string | null
  created_at: string
  updated_at: string
}
const entryFromRow = (r: EntryRow): WorkEntry => ({
  id: r.id,
  date: r.date,
  brandId: r.brand_id ?? '',
  brandName: r.brand_name,
  type: r.type,
  quantity: Number(r.quantity),
  batch: r.batch ?? undefined,
  unitRate: Number(r.unit_rate),
  currency: r.currency,
  total: Number(r.total),
  overridden: r.overridden,
  notes: r.notes ?? undefined,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

interface RatesRow {
  h_rate: number
  g_rate: number
  cbo_rate: number
  currency: string
  custom_rates: CustomRate[]
  updated_at: string
}
const ratesFromRow = (r: RatesRow): RatesConfig => ({
  hRate: Number(r.h_rate),
  gRate: Number(r.g_rate),
  cboRate: Number(r.cbo_rate),
  currency: r.currency,
  customRates: r.custom_rates ?? [],
  updatedAt: r.updated_at,
})

interface LevelRow {
  id: string
  name: string
  bodies: number
  hooks: number
  amount_per_day: number
  order_num: number
}
const levelFromRow = (r: LevelRow): ProductionLevel => ({
  id: r.id,
  name: r.name,
  bodies: r.bodies,
  hooks: r.hooks,
  amountPerDay: Number(r.amount_per_day),
  order: r.order_num,
})

interface SettingsRow {
  currency: string
  date_format: AppSettings['dateFormat']
  week_start: AppSettings['weekStart']
  theme: AppSettings['theme']
  summary_format: Partial<AppSettings['summaryFormat']> | null
}
const DEFAULT_SUMMARY_FORMAT: AppSettings['summaryFormat'] = {
  header: 'SEMANAL:',
  currencyPrefix: '$',
  totalSuffix: 'USD',
  decimalSeparator: ',',
  hideQuantityForCboWhenOne: true,
  dateSeparator: '/',
}
const settingsFromRow = (r: SettingsRow): AppSettings => ({
  currency: r.currency,
  dateFormat: r.date_format,
  weekStart: r.week_start,
  theme: r.theme,
  summaryFormat: { ...DEFAULT_SUMMARY_FORMAT, ...(r.summary_format ?? {}) },
})

// ---- Reads ----

export async function fetchBrands(): Promise<Brand[]> {
  const { data, error } = await supabase.from('brands').select('*').order('created_at', { ascending: true })
  if (error) throw error
  return (data as BrandRow[]).map(brandFromRow)
}

export async function fetchEntries(): Promise<WorkEntry[]> {
  const { data, error } = await supabase.from('work_entries').select('*').order('date', { ascending: true })
  if (error) throw error
  return (data as EntryRow[]).map(entryFromRow)
}

export async function fetchRates(): Promise<RatesConfig> {
  const { data, error } = await supabase.from('rates').select('*').maybeSingle()
  if (error) throw error
  if (!data) throw new Error('No se encontraron tarifas para este usuario')
  return ratesFromRow(data as RatesRow)
}

export async function fetchLevels(): Promise<ProductionLevel[]> {
  const { data, error } = await supabase.from('production_levels').select('*').order('order_num', { ascending: true })
  if (error) throw error
  return (data as LevelRow[]).map(levelFromRow)
}

export async function fetchSettings(): Promise<AppSettings> {
  const { data, error } = await supabase.from('app_settings').select('*').maybeSingle()
  if (error) throw error
  if (!data) throw new Error('No se encontró configuración para este usuario')
  return settingsFromRow(data as SettingsRow)
}

// ---- Writes: brands ----

export async function insertBrand(userId: string, brand: Brand): Promise<void> {
  const { error } = await supabase.from('brands').insert({
    id: brand.id,
    user_id: userId,
    name: brand.name,
    product: brand.product ?? null,
    notes: brand.notes ?? null,
    created_at: brand.createdAt,
  })
  if (error) throw error
}

export async function updateBrandRow(id: string, patch: Partial<Omit<Brand, 'id' | 'createdAt'>>): Promise<void> {
  const payload: Record<string, unknown> = {}
  if (patch.name !== undefined) payload.name = patch.name
  if (patch.product !== undefined) payload.product = patch.product ?? null
  if (patch.notes !== undefined) payload.notes = patch.notes ?? null
  const { error } = await supabase.from('brands').update(payload).eq('id', id)
  if (error) throw error
}

export async function deleteBrandRow(id: string): Promise<void> {
  const { error } = await supabase.from('brands').delete().eq('id', id)
  if (error) throw error
}

// ---- Writes: work entries ----

export async function insertEntry(userId: string, entry: WorkEntry): Promise<void> {
  const { error } = await supabase.from('work_entries').insert({
    id: entry.id,
    user_id: userId,
    date: entry.date,
    brand_id: entry.brandId || null,
    brand_name: entry.brandName,
    type: entry.type,
    quantity: entry.quantity,
    batch: entry.batch ?? null,
    unit_rate: entry.unitRate,
    currency: entry.currency,
    total: entry.total,
    overridden: entry.overridden,
    notes: entry.notes ?? null,
    created_at: entry.createdAt,
    updated_at: entry.updatedAt,
  })
  if (error) throw error
}

export async function updateEntryRow(id: string, entry: WorkEntry): Promise<void> {
  const { error } = await supabase
    .from('work_entries')
    .update({
      date: entry.date,
      brand_id: entry.brandId || null,
      brand_name: entry.brandName,
      type: entry.type,
      quantity: entry.quantity,
      batch: entry.batch ?? null,
      unit_rate: entry.unitRate,
      currency: entry.currency,
      total: entry.total,
      overridden: entry.overridden,
      notes: entry.notes ?? null,
      updated_at: entry.updatedAt,
    })
    .eq('id', id)
  if (error) throw error
}

export async function deleteEntryRow(id: string): Promise<void> {
  const { error } = await supabase.from('work_entries').delete().eq('id', id)
  if (error) throw error
}

export async function bulkUpdateEntryAmounts(
  entries: { id: string; unitRate: number; total: number; currency: string; overridden: boolean; updatedAt: string }[],
): Promise<void> {
  await Promise.all(
    entries.map((e) =>
      supabase
        .from('work_entries')
        .update({ unit_rate: e.unitRate, total: e.total, currency: e.currency, overridden: e.overridden, updated_at: e.updatedAt })
        .eq('id', e.id),
    ),
  )
}

// ---- Writes: rates ----

export async function upsertRates(userId: string, rates: RatesConfig): Promise<void> {
  const { error } = await supabase.from('rates').upsert({
    user_id: userId,
    h_rate: rates.hRate,
    g_rate: rates.gRate,
    cbo_rate: rates.cboRate,
    currency: rates.currency,
    custom_rates: rates.customRates,
    updated_at: rates.updatedAt,
  })
  if (error) throw error
}

// ---- Writes: production levels (replace full set) ----

export async function replaceLevels(userId: string, levels: ProductionLevel[]): Promise<void> {
  const { error: delError } = await supabase.from('production_levels').delete().eq('user_id', userId)
  if (delError) throw delError
  if (levels.length === 0) return
  const { error } = await supabase.from('production_levels').insert(
    levels.map((l) => ({
      id: l.id,
      user_id: userId,
      name: l.name,
      bodies: l.bodies,
      hooks: l.hooks,
      amount_per_day: l.amountPerDay,
      order_num: l.order,
    })),
  )
  if (error) throw error
}

// ---- Writes: settings ----

// ---- Full account wipe + restore (used by "Restaurar backup") ----

export async function wipeUserData(userId: string): Promise<void> {
  await supabase.from('work_entries').delete().eq('user_id', userId)
  await supabase.from('brands').delete().eq('user_id', userId)
  await supabase.from('production_levels').delete().eq('user_id', userId)
}

export async function bulkInsertBrands(userId: string, brands: Brand[]): Promise<void> {
  if (brands.length === 0) return
  const { error } = await supabase.from('brands').insert(
    brands.map((b) => ({ id: b.id, user_id: userId, name: b.name, product: b.product ?? null, notes: b.notes ?? null, created_at: b.createdAt })),
  )
  if (error) throw error
}

export async function bulkInsertEntries(userId: string, entries: WorkEntry[]): Promise<void> {
  if (entries.length === 0) return
  const { error } = await supabase.from('work_entries').insert(
    entries.map((e) => ({
      id: e.id,
      user_id: userId,
      date: e.date,
      brand_id: e.brandId || null,
      brand_name: e.brandName,
      type: e.type,
      quantity: e.quantity,
      batch: e.batch ?? null,
      unit_rate: e.unitRate,
      currency: e.currency,
      total: e.total,
      overridden: e.overridden,
      notes: e.notes ?? null,
      created_at: e.createdAt,
      updated_at: e.updatedAt,
    })),
  )
  if (error) throw error
}

export async function upsertSettings(userId: string, settings: AppSettings): Promise<void> {
  const { error } = await supabase.from('app_settings').upsert({
    user_id: userId,
    currency: settings.currency,
    date_format: settings.dateFormat,
    week_start: settings.weekStart,
    theme: settings.theme,
    summary_format: settings.summaryFormat,
  })
  if (error) throw error
}
