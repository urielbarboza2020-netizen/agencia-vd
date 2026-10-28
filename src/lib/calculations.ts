import type { ProductionLevel, ProductionTotals, RatesConfig, WorkEntry, WorkType } from '../types'

/** Components included in each unit of work. H is a standalone hook (no body). */
export const WORK_COMPONENTS: Record<WorkType, { bodies: number; hooks: number }> = {
  H: { bodies: 0, hooks: 1 },
  G: { bodies: 1, hooks: 3 },
  CBO: { bodies: 3, hooks: 9 },
}

export const WORK_TYPE_LABELS: Record<WorkType, string> = {
  H: 'Hook individual',
  G: 'Cuerpo + 3 hooks',
  CBO: '3 cuerpos + 9 hooks',
}

/** Round to cents using integer arithmetic to avoid float drift. */
export function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export function getUnitRate(type: WorkType, rates: RatesConfig): number {
  if (type === 'H') return rates.hRate
  if (type === 'G') return rates.gRate
  return rates.cboRate
}

export function computeAmount(type: WorkType, quantity: number, rates: RatesConfig): number {
  return roundMoney(quantity * getUnitRate(type, rates))
}

export function computeComponents(type: WorkType, quantity: number) {
  const unit = WORK_COMPONENTS[type]
  return {
    bodies: unit.bodies * quantity,
    hooksIncluded: type === 'H' ? 0 : unit.hooks * quantity,
    hooksIndividual: type === 'H' ? quantity : 0,
  }
}

export function aggregateProduction(entries: WorkEntry[]): ProductionTotals {
  const totals: ProductionTotals = {
    countH: 0,
    countG: 0,
    countCBO: 0,
    bodiesFromG: 0,
    bodiesFromCBO: 0,
    totalBodies: 0,
    hooksIndividual: 0,
    hooksFromG: 0,
    hooksFromCBO: 0,
    hooksIncluded: 0,
    totalHooks: 0,
    totalAmount: 0,
    brandsWorked: new Set<string>(),
    batchesWorked: new Set<string>(),
  }

  for (const e of entries) {
    const comp = computeComponents(e.type, e.quantity)
    if (e.type === 'H') totals.countH += e.quantity
    if (e.type === 'G') {
      totals.countG += e.quantity
      totals.bodiesFromG += comp.bodies
      totals.hooksFromG += comp.hooksIncluded
    }
    if (e.type === 'CBO') {
      totals.countCBO += e.quantity
      totals.bodiesFromCBO += comp.bodies
      totals.hooksFromCBO += comp.hooksIncluded
    }
    totals.hooksIndividual += comp.hooksIndividual
    totals.totalBodies += comp.bodies
    totals.totalAmount = roundMoney(totals.totalAmount + e.total)
    totals.brandsWorked.add(e.brandName)
    if (e.batch) totals.batchesWorked.add(`${e.brandName}::${e.batch}`)
  }

  totals.hooksIncluded = totals.hooksFromG + totals.hooksFromCBO
  totals.totalHooks = totals.hooksIncluded + totals.hooksIndividual
  return totals
}

export interface LevelMatch {
  currentLevel: ProductionLevel | null
  nextLevel: ProductionLevel | null
  bodiesToNext: number
  hooksToNext: number
}

/** Compares daily packaged production (bodies/hooks from G+CBO) against configured levels. */
export function matchProductionLevel(bodies: number, hooks: number, levels: ProductionLevel[]): LevelMatch {
  const sorted = [...levels].sort((a, b) => a.order - b.order)
  let currentLevel: ProductionLevel | null = null
  let nextLevel: ProductionLevel | null = null

  for (const level of sorted) {
    if (bodies >= level.bodies && hooks >= level.hooks) {
      currentLevel = level
    } else if (!nextLevel) {
      nextLevel = level
    }
  }

  if (!nextLevel) {
    const higher = sorted.find((l) => currentLevel && l.order > currentLevel.order)
    nextLevel = higher ?? null
  }

  return {
    currentLevel,
    nextLevel,
    bodiesToNext: nextLevel ? Math.max(0, nextLevel.bodies - bodies) : 0,
    hooksToNext: nextLevel ? Math.max(0, nextLevel.hooks - hooks) : 0,
  }
}

export function formatMoney(amount: number, decimalSeparator: ',' | '.' = ','): string {
  const rounded = roundMoney(amount)
  const isInteger = Number.isInteger(rounded)
  const str = isInteger ? String(rounded) : rounded.toFixed(2).replace(/0$/, '')
  return decimalSeparator === ',' ? str.replace('.', ',') : str
}
