import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { inputClass } from './ui'

export function BrandCombobox({
  value,
  onChange,
}: {
  value: string
  onChange: (name: string) => void
}) {
  const { brands } = useApp()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => setQuery(value), [value])

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const filtered = brands.filter((b) => b.name.toLowerCase().includes(query.toLowerCase()))
  const exactMatch = brands.some((b) => b.name.toLowerCase() === query.trim().toLowerCase())

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <input
          className={inputClass}
          value={query}
          placeholder="Escribí o elegí una marca"
          onChange={(e) => {
            setQuery(e.target.value)
            onChange(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
        />
        <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-300" />
      </div>
      {open && (
        <div className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-ink-200 bg-white py-1 shadow-card scrollbar-thin dark:border-ink-700 dark:bg-ink-800">
          {filtered.length === 0 && (
            <p className="px-3 py-2 text-xs text-ink-400">No hay marcas que coincidan.</p>
          )}
          {filtered.map((b) => (
            <button
              key={b.id}
              type="button"
              className="flex w-full items-center px-3 py-2 text-left text-sm text-ink-700 hover:bg-brand-50 dark:text-ink-200 dark:hover:bg-ink-700"
              onClick={() => {
                setQuery(b.name)
                onChange(b.name)
                setOpen(false)
              }}
            >
              {b.name}
            </button>
          ))}
          {query.trim() && !exactMatch && (
            <button
              type="button"
              className="flex w-full items-center gap-1.5 border-t border-ink-100 px-3 py-2 text-left text-sm font-medium text-brand-600 hover:bg-brand-50 dark:border-ink-700 dark:text-brand-300 dark:hover:bg-ink-700"
              onClick={() => {
                onChange(query.trim())
                setOpen(false)
              }}
            >
              <Plus size={14} />
              Crear marca "{query.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  )
}
