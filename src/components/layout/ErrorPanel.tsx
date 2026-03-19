import { useState } from 'react'
import { CircleX, TriangleAlert, Info, ChevronDown, ChevronRight } from 'lucide-react'
import { useValidation } from '@/hooks/useValidation'
import { useEditorStore } from '@/store/editor-store'
import { useYamlEditor } from '@/contexts/YamlEditorContext'
import { navigateToError } from '@/utils/navigate-to-error'
import type { ValidationIssue } from '@/validation/types'
import { cn } from '@/lib/utils'

const severityIcon = {
  error: CircleX,
  warning: TriangleAlert,
  info: Info,
} as const

const severityColor = {
  error: 'text-[var(--color-error)]',
  warning: 'text-amber-600',
  info: 'text-[var(--color-text-tertiary)]',
} as const

export function ErrorPanel() {
  const { issues, errorCount, warningCount } = useValidation()
  const setActiveTab = useEditorStore((s) => s.setActiveTab)
  const { revealLine } = useYamlEditor()
  const [expanded, setExpanded] = useState(false)

  // Filter out info-level issues for the panel display
  const actionableIssues = issues.filter((i) => i.severity !== 'info')

  if (actionableIssues.length === 0) return null

  const handleClick = (issue: ValidationIssue) => {
    navigateToError(issue, setActiveTab, revealLine)
  }

  const bgColor = errorCount > 0
    ? 'bg-red-50/80 backdrop-blur-md border-[var(--color-error)]/30'
    : 'bg-amber-50/80 backdrop-blur-md border-amber-300/40'

  return (
    <div className={cn('border-t', bgColor)}>
      {/* Collapsed bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-2 text-[13px] font-semibold hover:bg-white/40 transition-colors"
      >
        {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        <span className="flex items-center gap-2">
          {errorCount > 0 && (
            <span className="text-red-700 flex items-center gap-1.5">
              <CircleX className="w-3.5 h-3.5" />
              {errorCount} {errorCount === 1 ? 'error' : 'errors'}
            </span>
          )}
          {errorCount > 0 && warningCount > 0 && (
            <span className="text-slate-400">|</span>
          )}
          {warningCount > 0 && (
            <span className="text-amber-700 flex items-center gap-1.5">
              <TriangleAlert className="w-3.5 h-3.5" />
              {warningCount} {warningCount === 1 ? 'warning' : 'warnings'}
            </span>
          )}
        </span>
      </button>

      {/* Expanded list */}
      {expanded && (
        <div className="max-h-[200px] overflow-y-auto border-t border-[var(--color-border)]/30">
          {actionableIssues.map((issue, idx) => {
            const Icon = severityIcon[issue.severity]
            return (
              <button
                key={idx}
                onClick={() => handleClick(issue)}
                className="w-full text-left px-4 py-2.5 flex items-start gap-3 hover:bg-white/60 transition-colors border-b border-slate-200/50 last:border-b-0"
              >
                <Icon className={cn('w-[18px] h-[18px] mt-0.5 shrink-0', severityColor[issue.severity])} />
                {issue.line && (
                  <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-white/80 border border-slate-200 text-slate-600 shadow-sm">
                    L{issue.line}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-slate-900 truncate">
                    {issue.message}
                  </div>
                  {issue.fix && (
                    <div className="text-[11px] font-medium text-slate-500 mt-0.5 truncate">
                      {issue.fix}
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
