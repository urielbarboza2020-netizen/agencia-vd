import { useMemo, useState } from 'react'
import { Download, Pencil, Search, Trash2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useUI } from '../context/UIContext'
import { useToast } from '../context/ToastContext'
import { Badge, Button, Card, ConfirmDialog, EmptyState, inputClass } from '../components/ui'
import { formatMoney } from '../lib/calculations'
import { entriesToCsv, downloadTextFile } from '../lib/storage'
import { compareISODates, formatShortDate, getMonthKey, getWeekRange, isDateInRange, todayISO } from '../lib/dateUtils'
import type { WorkType } from '../types'

type Period = 'all' | 'day' | 'week' | 'month'

export function HistoryPage() {
  const { entries, brands, settings, deleteEntry } = useApp()
  const { openWorkForm } = useUI()
  const { push } = useToast()

  const [period, setPeriod] = useState<Period>('all')
  const [brandId, setBrandId] = useState('')
  const [type, setType] = useState<WorkType | ''>('')
  const [batch, setBatch] = useState('')
  const [search, setSearch] = useState('')
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let result = [...entries]

    if (period === 'day') {
      const today = todayISO()
      result = result.filter((e) => e.date === today)
    } else if (period === 'week') {
      const { start, end } = getWeekRange(new Date(), settings.weekStart)
      result = result.filter((e) => isDateInRange(e.date, start, end))
    } else if (period === 'month') {
      const monthKey = getMonthKey(todayISO())
      result = result.filter((e) => getMonthKey(e.date) === monthKey)
    }

    if (brandId) result = result.filter((e) => e.brandId === brandId)
    if (type) result = result.filter((e) => e.type === type)
    if (batch.trim()) result = result.filter((e) => (e.batch ?? '').toLowerCase().includes(batch.trim().toLowerCase()))
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(
        (e) => e.brandName.toLowerCase().includes(q) || (e.notes ?? '').toLowerCase().includes(q),
      )
    }

    return result.sort((a, b) => compareISODates(a.date, b.date) || a.createdAt.localeCompare(b.createdAt))
  }, [entries, period, brandId, type, batch, search, settings.weekStart])

  const total = filtered.reduce((sum, e) => sum + e.total, 0)

  const handleExportCsv = () => {
    const csv = entriesToCsv(filtered)
    downloadTextFile(`historial_${todayISO()}.csv`, csv, 'text/csv;charset=utf-8')
    push('Historial exportado como CSV')
  }

  return (
    <div className="space-y-5">
      <Card>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="col-span-2 sm:col-span-1">
            <span className="mb-1.5 block text-xs font-medium text-ink-500 dark:text-ink-400">Período</span>
            <select className={inputClass} value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
              <option value="all">Todo</option>
              <option value="day">Hoy</option>
              <option value="week">Esta semana</option>
              <option value="month">Este mes</option>
            </select>
          </div>
          <div>
            <span className="mb-1.5 block text-xs font-medium text-ink-500 dark:text-ink-400">Marca</span>
            <select className={inputClass} value={brandId} onChange={(e) => setBrandId(e.target.value)}>
              <option value="">Todas</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="mb-1.5 block text-xs font-medium text-ink-500 dark:text-ink-400">Tipo</span>
            <select className={inputClass} value={type} onChange={(e) => setType(e.target.value as WorkType | '')}>
              <option value="">Todos</option>
              <option value="H">H</option>
              <option value="G">G</option>
              <option value="CBO">CBO</option>
            </select>
          </div>
          <div>
            <span className="mb-1.5 block text-xs font-medium text-ink-500 dark:text-ink-400">Tanda</span>
            <input className={inputClass} value={batch} onChange={(e) => setBatch(e.target.value)} placeholder="Ej: 11" />
          </div>
          <div className="col-span-2 sm:col-span-2 lg:col-span-2">
            <span className="mb-1.5 block text-xs font-medium text-ink-500 dark:text-ink-400">Buscar</span>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
              <input className={`${inputClass} pl-9`} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Marca o notas..." />
            </div>
          </div>
        </div>
      </Card>

      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <p className="text-sm text-ink-500">
          <strong className="text-ink-900 dark:text-white">{filtered.length}</strong> registro(s) · Total{' '}
          <strong className="text-brand-600">${formatMoney(total)}</strong>
        </p>
        <Button variant="secondary" onClick={handleExportCsv} disabled={filtered.length === 0}>
          <Download size={15} />
          Exportar CSV
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No hay registros con estos filtros" description="Probá cambiar el período, la marca o el tipo de trabajo." />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-400 dark:border-ink-800">
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Marca</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Cantidad</th>
                <th className="px-4 py-3 font-medium">Tanda</th>
                <th className="px-4 py-3 font-medium">Importe</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-b border-ink-50 last:border-0 hover:bg-ink-50/60 dark:border-ink-800/60 dark:hover:bg-ink-800/30">
                  <td className="px-4 py-3 text-ink-500">{formatShortDate(e.date)}</td>
                  <td className="px-4 py-3 font-medium text-ink-800 dark:text-ink-100">{e.brandName}</td>
                  <td className="px-4 py-3">
                    <Badge color="brand">{e.type}</Badge>
                  </td>
                  <td className="px-4 py-3 text-ink-600 dark:text-ink-300">{e.quantity}</td>
                  <td className="px-4 py-3 text-ink-500">{e.batch ?? '—'}</td>
                  <td className="px-4 py-3 font-semibold text-ink-900 dark:text-white">
                    ${formatMoney(e.total)}
                    {e.overridden && <span className="ml-1 text-xs font-normal text-amber-500">(editado)</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openWorkForm(e.id)}
                        className="rounded-md p-1.5 text-ink-400 hover:bg-ink-100 hover:text-brand-600 dark:hover:bg-ink-800"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setPendingDelete(e.id)}
                        className="rounded-md p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Eliminar trabajo"
        description="Esta acción no se puede deshacer. El registro se eliminará del historial y de los resúmenes."
        confirmLabel="Eliminar"
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            deleteEntry(pendingDelete)
            push('Trabajo eliminado')
          }
          setPendingDelete(null)
        }}
      />
    </div>
  )
}
