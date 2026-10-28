import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Calculator } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useUI } from '../context/UIContext'
import { useToast } from '../context/ToastContext'
import { Button, Field, Modal, inputClass } from './ui'
import { BrandCombobox } from './BrandCombobox'
import { computeAmount, formatMoney, getUnitRate, WORK_TYPE_LABELS } from '../lib/calculations'
import { todayISO } from '../lib/dateUtils'
import type { WorkType } from '../types'

const TYPE_OPTIONS: WorkType[] = ['H', 'G', 'CBO']

export function WorkFormModal() {
  const { isWorkFormOpen, editingEntryId, closeWorkForm } = useUI()
  const { entries, rates, findOrCreateBrand, addEntry, updateEntry, findPossibleDuplicate, batchesForBrand } = useApp()
  const { push } = useToast()

  const editingEntry = useMemo(() => entries.find((e) => e.id === editingEntryId) ?? null, [entries, editingEntryId])

  const [date, setDate] = useState(todayISO())
  const [brandName, setBrandName] = useState('')
  const [type, setType] = useState<WorkType>('H')
  const [quantity, setQuantity] = useState('1')
  const [batch, setBatch] = useState('')
  const [notes, setNotes] = useState('')
  const [useOverride, setUseOverride] = useState(false)
  const [overrideTotal, setOverrideTotal] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [duplicateAck, setDuplicateAck] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isWorkFormOpen) return
    if (editingEntry) {
      setDate(editingEntry.date)
      setBrandName(editingEntry.brandName)
      setType(editingEntry.type)
      setQuantity(String(editingEntry.quantity))
      setBatch(editingEntry.batch ?? '')
      setNotes(editingEntry.notes ?? '')
      setUseOverride(editingEntry.overridden)
      setOverrideTotal(editingEntry.overridden ? String(editingEntry.total) : '')
    } else {
      setDate(todayISO())
      setBrandName('')
      setType('H')
      setQuantity('1')
      setBatch('')
      setNotes('')
      setUseOverride(false)
      setOverrideTotal('')
    }
    setErrors({})
    setDuplicateAck(false)
  }, [isWorkFormOpen, editingEntry])

  const qtyNumber = Number(quantity.replace(',', '.'))
  const unitRate = getUnitRate(type, rates)
  const computedTotal = Number.isFinite(qtyNumber) && qtyNumber > 0 ? computeAmount(type, qtyNumber, rates) : 0
  const previewTotal = useOverride ? Number(overrideTotal.replace(',', '.')) || 0 : computedTotal

  const batchSuggestions = useMemo(() => {
    const brand = entries.find((e) => e.brandName.toLowerCase() === brandName.trim().toLowerCase())
    return brand ? batchesForBrand(brand.brandId) : []
  }, [entries, brandName, batchesForBrand])

  const duplicate = useMemo(() => {
    if (!brandName.trim()) return undefined
    const found = findPossibleDuplicate({
      date,
      brandId: '',
      brandName: brandName.trim(),
      type,
      quantity: qtyNumber,
      batch,
    })
    if (found && editingEntry && found.id === editingEntry.id) return undefined
    return found
  }, [brandName, date, type, qtyNumber, batch, findPossibleDuplicate, editingEntry])

  const validate = () => {
    const next: Record<string, string> = {}
    if (!date) next.date = 'Elegí una fecha'
    if (!brandName.trim()) next.brand = 'Elegí o escribí una marca'
    if (!qtyNumber || qtyNumber <= 0) next.quantity = 'Cantidad inválida'
    if (useOverride && (!overrideTotal || Number.isNaN(Number(overrideTotal.replace(',', '.'))))) {
      next.overrideTotal = 'Importe inválido'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    if (duplicate && !duplicateAck) {
      setDuplicateAck(true)
      return
    }
    setSaving(true)
    const brand = findOrCreateBrand(brandName.trim())
    const input = {
      date,
      brandId: brand.id,
      brandName: brand.name,
      type,
      quantity: qtyNumber,
      batch: batch.trim() || undefined,
      notes: notes.trim() || undefined,
      overrideTotal: useOverride ? Number(overrideTotal.replace(',', '.')) : undefined,
    }
    if (editingEntry) {
      updateEntry(editingEntry.id, input)
      push('Trabajo actualizado correctamente')
    } else {
      addEntry(input)
      push('Trabajo guardado correctamente')
    }
    setSaving(false)
    closeWorkForm()
  }

  return (
    <Modal open={isWorkFormOpen} onClose={closeWorkForm} title={editingEntry ? 'Editar trabajo' : 'Registrar trabajo'} wide>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Fecha" error={errors.date}>
          <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>

        <Field label="Marca o producto" error={errors.brand}>
          <BrandCombobox value={brandName} onChange={setBrandName} />
        </Field>

        <Field label="Tipo de trabajo">
          <div className="grid grid-cols-3 gap-2">
            {TYPE_OPTIONS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${
                  type === t
                    ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                    : 'border-ink-200 bg-white text-ink-600 hover:border-brand-300 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <span className="mt-1.5 block text-xs text-ink-400">{WORK_TYPE_LABELS[type]}</span>
        </Field>

        <Field label="Cantidad" error={errors.quantity}>
          <input
            type="number"
            min={1}
            step={1}
            className={inputClass}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </Field>

        <Field label="Número de tanda (opcional)" hint={batchSuggestions.length ? `Usadas: ${batchSuggestions.join(', ')}` : undefined}>
          <input
            className={inputClass}
            value={batch}
            onChange={(e) => setBatch(e.target.value)}
            placeholder="Ej: 11"
            list="batch-suggestions"
          />
          <datalist id="batch-suggestions">
            {batchSuggestions.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
        </Field>

        <Field label="Tarifa aplicada">
          <div className={`${inputClass} flex items-center justify-between bg-ink-50 dark:bg-ink-800/60`}>
            <span>
              ${formatMoney(unitRate)} / {type}
            </span>
            <span className="text-xs text-ink-400">{rates.currency}</span>
          </div>
        </Field>
      </div>

      <div className="mt-4">
        <Field label="Notas (opcional)">
          <textarea
            className={inputClass}
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Detalles adicionales del trabajo"
          />
        </Field>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <input
          id="override"
          type="checkbox"
          checked={useOverride}
          onChange={(e) => setUseOverride(e.target.checked)}
          className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
        />
        <label htmlFor="override" className="text-sm text-ink-600 dark:text-ink-300">
          Usar un importe personalizado para este trabajo
        </label>
      </div>
      {useOverride && (
        <div className="mt-2 max-w-[200px]">
          <Field label="Importe personalizado (USD)" error={errors.overrideTotal}>
            <input className={inputClass} value={overrideTotal} onChange={(e) => setOverrideTotal(e.target.value)} placeholder="0.00" />
          </Field>
        </div>
      )}

      <div className="mt-5 flex items-center justify-between rounded-xl bg-brand-50 px-4 py-3 dark:bg-brand-500/10">
        <div className="flex items-center gap-2 text-sm text-brand-700 dark:text-brand-300">
          <Calculator size={16} />
          Importe calculado
        </div>
        <span className="text-xl font-semibold text-brand-700 dark:text-brand-300">${formatMoney(previewTotal)}</span>
      </div>

      {duplicate && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertTriangle size={17} className="mt-0.5 shrink-0" />
          <span>
            Ya existe un registro de <strong>{duplicate.brandName}</strong> tipo <strong>{duplicate.type}</strong>
            {duplicate.batch ? ` (Tanda ${duplicate.batch})` : ''} en esta fecha. Si no es un error, presioná de nuevo
            "Guardar" para confirmarlo igual.
          </span>
        </div>
      )}

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={closeWorkForm}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} disabled={saving}>
          {duplicate && !duplicateAck ? 'Revisar y guardar' : editingEntry ? 'Guardar cambios' : 'Guardar trabajo'}
        </Button>
      </div>
    </Modal>
  )
}
