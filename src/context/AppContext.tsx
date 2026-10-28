import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AppSettings, Brand, CustomRate, ProductionLevel, RatesConfig, WorkEntry, WorkType } from '../types'
import { computeAmount, getUnitRate, roundMoney } from '../lib/calculations'
import { todayISO } from '../lib/dateUtils'
import { useAuth } from './AuthContext'
import { useToast } from './ToastContext'
import * as db from '../lib/db'
import type { BackupPayload } from '../lib/storage'

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

  restoreFromBackup: (payload: BackupPayload) => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

const DEFAULT_RATES: RatesConfig = {
  hRate: 5,
  gRate: 7.3,
  cboRate: 22,
  currency: 'USD',
  customRates: [],
  updatedAt: new Date().toISOString(),
}

const DEFAULT_SETTINGS: AppSettings = {
  currency: 'USD',
  dateFormat: 'DD/MM/YYYY',
  weekStart: 'monday',
  theme: 'system',
  summaryFormat: {
    header: 'SEMANAL:',
    currencyPrefix: '$',
    totalSuffix: 'USD',
    decimalSeparator: ',',
    hideQuantityForCboWhenOne: true,
    dateSeparator: '/',
  },
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { push } = useToast()
  const [entries, setEntries] = useState<WorkEntry[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [rates, setRates] = useState<RatesConfig>(DEFAULT_RATES)
  const [levels, setLevels] = useState<ProductionLevel[]>([])
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setLoaded(false)

    async function load() {
      try {
        const [brandsData, entriesData] = await Promise.all([db.fetchBrands(), db.fetchEntries()])

        let ratesData: RatesConfig
        try {
          ratesData = await db.fetchRates()
        } catch {
          ratesData = DEFAULT_RATES
          await db.upsertRates(user!.id, ratesData)
        }

        let settingsData: AppSettings
        try {
          settingsData = await db.fetchSettings()
        } catch {
          settingsData = DEFAULT_SETTINGS
          await db.upsertSettings(user!.id, settingsData)
        }

        const levelsData = await db.fetchLevels()

        if (cancelled) return
        setBrands(brandsData)
        setEntries(entriesData)
        setRates(ratesData)
        setSettings(settingsData)
        setLevels(levelsData)
        setLoaded(true)
      } catch (err) {
        if (cancelled) return
        push(`Error al cargar tus datos: ${(err as Error).message}`, 'error')
        setLoaded(true)
      }
    }

    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

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
    const created: Brand = { id: crypto.randomUUID(), name: trimmed, createdAt: new Date().toISOString() }
    setBrands((prev) => [...prev, created])
    db.insertBrand(user!.id, created).catch((err) => {
      setBrands((prev) => prev.filter((b) => b.id !== created.id))
      push(`No se pudo crear la marca: ${(err as Error).message}`, 'error')
    })
    return created
  }

  const addBrand: AppContextValue['addBrand'] = (name, product, notes) => {
    const created: Brand = { id: crypto.randomUUID(), name: name.trim(), product, notes, createdAt: new Date().toISOString() }
    setBrands((prev) => [...prev, created])
    db.insertBrand(user!.id, created).catch((err) => {
      setBrands((prev) => prev.filter((b) => b.id !== created.id))
      push(`No se pudo crear la marca: ${(err as Error).message}`, 'error')
    })
    return created
  }

  const updateBrand: AppContextValue['updateBrand'] = (id, patch) => {
    const previous = brands
    setBrands((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)))
    db.updateBrandRow(id, patch).catch((err) => {
      setBrands(previous)
      push(`No se pudo actualizar la marca: ${(err as Error).message}`, 'error')
    })
  }

  const deleteBrand: AppContextValue['deleteBrand'] = (id) => {
    const previous = brands
    setBrands((prev) => prev.filter((b) => b.id !== id))
    db.deleteBrandRow(id).catch((err) => {
      setBrands(previous)
      push(`No se pudo eliminar la marca: ${(err as Error).message}`, 'error')
    })
  }

  const addEntry: AppContextValue['addEntry'] = (input) => {
    const unitRate = getUnitRate(input.type, rates)
    const computed = computeAmount(input.type, input.quantity, rates)
    const total = input.overrideTotal !== undefined ? roundMoney(input.overrideTotal) : computed
    const now = new Date().toISOString()
    const entry: WorkEntry = {
      id: crypto.randomUUID(),
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
    db.insertEntry(user!.id, entry).catch((err) => {
      setEntries((prev) => prev.filter((e) => e.id !== entry.id))
      push(`No se pudo guardar el trabajo: ${(err as Error).message}`, 'error')
    })
    return entry
  }

  const updateEntry: AppContextValue['updateEntry'] = (id, patch) => {
    const previous = entries
    let updated: WorkEntry | undefined
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e
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
        updated = {
          ...e,
          ...patch,
          type,
          quantity,
          batch: patch.batch !== undefined ? patch.batch?.trim() || undefined : e.batch,
          total,
          unitRate,
          overridden: patch.overrideTotal !== undefined ? true : e.overridden,
          updatedAt: new Date().toISOString(),
        }
        return updated
      }),
    )
    if (updated) {
      db.updateEntryRow(id, updated).catch((err) => {
        setEntries(previous)
        push(`No se pudo actualizar el trabajo: ${(err as Error).message}`, 'error')
      })
    }
  }

  const deleteEntry: AppContextValue['deleteEntry'] = (id) => {
    const previous = entries
    setEntries((prev) => prev.filter((e) => e.id !== id))
    db.deleteEntryRow(id).catch((err) => {
      setEntries(previous)
      push(`No se pudo eliminar el trabajo: ${(err as Error).message}`, 'error')
    })
  }

  const recalculateEntry: AppContextValue['recalculateEntry'] = (id) => {
    const previous = entries
    let updated: WorkEntry | undefined
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e
        updated = {
          ...e,
          unitRate: getUnitRate(e.type, rates),
          total: computeAmount(e.type, e.quantity, rates),
          currency: rates.currency,
          overridden: false,
          updatedAt: new Date().toISOString(),
        }
        return updated
      }),
    )
    if (updated) {
      db.updateEntryRow(id, updated).catch((err) => {
        setEntries(previous)
        push(`No se pudo recalcular: ${(err as Error).message}`, 'error')
      })
    }
  }

  const recalculateAll: AppContextValue['recalculateAll'] = () => {
    const previous = entries
    const now = new Date().toISOString()
    const next = entries.map((e) => ({
      ...e,
      unitRate: getUnitRate(e.type, rates),
      total: computeAmount(e.type, e.quantity, rates),
      currency: rates.currency,
      overridden: false,
      updatedAt: now,
    }))
    setEntries(next)
    db.bulkUpdateEntryAmounts(next.map((e) => ({ id: e.id, unitRate: e.unitRate, total: e.total, currency: e.currency, overridden: e.overridden, updatedAt: e.updatedAt }))).catch(
      (err) => {
        setEntries(previous)
        push(`No se pudo recalcular todo: ${(err as Error).message}`, 'error')
      },
    )
    return next.length
  }

  const updateRates: AppContextValue['updateRates'] = (patch) => {
    const previous = rates
    const next = { ...rates, ...patch, updatedAt: new Date().toISOString() }
    setRates(next)
    db.upsertRates(user!.id, next).catch((err) => {
      setRates(previous)
      push(`No se pudieron guardar las tarifas: ${(err as Error).message}`, 'error')
    })
  }

  const addCustomRate: AppContextValue['addCustomRate'] = (rate) => {
    const previous = rates
    const next = { ...rates, customRates: [...rates.customRates, { ...rate, id: crypto.randomUUID() }], updatedAt: new Date().toISOString() }
    setRates(next)
    db.upsertRates(user!.id, next).catch((err) => {
      setRates(previous)
      push(`No se pudo crear la tarifa: ${(err as Error).message}`, 'error')
    })
  }

  const updateCustomRate: AppContextValue['updateCustomRate'] = (id, patch) => {
    const previous = rates
    const next = {
      ...rates,
      customRates: rates.customRates.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      updatedAt: new Date().toISOString(),
    }
    setRates(next)
    db.upsertRates(user!.id, next).catch((err) => {
      setRates(previous)
      push(`No se pudo actualizar la tarifa: ${(err as Error).message}`, 'error')
    })
  }

  const deleteCustomRate: AppContextValue['deleteCustomRate'] = (id) => {
    const previous = rates
    const next = { ...rates, customRates: rates.customRates.filter((r) => r.id !== id), updatedAt: new Date().toISOString() }
    setRates(next)
    db.upsertRates(user!.id, next).catch((err) => {
      setRates(previous)
      push(`No se pudo eliminar la tarifa: ${(err as Error).message}`, 'error')
    })
  }

  const updateLevels: AppContextValue['updateLevels'] = (next) => {
    const previous = levels
    const withIds = next.map((l) => ({ ...l, id: l.id || crypto.randomUUID() }))
    setLevels(withIds)
    db.replaceLevels(user!.id, withIds).catch((err) => {
      setLevels(previous)
      push(`No se pudieron guardar los niveles: ${(err as Error).message}`, 'error')
    })
  }

  const updateSettings: AppContextValue['updateSettings'] = (patch) => {
    const previous = settings
    const next = { ...settings, ...patch, summaryFormat: { ...settings.summaryFormat, ...(patch.summaryFormat ?? {}) } }
    setSettings(next)
    db.upsertSettings(user!.id, next).catch((err) => {
      setSettings(previous)
      push(`No se pudo guardar la configuración: ${(err as Error).message}`, 'error')
    })
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

  const restoreFromBackup: AppContextValue['restoreFromBackup'] = async (payload) => {
    if (!payload || payload.version !== 1) throw new Error('Archivo de backup inválido')
    await db.wipeUserData(user!.id)
    await db.bulkInsertBrands(user!.id, payload.brands ?? [])
    await db.bulkInsertEntries(user!.id, payload.entries ?? [])
    await db.replaceLevels(user!.id, payload.levels ?? [])
    if (payload.rates) await db.upsertRates(user!.id, payload.rates)
    if (payload.settings) await db.upsertSettings(user!.id, payload.settings)

    const [brandsData, entriesData, ratesData, levelsData, settingsData] = await Promise.all([
      db.fetchBrands(),
      db.fetchEntries(),
      db.fetchRates(),
      db.fetchLevels(),
      db.fetchSettings(),
    ])
    setBrands(brandsData)
    setEntries(entriesData)
    setRates(ratesData)
    setLevels(levelsData)
    setSettings(settingsData)
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
      restoreFromBackup,
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
