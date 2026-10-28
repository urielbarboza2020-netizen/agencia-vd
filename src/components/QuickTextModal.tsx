import { useState } from 'react'
import { AlertCircle, Sparkles, Trash2 } from 'lucide-react'
import { useUI } from '../context/UIContext'
import { useApp } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import { Button, Field, Modal, inputClass } from './ui'
import { parseQuickText, type ParsedDraft } from '../lib/textParser'
import { computeAmount, formatMoney } from '../lib/calculations'
import type { WorkType } from '../types'

export function QuickTextModal() {
  const { isQuickTextOpen, closeQuickText } = useUI()
  const { brands, rates, findOrCreateBrand, addEntry } = useApp()
  const { push } = useToast()

  const [text, setText] = useState('')
  const [drafts, setDrafts] = useState<ParsedDraft[]>([])
  const [stage, setStage] = useState<'input' | 'preview'>('input')

  const handleParse = () => {
    const parsed = parseQuickText(text, brands)
    if (parsed.length === 0) {
      push('No se detectaron trabajos (H, G o CBO) en el texto', 'error')
      return
    }
    setDrafts(parsed)
    setStage('preview')
  }

  const updateDraft = (id: string, patch: Partial<ParsedDraft>) => {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)))
  }

  const removeDraft = (id: string) => setDrafts((prev) => prev.filter((d) => d.id !== id))

  const close = () => {
    closeQuickText()
    setText('')
    setDrafts([])
    setStage('input')
  }

  const readyDrafts = drafts.filter((d) => d.brandName && d.type && d.quantity && d.quantity > 0)
  const incompleteCount = drafts.length - readyDrafts.length

  const handleConfirm = () => {
    for (const d of readyDrafts) {
      const brand = findOrCreateBrand(d.brandName!)
      addEntry({
        date: d.date,
        brandId: brand.id,
        brandName: brand.name,
        type: d.type!,
        quantity: d.quantity!,
        batch: d.batch ?? undefined,
      })
    }
    push(`${readyDrafts.length} trabajo(s) guardado(s) desde el texto`)
    close()
  }

  return (
    <Modal open={isQuickTextOpen} onClose={close} title="Registro rápido por texto" wide>
      {stage === 'input' && (
        <div>
          <p className="mb-3 text-sm text-ink-500 dark:text-ink-400">
            Escribí en lenguaje natural los trabajos que hiciste. Ejemplo: "Hoy hice 4 H de FLEXLAB, tanda 1. También 1
            G de ANDARA, tanda 10."
          </p>
          <textarea
            className={inputClass}
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Hoy hice 4 H de FLEXLAB, tanda 1. También hice 1 G de ANDARA, tanda 10..."
          />
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={close}>
              Cancelar
            </Button>
            <Button onClick={handleParse} disabled={!text.trim()}>
              <Sparkles size={16} />
              Analizar texto
            </Button>
          </div>
        </div>
      )}

      {stage === 'preview' && (
        <div>
          <p className="mb-3 text-sm text-ink-500 dark:text-ink-400">
            Revisá cada trabajo detectado antes de guardar. Completá los campos que falten — no se inventa ningún
            dato.
          </p>
          <div className="space-y-3">
            {drafts.map((d) => {
              const incomplete = !d.brandName || !d.type || !d.quantity
              const total = d.type && d.quantity ? computeAmount(d.type, d.quantity, rates) : 0
              return (
                <div
                  key={d.id}
                  className={`rounded-xl border p-3 ${
                    incomplete
                      ? 'border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10'
                      : 'border-ink-200 bg-white dark:border-ink-700 dark:bg-ink-800/60'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs italic text-ink-400">"{d.rawText}"</p>
                    <button onClick={() => removeDraft(d.id)} className="text-ink-300 hover:text-red-500">
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    <Field label="Marca">
                      <input
                        className={inputClass}
                        value={d.brandName ?? ''}
                        onChange={(e) => updateDraft(d.id, { brandName: e.target.value, missingBrand: !e.target.value })}
                        placeholder="Requerido"
                      />
                    </Field>
                    <Field label="Tipo">
                      <select
                        className={inputClass}
                        value={d.type ?? ''}
                        onChange={(e) => updateDraft(d.id, { type: (e.target.value || null) as WorkType | null })}
                      >
                        <option value="">-</option>
                        <option value="H">H</option>
                        <option value="G">G</option>
                        <option value="CBO">CBO</option>
                      </select>
                    </Field>
                    <Field label="Cantidad">
                      <input
                        type="number"
                        min={1}
                        className={inputClass}
                        value={d.quantity ?? ''}
                        onChange={(e) => updateDraft(d.id, { quantity: e.target.value ? Number(e.target.value) : null })}
                        placeholder="Requerido"
                      />
                    </Field>
                    <Field label="Tanda">
                      <input
                        className={inputClass}
                        value={d.batch ?? ''}
                        onChange={(e) => updateDraft(d.id, { batch: e.target.value || null })}
                        placeholder="Opcional"
                      />
                    </Field>
                    <Field label="Fecha">
                      <input type="date" className={inputClass} value={d.date} onChange={(e) => updateDraft(d.id, { date: e.target.value })} />
                    </Field>
                  </div>
                  <p className="mt-2 text-sm font-medium text-brand-700 dark:text-brand-300">
                    Importe: ${formatMoney(total)}
                  </p>
                </div>
              )
            })}
          </div>

          {incompleteCount > 0 && (
            <div className="mt-3 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
              <AlertCircle size={16} />
              {incompleteCount} trabajo(s) con datos incompletos no se guardarán hasta que los completes.
            </div>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setStage('input')}>
              Volver
            </Button>
            <Button onClick={handleConfirm} disabled={readyDrafts.length === 0}>
              Confirmar y guardar ({readyDrafts.length})
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
