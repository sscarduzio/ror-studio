import { useRef, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { ViewModeDef } from './acl-view-modes'

interface ViewModeToggleProps<T extends string> {
  modes: readonly { id: T; label: string; icon: ViewModeDef['icon'] }[]
  value: T
  onChange: (value: T) => void
}

export function ViewModeToggle<T extends string>({ modes, value, onChange }: ViewModeToggleProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pillStyle, setPillStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const activeBtn = container.querySelector(`[data-mode="${value}"]`) as HTMLElement | null
    if (activeBtn) {
      setPillStyle({
        left: activeBtn.offsetLeft,
        width: activeBtn.offsetWidth,
      })
    }
  }, [value])

  return (
    <div ref={containerRef} className="relative flex items-center p-1 rounded-full bg-slate-100/80 border border-slate-200/50">
      {/* Sliding pill */}
      <div
        className="absolute top-1 bottom-1 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-slate-200/60 transition-all duration-250 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ left: pillStyle.left, width: pillStyle.width }}
      />
      {modes.map((mode) => {
        const Icon = mode.icon
        return (
          <button
            key={mode.id}
            data-mode={mode.id}
            onClick={() => onChange(mode.id)}
            className={cn(
              'relative z-10 flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold tracking-wide transition-colors duration-150 rounded-full select-none',
              value === mode.id
                ? 'text-teal-700'
                : 'text-slate-400 hover:text-slate-600'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {mode.label}
          </button>
        )
      })}
    </div>
  )
}
