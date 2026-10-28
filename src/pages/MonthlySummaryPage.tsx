import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useApp } from '../context/AppContext'
import { Card, EmptyState, StatCard } from '../components/ui'
import { aggregateProduction, formatMoney, roundMoney } from '../lib/calculations'
import { MONTH_NAMES_ES, getMonthKey, getWeekLabel, getWeekRange, parseISODate } from '../lib/dateUtils'

export function MonthlySummaryPage() {
  const { entries, settings } = useApp()
  const now = new Date()
  const [monthKey, setMonthKey] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)

  const monthEntries = useMemo(() => entries.filter((e) => getMonthKey(e.date) === monthKey), [entries, monthKey])
  const totals = useMemo(() => aggregateProduction(monthEntries), [monthEntries])

  const [y, m] = monthKey.split('-').map(Number)
  const monthLabel = `${MONTH_NAMES_ES[m - 1]} ${y}`

  const byBrand = useMemo(() => {
    const map = new Map<string, { brand: string; amount: number; count: number; batches: Set<string> }>()
    for (const e of monthEntries) {
      const cur = map.get(e.brandName) ?? { brand: e.brandName, amount: 0, count: 0, batches: new Set<string>() }
      cur.amount = roundMoney(cur.amount + e.total)
      cur.count += 1
      if (e.batch) cur.batches.add(e.batch)
      map.set(e.brandName, cur)
    }
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount)
  }, [monthEntries])

  const byType = useMemo(() => {
    const groups: Record<string, number> = { H: 0, G: 0, CBO: 0 }
    for (const e of monthEntries) groups[e.type] = roundMoney(groups[e.type] + e.total)
    return groups
  }, [monthEntries])

  const byWeek = useMemo(() => {
    const map = new Map<string, { label: string; amount: number; sortKey: number }>()
    for (const e of monthEntries) {
      const { start, end } = getWeekRange(parseISODate(e.date), settings.weekStart)
      const label = getWeekLabel(start, end)
      const cur = map.get(label) ?? { label, amount: 0, sortKey: start.getTime() }
      cur.amount = roundMoney(cur.amount + e.total)
      map.set(label, cur)
    }
    return Array.from(map.values()).sort((a, b) => a.sortKey - b.sortKey)
  }, [monthEntries, settings.weekStart])

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink-900 dark:text-white">{monthLabel}</h3>
          <input
            type="month"
            value={monthKey}
            onChange={(e) => setMonthKey(e.target.value)}
            className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-700 outline-none focus:border-brand-500 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200"
          />
        </div>
      </Card>

      {monthEntries.length === 0 ? (
        <EmptyState title="No hay trabajos registrados en este mes" description="Elegí otro mes o empezá a registrar tus trabajos diarios." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total facturado" value={`$${formatMoney(totals.totalAmount)} USD`} accent />
            <StatCard label="Cuerpos producidos" value={totals.totalBodies} sub={`G: ${totals.bodiesFromG} · CBO: ${totals.bodiesFromCBO}`} />
            <StatCard
              label="Hooks producidos"
              value={totals.totalHooks}
              sub={`${totals.hooksIndividual} individuales · ${totals.hooksIncluded} en paquetes`}
            />
            <StatCard label="Marcas / tandas" value={`${totals.brandsWorked.size} / ${totals.batchesWorked.size}`} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Total H" value={totals.countH} sub={`$${formatMoney(byType.H)}`} />
            <StatCard label="Total G" value={totals.countG} sub={`$${formatMoney(byType.G)}`} />
            <StatCard label="Total CBO" value={totals.countCBO} sub={`$${formatMoney(byType.CBO)}`} />
          </div>

          {byWeek.length > 1 && (
            <Card>
              <h3 className="mb-4 text-sm font-semibold text-ink-900 dark:text-white">Ganancias por semana</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byWeek}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-ink-100)" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="var(--color-ink-400)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="var(--color-ink-400)" />
                  <Tooltip formatter={(v) => [`$${formatMoney(Number(v))}`, 'Ganancia']} />
                  <Bar dataKey="amount" fill="var(--color-brand-500)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          <Card>
            <h3 className="mb-3 text-sm font-semibold text-ink-900 dark:text-white">Ganancias por marca</h3>
            <div className="space-y-2">
              {byBrand.map((b) => (
                <div key={b.brand} className="flex items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-ink-50 dark:hover:bg-ink-800/40">
                  <div>
                    <p className="font-medium text-ink-800 dark:text-ink-100">{b.brand}</p>
                    <p className="text-xs text-ink-400">{b.count} trabajo(s) · {b.batches.size} tanda(s)</p>
                  </div>
                  <span className="font-semibold text-ink-900 dark:text-white">${formatMoney(b.amount)}</span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
