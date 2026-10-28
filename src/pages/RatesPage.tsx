import { useEffect, useState } from 'react'
import { AlertTriangle, Plus, RefreshCw, Save, Trash2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import { Button, Card, ConfirmDialog, Field, inputClass } from '../components/ui'
import { formatMoney } from '../lib/calculations'
import type { CustomRate, ProductionLevel } from '../types'

export function RatesPage() {
  const { rates, levels, updateRates, addCustomRate, updateCustomRate, deleteCustomRate, updateLevels, recalculateAll, entries } = useApp()
  const { push } = useToast()

  const [hRate, setHRate] = useState(String(rates.hRate))
  const [gRate, setGRate] = useState(String(rates.gRate))
  const [cboRate, setCboRate] = useState(String(rates.cboRate))
  const [currency, setCurrency] = useState(rates.currency)
  const [localLevels, setLocalLevels] = useState<ProductionLevel[]>(levels)
  const [confirmRecalc, setConfirmRecalc] = useState(false)
  const [newRateLabel, setNewRateLabel] = useState('')
  const [newRateAmount, setNewRateAmount] = useState('')

  useEffect(() => {
    setHRate(String(rates.hRate))
    setGRate(String(rates.gRate))
    setCboRate(String(rates.cboRate))
    setCurrency(rates.currency)
  }, [rates])

  useEffect(() => setLocalLevels(levels), [levels])

  const saveRates = () => {
    const h = Number(hRate.replace(',', '.'))
    const g = Number(gRate.replace(',', '.'))
    const cbo = Number(cboRate.replace(',', '.'))
    if ([h, g, cbo].some((n) => Number.isNaN(n) || n < 0)) {
      push('Revisá los importes ingresados', 'error')
      return
    }
    updateRates({ hRate: h, gRate: g, cboRate: cbo, currency })
    push('Tarifas guardadas. Los trabajos ya registrados conservan su importe original.')
  }

  const saveLevels = () => {
    updateLevels(localLevels)
    push('Niveles de producción actualizados')
  }

  const updateLevelField = (id: string, patch: Partial<ProductionLevel>) => {
    setLocalLevels((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }

  const addLevel = () => {
    const nextOrder = Math.max(0, ...localLevels.map((l) => l.order)) + 1
    setLocalLevels((prev) => [...prev, { id: `lvl-${Date.now()}`, name: 'Nuevo nivel', bodies: 0, hooks: 0, amountPerDay: 0, order: nextOrder }])
  }

  const removeLevel = (id: string) => setLocalLevels((prev) => prev.filter((l) => l.id !== id))

  const addRate = () => {
    if (!newRateLabel.trim() || !newRateAmount.trim()) return
    addCustomRate({ label: newRateLabel.trim(), amount: Number(newRateAmount.replace(',', '.')) || 0, currency })
    setNewRateLabel('')
    setNewRateAmount('')
    push('Tarifa adicional creada')
  }

  return (
    <div className="space-y-5">
      <Card>
        <h3 className="mb-1 text-sm font-semibold text-ink-900 dark:text-white">Tarifas base</h3>
        <p className="mb-4 text-xs text-ink-400">
          Estas tarifas se usan para calcular nuevos trabajos. Los registros ya guardados conservan el importe con el
          que fueron creados.
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Precio por H">
            <input className={inputClass} value={hRate} onChange={(e) => setHRate(e.target.value)} />
          </Field>
          <Field label="Precio por G">
            <input className={inputClass} value={gRate} onChange={(e) => setGRate(e.target.value)} />
          </Field>
          <Field label="Precio por CBO">
            <input className={inputClass} value={cboRate} onChange={(e) => setCboRate(e.target.value)} />
          </Field>
          <Field label="Moneda">
            <input className={inputClass} value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={4} />
          </Field>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={saveRates}>
            <Save size={15} />
            Guardar tarifas
          </Button>
        </div>
      </Card>

      <Card>
        <h3 className="mb-1 text-sm font-semibold text-ink-900 dark:text-white">Tarifas adicionales</h3>
        <p className="mb-4 text-xs text-ink-400">Para trabajos especiales que no encajan en H, G o CBO.</p>
        <div className="space-y-2">
          {rates.customRates.map((r: CustomRate) => (
            <div key={r.id} className="flex items-center gap-2 rounded-lg border border-ink-100 px-3 py-2 dark:border-ink-800">
              <input
                className={`${inputClass} flex-1`}
                value={r.label}
                onChange={(e) => updateCustomRate(r.id, { label: e.target.value })}
              />
              <input
                className={`${inputClass} w-28`}
                value={r.amount}
                onChange={(e) => updateCustomRate(r.id, { amount: Number(e.target.value.replace(',', '.')) || 0 })}
              />
              <button onClick={() => deleteCustomRate(r.id)} className="rounded-md p-2 text-ink-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input className={inputClass} placeholder="Nombre de la tarifa" value={newRateLabel} onChange={(e) => setNewRateLabel(e.target.value)} />
          <input className={`${inputClass} w-28`} placeholder="Monto" value={newRateAmount} onChange={(e) => setNewRateAmount(e.target.value)} />
          <Button variant="secondary" onClick={addRate}>
            <Plus size={15} />
          </Button>
        </div>
      </Card>

      <Card>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink-900 dark:text-white">Niveles de producción diaria</h3>
          <Button variant="secondary" onClick={addLevel}>
            <Plus size={15} />
            Agregar nivel
          </Button>
        </div>
        <p className="mb-4 text-xs text-ink-400">
          Referencia de producción (cuerpos + hooks por día). Es independiente del cálculo de pago por trabajo.
        </p>
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-ink-400">
                <th className="py-2 pr-2 font-medium">Nivel</th>
                <th className="py-2 pr-2 font-medium">Cuerpos</th>
                <th className="py-2 pr-2 font-medium">Hooks</th>
                <th className="py-2 pr-2 font-medium">USD/día</th>
                <th className="py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {[...localLevels]
                .sort((a, b) => a.order - b.order)
                .map((l) => (
                  <tr key={l.id} className="border-t border-ink-100 dark:border-ink-800">
                    <td className="py-2 pr-2">
                      <input className={inputClass} value={l.name} onChange={(e) => updateLevelField(l.id, { name: e.target.value })} />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        className={`${inputClass} w-20`}
                        value={l.bodies}
                        onChange={(e) => updateLevelField(l.id, { bodies: Number(e.target.value) || 0 })}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        className={`${inputClass} w-20`}
                        value={l.hooks}
                        onChange={(e) => updateLevelField(l.id, { hooks: Number(e.target.value) || 0 })}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        className={`${inputClass} w-24`}
                        value={l.amountPerDay}
                        onChange={(e) => updateLevelField(l.id, { amountPerDay: Number(e.target.value) || 0 })}
                      />
                    </td>
                    <td className="py-2">
                      <button onClick={() => removeLevel(l.id)} className="rounded-md p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={saveLevels}>
            <Save size={15} />
            Guardar niveles
          </Button>
        </div>
      </Card>

      <Card className="border-amber-200 dark:border-amber-500/30">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-500" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-ink-900 dark:text-white">Recalcular registros anteriores</h3>
            <p className="mt-1 text-xs text-ink-400">
              Por defecto, cambiar una tarifa <strong>no</strong> modifica los {entries.length} trabajos ya guardados.
              Si querés aplicar las tarifas actuales a todo el historial, usá esta opción explícita.
            </p>
            <Button variant="secondary" className="mt-3" onClick={() => setConfirmRecalc(true)} disabled={entries.length === 0}>
              <RefreshCw size={15} />
              Recalcular todos los registros
            </Button>
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmRecalc}
        title="Recalcular todos los registros"
        description={`Se recalcularán los ${entries.length} trabajos del historial usando las tarifas actuales ($${formatMoney(rates.hRate)} H / $${formatMoney(rates.gRate)} G / $${formatMoney(rates.cboRate)} CBO). Los importes personalizados también se sobrescribirán. Esta acción no se puede deshacer.`}
        confirmLabel="Recalcular"
        danger
        onCancel={() => setConfirmRecalc(false)}
        onConfirm={() => {
          const count = recalculateAll()
          push(`${count} registro(s) recalculado(s) con las tarifas actuales`)
          setConfirmRecalc(false)
        }}
      />
    </div>
  )
}
