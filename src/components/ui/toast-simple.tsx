import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { Check, X } from 'lucide-react'

interface Toast {
  id: number
  message: string
}

interface ToastContextValue {
  toast: (message: string) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

let nextId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string) => {
    const id = ++nextId
    setToasts((prev) => [...prev, { id, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 2000)
  }, [])

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="toast-enter pointer-events-auto flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2.5 shadow-lg text-sm text-[var(--color-text-primary)]"
          >
            <Check className="w-4 h-4 text-[var(--color-success)] shrink-0" />
            <span>{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              className="ml-2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
