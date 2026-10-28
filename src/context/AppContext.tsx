import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AppSettings, Brand, CustomRate, ProductionLevel, RatesConfig, WorkEntry, WorkType } from '../types'
import { computeAmount, getUnitRate, roundMoney } from '../lib/calculations'
import { storage, uid } from '../lib/storage'
import { todayISO } from '../lib/dateUtils'

export interface NewEntryInput {
  date: string
  brandId: string
  brandName: string
  type: WorkType
  quantity: number
  batch?: string
  notes?: string
  overrideTotal?: number
}

interface AppContextValue {
  entries: WorkEntry[]
  brands: Brand[]
  rates: RatesConfig
  levels: ProductionLevel[]
  settings: AppSettings
  loaded: boolean

  addEntry: (input: NewEntryInput) => WorkEntry
  updateEntry: (id: string, patch: Partial<NewEntryInput>) => void
  deleteEntry: (id: string) => void
  recalculateEntry: (id: string) => void
  recalculateAll: () => number

  addBrand: (name: string, product?: string, notes?: string) => Brand
  updateBrand: (id: string, patch: Partial<Omit<Brand, 'id' | 'createdAt'>>) => void
  deleteBrand: (id: string) => void
  findOrCreateBrand: (name: string) => Brand

  updateRates: (patch: Partial<Omit<RatesConfig, 'customRates' | 'updatedAt'>>) => void
  addCustomRate: (rate: Omit<CustomRate, 'id'>) => void
  updateCustomRate: (id: string, patch: Partial<CustomRate>) => void
  deleteCustomRate: (id: string) => void

  updateLevels: (levels: ProductionLevel[]) => void
  updateSettings: (patch: Partial<AppSettings>) => void

  findPossibleDuplicate: (input: NewEntryInput) => WorkEntry | undefined
  batchesForBrand: (brandId: string) => string[]
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<WorkEntry[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [rates, setRates] = useState<RatesConfig>(() => storage.loadRates())
  const [levels, setLevels] = useState<ProductionLevel[]>([])
  const [settings, setSettings] = useState<AppSettings>(() => storage.loadSettings())
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setEntries(storage.loadEntries())
    setBrands(storage.loadBrands())
    setRates(storage.loadRates())
    setLevels(storage.loadLevels())
    setSettings(storage.loadSettings())
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (loaded) storage.saveEntries(entries)
  }, [entries, loaded])
  useEffect(() => {
    if (loaded) storage.saveBrands(brands)
  }, [brands, loaded])
  useEffect(() => {
    if (loaded) storage.saveRates(rates)
  }, [rates, loaded])
  useEffect(() => {
    if (loaded) storage.saveLevels(levels)
  }, [levels, loaded])
  useEffect(() => {
    if (loaded) storage.saveSettings(settings)
  }, [settings, loaded])

  useEffect(() => {
    const root = document.documentElement
    const applyDark = (dark: boolean) => root.setAttribute('data-theme', dark ? 'dark' : 'light')
    if (settings.theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      applyDark(mq.matches)
      const listener = (e: MediaQueryListEvent) => applyDark(e.matches)
      mq.addEventListener('change', listener)
      return () => mq.removeEventListener('change', listener)
    }
    applyDark(settings.theme === 'dark')
  }, [settings.theme])

  const findOrCreateBrand = (name: string): Brand => {
    const trimmed = name.trim()
    const existing = brands.find((b) => b.name.toLowerCase() === trimmed.toLowerCase())
    if (existing) return existing
    const created: Brand = { id: uid(), name: trimmed, createdAt: new Date().toISOString() }
    setBrands((prev) => [...prev, created])
    return created
  }

  const addBrand = (name: string, product?: string, notes?: string): Brand => {
    const created: Brand = { id: uid(), name: name.trim(), product, notes, createdAt: new Date().toISOString() }
    setBrands((prev) => [...prev, created])
    return created
  }

  const updateBrand: AppContextValue['updateBrand'] = (id, patch) => {
    setBrands((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)))
  }

  const deleteBrand: AppContextValue['deleteBrand'] = (id) => {
    setBrands((prev) => prev.filter((b) => b.id !== id))
  }

  const addEntry: AppContextValue['addEntry'] = (input) => {
    const unitRate = getUnitRate(input.type, rates)
    const computed = computeAmount(input.type, input.quantity, rates)
    const total = input.overrideTotal !== undefined ? roundMoney(input.overrideTotal) : computed
    const now = new Date().toISOString()
    const entry: WorkEntry = {
      id: uid(),
      date: input.date,
      brandId: input.brandId,
      brandName: input.brandName,
      type: input.type,
      quantity: input.quantity,
      batch: input.batch?.trim() || undefined,
      unitRate,
      currency: rates.currency,
      total,
      overridden: input.overrideTotal !== undefined,
      notes: input.notes?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    }
    setEntries((prev) => [...prev, entry])
    return entry
  }

  const updateEntry: AppContextValue['updateEntry'] = (id, patch) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e
        const merged = { ...e, ...patch }
        const type = patch.type ?? e.type
        const quantity = patch.quantity ?? e.quantity
        const shouldRecompute = patch.overrideTotal === undefined && (patch.type !== undefined || patch.quantity !== undefined)
        const total =
          patch.overrideTotal !== undefined
            ? roundMoney(patch.overrideTotal)
            : shouldRecompute
              ? computeAmount(type, quantity, rates)
              : e.total
        const unitRate = shouldRecompute ? getUnitRate(type, rates) : e.unitRate
        return {
          ...merged,
          type,
          quantity,
          batch: patch.batch !== undefined ? patch.batch?.trim() || undefined : e.batch,
          total,
          unitRate,
          overridden: patch.overrideTotal !== undefined ? true : e.overridden,
          updatedAt: new Date().toISOString(),
        }
      }),
    )
  }

  const deleteEntry: AppContextValue['deleteEntry'] = (id) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  const recalculateEntry: AppContextValue['recalculateEntry'] = (id) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              unitRate: getUnitRate(e.type, rates),
              total: computeAmount(e.type, e.quantity, rates),
              currency: rates.currency,
              overridden: false,
              updatedAt: new Date().toISOString(),
            }
          : e,
      ),
    )
  }

  const recalculateAll: AppContextValue['recalculateAll'] = () => {
    let count = 0
    setEntries((prev) =>
      prev.map((e) => {
        count += 1
        return {
          ...e,
          unitRate: getUnitRate(e.type, rates),
          total: computeAmount(e.type, e.quantity, rates),
          currency: rates.currency,
          overridden: false,
          updatedAt: new Date().toISOString(),
        }
      }),
    )
    return count
  }

  const updateRates: AppContextValue['updateRates'] = (patch) => {
    setRates((prev) => ({ ...prev, ...patch, updatedAt: new Date().toISOString() }))
  }

  const addCustomRate: AppContextValue['addCustomRate'] = (rate) => {
    setRates((prev) => ({ ...prev, customRates: [...prev.customRates, { ...rate, id: uid() }], updatedAt: new Date().toISOString() }))
  }

  const updateCustomRate: AppContextValue['updateCustomRate'] = (id, patch) => {
    setRates((prev) => ({
      ...prev,
      customRates: prev.customRates.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      updatedAt: new Date().toISOString(),
    }))
  }

  const deleteCustomRate: AppContextValue['deleteCustomRate'] = (id) => {
    setRates((prev) => ({ ...prev, customRates: prev.customRates.filter((r) => r.id !== id), updatedAt: new Date().toISOString() }))
  }

  const updateLevels: AppContextValue['updateLevels'] = (next) => setLevels(next)

  const updateSettings: AppContextValue['updateSettings'] = (patch) => {
    setSettings((prev) => ({ ...prev, ...patch, summaryFormat: { ...prev.summaryFormat, ...(patch.summaryFormat ?? {}) } }))
  }

  const findPossibleDuplicate: AppContextValue['findPossibleDuplicate'] = (input) => {
    return entries.find(
      (e) =>
        e.date === input.date &&
        e.brandName.toLowerCase() === input.brandName.trim().toLowerCase() &&
        e.type === input.type &&
        (e.batch || '') === (input.batch?.trim() || ''),
    )
  }

  const batchesForBrand: AppContextValue['batchesForBrand'] = (brandId) => {
    const set = new Set<string>()
    for (const e of entries) {
      if (e.brandId === brandId && e.batch) set.add(e.batch)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  }

  const value = useMemo<AppContextValue>(
    () => ({
      entries,
      brands,
      rates,
      levels,
      settings,
      loaded,
      addEntry,
      updateEntry,
      deleteEntry,
      recalculateEntry,
      recalculateAll,
      addBrand,
      updateBrand,
      deleteBrand,
      findOrCreateBrand,
      updateRates,
      addCustomRate,
      updateCustomRate,
      deleteCustomRate,
      updateLevels,
      updateSettings,
      findPossibleDuplicate,
      batchesForBrand,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries, brands, rates, levels, settings, loaded],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp debe usarse dentro de AppProvider')
  return ctx
}

export function defaultNewEntryDate() {
  return todayISO()
}
