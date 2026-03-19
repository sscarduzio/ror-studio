import {
  Rocket,
  ShieldCheck,
  Workflow,
  Users,
  KeyRound,
  UserCheck,
  Lock,
  ScrollText,
  Settings,
} from 'lucide-react'
import { useEditorStore } from '@/store/editor-store'
import type { TabId } from '@/schema/types'
import { cn } from '@/lib/utils'
import { useValidation } from '@/hooks/useValidation'
import { useYamlEditor } from '@/contexts/YamlEditorContext'
import { navigateToError } from '@/utils/navigate-to-error'
import type { ValidationIssue } from '@/validation/types'

interface TabDef {
  id: TabId
  label: string
  icon: React.ComponentType<{ className?: string }>
}

interface TabSection {
  header?: string
  tabs: TabDef[]
}

const tabSections: TabSection[] = [
  {
    tabs: [
      { id: 'getting-started', label: 'Getting Started', icon: Rocket },
    ],
  },
  {
    header: 'ACL',
    tabs: [
      { id: 'access-control', label: 'Access Control', icon: ShieldCheck },
      { id: 'acl-flow', label: 'ACL Flow', icon: Workflow },
      { id: 'users-groups', label: 'Users & Groups', icon: Users },
    ],
  },
  {
    header: 'Connectors',
    tabs: [
      { id: 'authentication', label: 'Authentication', icon: KeyRound },
      { id: 'authorization', label: 'Authorization', icon: UserCheck },
    ],
  },
  {
    header: 'Settings',
    tabs: [
      { id: 'ssl-tls', label: 'SSL / TLS', icon: Lock },
      { id: 'audit', label: 'Audit', icon: ScrollText },
      { id: 'advanced', label: 'Advanced', icon: Settings },
    ],
  },
]

function TabBadge({ issues }: { issues: ValidationIssue[] | undefined }) {
  if (!issues || issues.length === 0) return null

  const errors = issues.filter((i) => i.severity === 'error').length
  const warnings = issues.filter((i) => i.severity === 'warning').length

  if (errors > 0) {
    return (
      <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--color-error)] text-white text-[10px] font-bold leading-none">
        {errors}
      </span>
    )
  }

  if (warnings > 0) {
    return (
      <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold leading-none">
        {warnings}
      </span>
    )
  }

  return null
}

export function Sidebar() {
  const activeTab = useEditorStore((s) => s.activeTab)
  const setActiveTab = useEditorStore((s) => s.setActiveTab)
  const { issues, issuesByTab, errorCount, warningCount } = useValidation()
  const { revealLine } = useYamlEditor()

  return (
    <nav className="w-56 min-w-56 flex flex-col bg-transparent mr-2">
      <div className="flex-1 pt-0.5 pb-2 px-3 overflow-y-auto w-full">
        {tabSections.map((section) => (
          <div key={section.header ?? 'top'} className={section.header ? 'mt-6' : ''}>
            {section.header && (
              <div className="px-3 pt-1 pb-2 text-xs font-bold tracking-widest text-slate-500 uppercase">
                {section.header}
              </div>
            )}
            <div className="space-y-1 w-full">
              {section.tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                const tabIssues = issuesByTab.get(tab.id)
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 text-[13px] font-semibold transition-all duration-200 text-left rounded-xl',
                      isActive
                        ? 'bg-white shadow-[0_2px_10px_rgba(0,0,0,0.06)] text-teal-700 border border-slate-200/60'
                        : 'text-slate-600 hover:bg-white/60 hover:text-slate-900 border border-transparent'
                    )}
                  >
                    <Icon className={cn('w-[18px] h-[18px] shrink-0', isActive ? 'text-teal-600' : 'text-slate-400')} />
                    <span className="truncate">{tab.label}</span>
                    <TabBadge issues={tabIssues} />
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Validation summary */}
      <div className="p-4 mx-3 mb-4 rounded-xl glass-panel text-left">
        <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2">
          Validation
        </div>

        {errorCount === 0 && warningCount === 0 ? (
          <div className="text-xs font-medium text-teal-600 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            No issues found
          </div>
        ) : (
          <div className="space-y-1.5 overflow-hidden">
            {errorCount > 0 && (
              <button
                onClick={() => {
                  const first = issues.find((i) => i.severity === 'error')
                  if (first) navigateToError(first, setActiveTab, revealLine)
                }}
                className="flex items-center gap-1.5 w-full text-left text-xs font-semibold text-red-600 hover:text-red-700 transition-colors"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" />
                <span className="truncate">{errorCount} {errorCount === 1 ? 'error' : 'errors'}</span>
              </button>
            )}
            {warningCount > 0 && (
              <button
                onClick={() => {
                  const first = issues.find((i) => i.severity === 'warning')
                  if (first) navigateToError(first, setActiveTab, revealLine)
                }}
                className="flex items-center gap-1.5 w-full text-left text-xs font-semibold text-amber-600 hover:text-amber-700 transition-colors"
              >
                 <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                 <span className="truncate">{warningCount} {warningCount === 1 ? 'warning' : 'warnings'}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
