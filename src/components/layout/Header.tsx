import { useState, useRef, useEffect } from 'react'
import { Undo2, Redo2, HelpCircle } from 'lucide-react'
import rorLogo from '@/assets/rorSVGlogotipoWhite2020.svg'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { useEditorStore } from '@/store/editor-store'
import type { Edition } from '@/schema/types'
import { cn } from '@/lib/utils'

const editions: { value: Edition; label: string }[] = [
  { value: 'free', label: 'Free' },
  { value: 'pro', label: 'PRO' },
  { value: 'enterprise', label: 'Enterprise' },
]

// ---------------------------------------------------------------------------
// History pill — compact undo/redo with depth indicator
// ---------------------------------------------------------------------------

function HistoryControls() {
  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)
  const pastLen = useEditorStore((s) => s._past.length)
  const futureLen = useEditorStore((s) => s._future.length)
  const hasPast = pastLen > 0
  const hasFuture = futureLen > 0

  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0
  const mod = isMac ? '\u2318' : 'Ctrl+'

  // Depth indicator: show up to 5 dots for undo stack depth
  const undoDots = Math.min(pastLen, 5)
  const redoDots = Math.min(futureLen, 5)

  return (
    <div className="flex items-center gap-1.5">
      {/* History pill */}
      <div
        className="flex items-center rounded-full border border-slate-200/60 bg-white/50 backdrop-blur-md overflow-hidden shadow-sm"
      >
        {/* Undo side */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={undo}
              disabled={!hasPast}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 transition-all duration-200 rounded-l-full',
                hasPast
                  ? 'text-slate-700 hover:bg-white/80 hover:text-slate-900 active:bg-slate-100 active:scale-[0.97]'
                  : 'text-slate-400 cursor-default'
              )}
            >
              <Undo2 className={cn(
                'w-[15px] h-[15px] transition-transform duration-200',
                hasPast && 'group-hover:-translate-x-0.5'
              )} />
              {/* Depth dots */}
              <div className="flex items-center gap-[3px]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'w-[4px] h-[4px] rounded-full transition-all duration-200',
                      i < undoDots
                        ? 'bg-teal-500 scale-100'
                        : 'bg-slate-200 scale-75'
                    )}
                    style={{
                      transitionDelay: `${i * 20}ms`,
                    }}
                  />
                ))}
              </div>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs bg-slate-900 text-white border-slate-800">
            Undo
            <kbd className="ml-2 px-1 py-0.5 rounded bg-white/20 text-[10px] font-mono opacity-90">
              {mod}Z
            </kbd>
            {pastLen > 0 && (
              <span className="ml-1.5 text-[10px] opacity-70">
                ({pastLen} {pastLen === 1 ? 'step' : 'steps'})
              </span>
            )}
          </TooltipContent>
        </Tooltip>

        {/* Divider */}
        <div className="w-px h-4 bg-slate-200" />

        {/* Redo side */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={redo}
              disabled={!hasFuture}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 transition-all duration-200 rounded-r-full',
                hasFuture
                  ? 'text-slate-700 hover:bg-white/80 hover:text-slate-900 active:bg-slate-100 active:scale-[0.97]'
                  : 'text-slate-400 cursor-default'
              )}
            >
              {/* Depth dots */}
              <div className="flex items-center gap-[3px]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'w-[4px] h-[4px] rounded-full transition-all duration-200',
                      i < redoDots
                        ? 'bg-amber-500 scale-100'
                        : 'bg-slate-200 scale-75'
                    )}
                    style={{
                      transitionDelay: `${(4 - i) * 20}ms`,
                    }}
                  />
                ))}
              </div>
              <Redo2 className="w-[15px] h-[15px]" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs bg-slate-900 text-white border-slate-800">
            Redo
            <kbd className="ml-2 px-1 py-0.5 rounded bg-white/20 text-[10px] font-mono opacity-90">
              {mod}Shift+Z
            </kbd>
            {futureLen > 0 && (
              <span className="ml-1.5 text-[10px] opacity-70">
                ({futureLen} {futureLen === 1 ? 'step' : 'steps'})
              </span>
            )}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

export function Header() {
  const edition = useEditorStore((s) => s.edition)
  const setEdition = useEditorStore((s) => s.setEdition)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const shortcutsRef = useRef<HTMLDivElement>(null)

  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0
  const modKey = isMac ? 'Cmd' : 'Ctrl'

  // Close shortcuts popover on outside click
  useEffect(() => {
    if (!showShortcuts) return
    const handler = (e: MouseEvent) => {
      if (shortcutsRef.current && !shortcutsRef.current.contains(e.target as Node)) {
        setShowShortcuts(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showShortcuts])

  return (
    <header className="flex items-center justify-between h-16 px-5 bg-transparent border-b border-transparent z-20">
      {/* Left: Logo + Edition */}
      <div className="flex items-center gap-3">
        <div className="flex items-start group cursor-pointer hover:opacity-100 p-1 pt-2">
          <div
            className="w-[155px] h-[19px] bg-slate-900 transition-transform duration-500 ease-out group-hover:-translate-x-1"
            style={{
              maskImage: `url(${rorLogo})`,
              WebkitMaskImage: `url(${rorLogo})`,
              maskSize: 'contain',
              WebkitMaskSize: 'contain',
              maskRepeat: 'no-repeat',
              WebkitMaskRepeat: 'no-repeat',
              maskPosition: 'left center',
              WebkitMaskPosition: 'left center',
            }}
            aria-label="ReadOnlyREST"
          />
          <span
            className="relative z-20 -ml-10 mt-2.5 text-lg font-bold tracking-tight bg-gradient-to-br from-teal-500 to-sky-500 bg-clip-text text-transparent transition-all duration-500 ease-out group-hover:scale-105"
            style={{ filter: 'drop-shadow(0px 1px 1px rgba(255,255,255,0.85))' }}
          >
            Studio
          </span>
        </div>

        {/* Edition selector */}
        <div className="flex items-center ml-6 p-0.5 rounded-lg border border-slate-200/60 bg-white/40 backdrop-blur-md shadow-sm">
          {editions.map((ed) => (
            <button
              key={ed.value}
              onClick={() => setEdition(ed.value)}
              className={cn(
                'px-3 xl:px-4 py-1.5 text-xs font-bold transition-all duration-200 rounded-md',
                edition === ed.value
                  ? 'bg-white text-teal-700 shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-slate-200/40'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/40 border border-transparent'
              )}
            >
              {ed.label}
            </button>
          ))}
        </div>
      </div>

      {/* Right: History + help */}
      <div className="flex items-center gap-3">
        <HistoryControls />
        <div className="relative" ref={shortcutsRef}>
          <button
            onClick={() => setShowShortcuts(!showShortcuts)}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-white/60 hover:shadow-sm border border-transparent hover:border-slate-200/50 transition-all duration-200"
            aria-label="Keyboard shortcuts"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          {showShortcuts && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-slate-200/60 bg-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] z-30 p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 mb-2 uppercase tracking-wide">
                Shortcuts
              </h4>
              <div className="flex items-center justify-between text-[13px] font-medium text-slate-600">
                <span>Undo</span>
                <kbd className="px-2 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[10px] shadow-sm">
                  {modKey}+Z
                </kbd>
              </div>
              <div className="flex items-center justify-between text-[13px] font-medium text-slate-600">
                <span>Redo</span>
                <kbd className="px-2 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[10px] shadow-sm">
                  {modKey}+Shift+Z
                </kbd>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
