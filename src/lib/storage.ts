import type { AppSettings, Brand, ProductionLevel, RatesConfig, WorkEntry } from '../types'

export interface BackupPayload {
  version: 1
  exportedAt: string
  entries: WorkEntry[]
  brands: Brand[]
  rates: RatesConfig
  levels: ProductionLevel[]
  settings: AppSettings
}

export function buildBackup(state: {
  entries: WorkEntry[]
  brands: Brand[]
  rates: RatesConfig
  levels: ProductionLevel[]
  settings: AppSettings
}): BackupPayload {
  return { version: 1, exportedAt: new Date().toISOString(), ...state }
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
