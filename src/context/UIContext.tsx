import { createContext, useContext, useState, type ReactNode } from 'react'

interface UIContextValue {
  isWorkFormOpen: boolean
  editingEntryId: string | null
  openWorkForm: (entryId?: string) => void
  closeWorkForm: () => void

  isQuickTextOpen: boolean
  openQuickText: () => void
  closeQuickText: () => void
}

const UIContext = createContext<UIContextValue | null>(null)

export function UIProvider({ children }: { children: ReactNode }) {
  const [isWorkFormOpen, setWorkFormOpen] = useState(false)
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [isQuickTextOpen, setQuickTextOpen] = useState(false)

  const openWorkForm = (entryId?: string) => {
    setEditingEntryId(entryId ?? null)
    setWorkFormOpen(true)
  }
  const closeWorkForm = () => {
    setWorkFormOpen(false)
    setEditingEntryId(null)
  }

  return (
    <UIContext.Provider
      value={{
        isWorkFormOpen,
        editingEntryId,
        openWorkForm,
        closeWorkForm,
        isQuickTextOpen,
        openQuickText: () => setQuickTextOpen(true),
        closeQuickText: () => setQuickTextOpen(false),
      }}
    >
      {children}
    </UIContext.Provider>
  )
}

export function useUI() {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI debe usarse dentro de UIProvider')
  return ctx
}
