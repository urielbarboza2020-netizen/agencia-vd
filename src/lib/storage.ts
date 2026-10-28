import type { AppSettings, Brand, ProductionLevel, RatesConfig, WorkEntry } from '../types'
import { DEFAULT_SUMMARY_FORMAT } from './summary'

const KEYS = {
  entries: 'avd.workEntries.v1',
  brands: 'avd.brands.v1',
  rates: 'avd.rates.v1',
  levels: 'avd.levels.v1',
  settings: 'avd.settings.v1',
} as const

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

// ---- Seed data (from the user's own reference tables — not fictitious demo data) ----

const SEED_BRAND_NAMES = ['FLEXLAB', 'ANDARA', 'DERMAPURA', 'LUNA NUEVA', 'MENLAB']

function seedBrands(): Brand[] {
  const now = new Date().toISOString()
  return SEED_BRAND_NAMES.map((name) => ({ id: uid(), name, createdAt: now }))
}

function seedRates(): RatesConfig {
  return {
    hRate: 5,
    gRate: 7.3,
    cboRate: 22,
    currency: 'USD',
    customRates: [
      { id: uid(), label: 'Opción B (9 ads individuales / 9 cuerpos + 9 hooks)', amount: 45, currency: 'USD' },
    ],
    updatedAt: new Date().toISOString(),
  }
}

function seedLevels(): ProductionLevel[] {
  return [
    { id: uid(), name: 'Novato', bodies: 3, hooks: 9, amountPerDay: 22, order: 1 },
    { id: uid(), name: 'Estándar', bodies: 6, hooks: 18, amountPerDay: 44, order: 2 },
    { id: uid(), name: 'Avanzado', bodies: 9, hooks: 27, amountPerDay: 66, order: 3 },
    { id: uid(), name: 'Pro', bodies: 12, hooks: 36, amountPerDay: 88, order: 4 },
    { id: uid(), name: 'Experto', bodies: 15, hooks: 45, amountPerDay: 110, order: 5 },
  ]
}

function seedSettings(): AppSettings {
  return {
    currency: 'USD',
    dateFormat: 'DD/MM/YYYY',
    weekStart: 'monday',
    theme: 'system',
    summaryFormat: DEFAULT_SUMMARY_FORMAT,
  }
}

export const storage = {
  loadEntries(): WorkEntry[] {
    return read<WorkEntry[]>(KEYS.entries, [])
  },
  saveEntries(entries: WorkEntry[]) {
    write(KEYS.entries, entries)
  },
  loadBrands(): Brand[] {
    const existing = localStorage.getItem(KEYS.brands)
    if (existing) return JSON.parse(existing) as Brand[]
    const seeded = seedBrands()
    write(KEYS.brands, seeded)
    return seeded
  },
  saveBrands(brands: Brand[]) {
    write(KEYS.brands, brands)
  },
  loadRates(): RatesConfig {
    const existing = localStorage.getItem(KEYS.rates)
    if (existing) return JSON.parse(existing) as RatesConfig
    const seeded = seedRates()
    write(KEYS.rates, seeded)
    return seeded
  },
  saveRates(rates: RatesConfig) {
    write(KEYS.rates, rates)
  },
  loadLevels(): ProductionLevel[] {
    const existing = localStorage.getItem(KEYS.levels)
    if (existing) return JSON.parse(existing) as ProductionLevel[]
    const seeded = seedLevels()
    write(KEYS.levels, seeded)
    return seeded
  },
  saveLevels(levels: ProductionLevel[]) {
    write(KEYS.levels, levels)
  },
  loadSettings(): AppSettings {
    const defaults = seedSettings()
    const existing = read<Partial<AppSettings>>(KEYS.settings, {})
    return {
      ...defaults,
      ...existing,
      summaryFormat: { ...defaults.summaryFormat, ...(existing.summaryFormat ?? {}) },
    }
  },
  saveSettings(settings: AppSettings) {
    write(KEYS.settings, settings)
  },
}

export interface BackupPayload {
  version: 1
  exportedAt: string
  entries: WorkEntry[]
  brands: Brand[]
  rates: RatesConfig
  levels: ProductionLevel[]
  settings: AppSettings
}

export function buildBackup(): BackupPayload {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    entries: storage.loadEntries(),
    brands: storage.loadBrands(),
    rates: storage.loadRates(),
    levels: storage.loadLevels(),
    settings: storage.loadSettings(),
  }
}

export function restoreBackup(payload: BackupPayload) {
  if (!payload || payload.version !== 1) throw new Error('Archivo de backup inválido')
  storage.saveEntries(payload.entries ?? [])
  storage.saveBrands(payload.brands ?? [])
  storage.saveRates(payload.rates)
  storage.saveLevels(payload.levels ?? [])
  storage.saveSettings(payload.settings)
}

export function entriesToCsv(entries: WorkEntry[]): string {
  const header = ['fecha', 'marca', 'tipo', 'cantidad', 'tanda', 'tarifa_unitaria', 'moneda', 'importe', 'notas']
  const rows = entries.map((e) => [
    e.date,
    e.brandName,
    e.type,
    String(e.quantity),
    e.batch ?? '',
    String(e.unitRate),
    e.currency,
    String(e.total),
    (e.notes ?? '').replace(/\n/g, ' '),
  ])
  const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  return [header, ...rows].map((r) => r.map(escape).join(',')).join('\n')
}

export function downloadTextFile(filename: string, content: string, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
