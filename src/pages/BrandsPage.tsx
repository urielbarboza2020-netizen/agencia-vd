import { useMemo, useState } from 'react'
import { Pencil, Plus, Tags, Trash2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import { Button, Card, ConfirmDialog, EmptyState, Field, Modal, inputClass } from '../components/ui'
import { aggregateProduction, formatMoney } from '../lib/calculations'
import type { Brand } from '../types'

export function BrandsPage() {
  const { brands, entries, addBrand, updateBrand, deleteBrand } = useApp()
  const { push } = useToast()

  const [editing, setEditing] = useState<Brand | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [name, setName] = useState('')
  const [product, setProduct] = useState('')
  const [notes, setNotes] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Brand | null>(null)

  const stats = useMemo(() => {
    const map = new Map<string, { amount: number; count: number; batches: Set<string> }>()
    for (const e of entries) {
      const cur = map.get(e.brandId) ?? { amount: 0, count: 0, batches: new Set<string>() }
      cur.amount += e.total
      cur.count += 1
      if (e.batch) cur.batches.add(e.batch)
      map.set(e.brandId, cur)
    }
    return map
  }, [entries])

  const openCreate = () => {
    setIsCreating(true)
    setName('')
    setProduct('')
    setNotes('')
  }

  const openEdit = (b: Brand) => {
    setEditing(b)
    setName(b.name)
    setProduct(b.product ?? '')
    setNotes(b.notes ?? '')
  }

  const close = () => {
    setIsCreating(false)
    setEditing(null)
  }

  const handleSave = () => {
    if (!name.trim()) return
    if (editing) {
      updateBrand(editing.id, { name: name.trim(), product: product.trim() || undefined, notes: notes.trim() || undefined })
      push('Marca actualizada')
    } else {
      addBrand(name.trim(), product.trim() || undefined, notes.trim() || undefined)
      push('Marca creada')
    }
    close()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500">{brands.length} marca(s) registrada(s)</p>
        <Button onClick={openCreate}>
          <Plus size={16} />
          Nueva marca
        </Button>
      </div>

      {brands.length === 0 ? (
        <EmptyState icon={<Tags size={28} />} title="Todavía no agregaste marcas" action={<Button onClick={openCreate}>Agregar marca</Button>} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((b) => {
            const s = stats.get(b.id)
            const prod = aggregateProduction(entries.filter((e) => e.brandId === b.id))
            return (
              <Card key={b.id} className="flex flex-col">
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-ink-900 dark:text-white">{b.name}</p>
                    {b.product && <p className="text-xs text-ink-400">{b.product}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(b)} className="rounded-md p-1.5 text-ink-400 hover:bg-ink-100 hover:text-brand-600 dark:hover:bg-ink-800">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setPendingDelete(b)} className="rounded-md p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {b.notes && <p className="mb-3 text-xs text-ink-400">{b.notes}</p>}
                <div className="mt-auto grid grid-cols-3 gap-2 border-t border-ink-100 pt-3 text-center dark:border-ink-800">
                  <div>
                    <p className="text-sm font-semibold text-ink-900 dark:text-white">${formatMoney(s?.amount ?? 0)}</p>
                    <p className="text-[11px] text-ink-400">Total</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink-900 dark:text-white">{s?.count ?? 0}</p>
                    <p className="text-[11px] text-ink-400">Trabajos</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink-900 dark:text-white">{s?.batches.size ?? 0}</p>
                    <p className="text-[11px] text-ink-400">Tandas</p>
                  </div>
                </div>
                {(prod.totalBodies > 0 || prod.totalHooks > 0) && (
                  <p className="mt-2 text-[11px] text-ink-400">
                    {prod.totalBodies} cuerpos · {prod.totalHooks} hooks totales
                  </p>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={isCreating || !!editing} onClose={close} title={editing ? 'Editar marca' : 'Nueva marca'}>
        <div className="space-y-4">
          <Field label="Nombre">
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: FLEXLAB" />
          </Field>
          <Field label="Producto o campaña (opcional)">
            <input className={inputClass} value={product} onChange={(e) => setProduct(e.target.value)} />
          </Field>
          <Field label="Notas (opcional)">
            <textarea className={inputClass} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={close}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            Guardar
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Eliminar marca"
        description={`"${pendingDelete?.name}" se eliminará de la lista de marcas. Los trabajos ya registrados con esta marca se conservan en el historial.`}
        confirmLabel="Eliminar"
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            deleteBrand(pendingDelete.id)
            push('Marca eliminada')
          }
          setPendingDelete(null)
        }}
      />
    </div>
  )
}
