import { ArrowLeft } from 'lucide-react'
import { useEditorStore } from '@/store/editor-store'

export function ReturnBanner() {
  const returnTab = useEditorStore((s) => s.returnTab)

  if (!returnTab) return null

  return (
    <button
      type="button"
      onClick={() => history.back()}
      className="flex items-center gap-2 w-full rounded-md border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5 px-3 py-2 text-xs text-[var(--color-accent)] font-medium hover:bg-[var(--color-accent)]/10 transition-colors"
    >
      <ArrowLeft className="w-3.5 h-3.5" />
      Back to Access Control
    </button>
  )
}
