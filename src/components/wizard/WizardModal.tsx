import { useState, useMemo } from 'react'
import {
  Shield,
  Users,
  Network,
  Key,
  ChevronRight,
  ChevronLeft,
  Check,
  Lock,
  BookOpen,
  Pencil,
  ShieldCheck,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useEditorStore } from '@/store/editor-store'
import { useToast } from '@/components/ui/toast-simple'
import { cn } from '@/lib/utils'
import { styles } from '@/components/shared-styles'
import type { AccessControlBlock } from '@/schema/types'
import {
  type AuthMethod,
  type AccessLevel,
  type WizardState,
  STEP_LABELS,
  TOTAL_STEPS,
  NAME_SUGGESTIONS,
  authMethodLabel,
  accessLevelLabel,
  buildRules,
  generateYamlPreview,
} from './wizard-helpers'

/* ------------------------------------------------------------------ */
/*  Auth method cards data                                             */
/* ------------------------------------------------------------------ */

const AUTH_OPTIONS: {
  id: AuthMethod
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  {
    id: 'auth_key',
    title: 'Username & Password',
    description: 'Simple credentials-based authentication',
    icon: Key,
  },
  {
    id: 'groups_any_of',
    title: 'Group Membership',
    description: 'Authorize by user group membership',
    icon: Users,
  },
  {
    id: 'ldap_authentication',
    title: 'LDAP',
    description: 'Authenticate against an LDAP directory',
    icon: Network,
  },
  {
    id: 'jwt_auth',
    title: 'JWT',
    description: 'JSON Web Token based authentication',
    icon: ShieldCheck,
  },
]

/* ------------------------------------------------------------------ */
/*  Index pattern chips                                                */
/* ------------------------------------------------------------------ */

const INDEX_CHIPS = ['*', 'logstash-*', 'filebeat-*']

/* ------------------------------------------------------------------ */
/*  Access level cards data                                            */
/* ------------------------------------------------------------------ */

const ACCESS_OPTIONS: {
  id: AccessLevel
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  {
    id: 'read-only',
    title: 'Read Only',
    description: 'Can search and view indices',
    icon: BookOpen,
  },
  {
    id: 'read-write',
    title: 'Read-Write',
    description: 'Can search, index, update, and delete documents',
    icon: Pencil,
  },
  {
    id: 'full-admin',
    title: 'Full Admin',
    description: 'Unrestricted access to all cluster operations',
    icon: Shield,
  },
]

/* ------------------------------------------------------------------ */
/*  Selectable Card (reusable)                                         */
/* ------------------------------------------------------------------ */

function SelectableCard({
  selected,
  onClick,
  icon: Icon,
  title,
  badge,
  description,
}: {
  selected: boolean
  onClick: () => void
  icon: React.ComponentType<{ className?: string }>
  title: string
  badge?: string
  description: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'text-left rounded-[var(--radius-card)] border-2 p-4 transition-all duration-150',
        selected
          ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5 shadow-sm'
          : 'border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-accent)]/40'
      )}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <Icon
          className={cn(
            'w-4 h-4',
            selected ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-tertiary)]'
          )}
        />
        <span className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</span>
        {badge && (
          <span className="ml-auto text-[10px] font-bold text-[var(--color-accent)] bg-[var(--color-accent)]/10 px-1.5 py-0.5 rounded">
            {badge}
          </span>
        )}
      </div>
      <p className="text-xs text-[var(--color-text-secondary)]">{description}</p>
      {selected && (
        <div className="mt-2 flex items-center gap-1 text-xs font-medium text-[var(--color-accent)]">
          <Check className="w-3 h-3" />
          Selected
        </div>
      )}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Progress Bar                                                       */
/* ------------------------------------------------------------------ */

function ProgressBar({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center gap-1 mb-6">
      {STEP_LABELS.map((label, i) => {
        const stepNum = i + 1
        const isActive = stepNum === currentStep
        const isCompleted = stepNum < currentStep
        return (
          <div key={label} className="flex-1 flex flex-col items-center gap-1.5">
            <div
              className={cn(
                'h-1.5 w-full rounded-full transition-colors',
                isCompleted
                  ? 'bg-[var(--color-accent)]'
                  : isActive
                    ? 'bg-[var(--color-accent)]/60'
                    : 'bg-[var(--color-border)]'
              )}
            />
            <span
              className={cn(
                'text-[10px] font-medium',
                isActive
                  ? 'text-[var(--color-accent)]'
                  : isCompleted
                    ? 'text-[var(--color-text-secondary)]'
                    : 'text-[var(--color-text-tertiary)]'
              )}
            >
              {stepNum}. {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Step Components                                                    */
/* ------------------------------------------------------------------ */

function StepWelcome() {
  return (
    <div className="space-y-4">
      <div className="w-12 h-12 rounded-xl bg-[var(--color-accent)]/10 flex items-center justify-center mx-auto">
        <Lock className="w-6 h-6 text-[var(--color-accent)]" />
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
          Let's secure your Elasticsearch
        </h3>
        <p className="text-sm text-[var(--color-text-secondary)] max-w-md mx-auto leading-relaxed">
          ReadOnlyREST protects your Elasticsearch cluster using <strong>access control blocks</strong>.
          Each block defines <em>who</em> can access <em>what data</em> and <em>how</em>.
        </p>
        <p className="text-sm text-[var(--color-text-secondary)] max-w-md mx-auto leading-relaxed">
          This wizard will walk you through creating your first rule in under a minute.
          You can always edit it later in the full editor.
        </p>
      </div>
    </div>
  )
}

function StepName({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
          Name your rule
        </h3>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Give this access control block a descriptive name.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="wizard-block-name">Block name</Label>
        <Input
          id="wizard-block-name"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. admin_access"
          autoFocus
        />
      </div>

      <div className="space-y-1.5">
        <span className={styles.fieldLabel}>Suggestions</span>
        <div className="flex flex-wrap gap-2">
          {NAME_SUGGESTIONS.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => onChange(name)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                value === name
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                  : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]/40'
              )}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function StepAuth({
  value,
  onChange,
}: {
  value: AuthMethod | null
  onChange: (v: AuthMethod) => void
}) {
  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
          Choose authentication
        </h3>
        <p className="text-sm text-[var(--color-text-secondary)]">
          How should users prove their identity?
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {AUTH_OPTIONS.map((opt) => (
          <SelectableCard
            key={opt.id}
            selected={value === opt.id}
            onClick={() => onChange(opt.id)}
            icon={opt.icon}
            title={opt.title}
            badge="Free"
            description={opt.description}
          />
        ))}
      </div>
    </div>
  )
}

function StepPermissions({
  indexPattern,
  onIndexChange,
  accessLevel,
  onAccessChange,
}: {
  indexPattern: string
  onIndexChange: (v: string) => void
  accessLevel: AccessLevel | null
  onAccessChange: (v: AccessLevel) => void
}) {
  return (
    <div className="space-y-5">
      <div className="text-center space-y-1">
        <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
          Set permissions
        </h3>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Which indices can be accessed, and at what level?
        </p>
      </div>

      {/* Index pattern */}
      <div className="space-y-2">
        <Label htmlFor="wizard-index-pattern">Index pattern</Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {INDEX_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => onIndexChange(chip)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-mono font-medium border transition-colors',
                indexPattern === chip
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                  : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]/40'
              )}
            >
              {chip}
            </button>
          ))}
        </div>
        <Input
          id="wizard-index-pattern"
          value={indexPattern}
          onChange={(e) => onIndexChange(e.target.value)}
          placeholder="Custom pattern, e.g. my-index-*"
          className="font-mono text-xs"
        />
      </div>

      {/* Access level */}
      <div className="space-y-2">
        <Label>Access level</Label>
        <div className="grid grid-cols-3 gap-3">
          {ACCESS_OPTIONS.map((opt) => (
            <SelectableCard
              key={opt.id}
              selected={accessLevel === opt.id}
              onClick={() => onAccessChange(opt.id)}
              icon={opt.icon}
              title={opt.title}
              description={opt.description}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function StepReview({ state }: { state: WizardState }) {
  const yamlPreview = useMemo(() => generateYamlPreview(state), [state])

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
          Review your rule
        </h3>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Here's what will be created. You can edit everything later.
        </p>
      </div>

      {/* Summary card */}
      <div className={styles.cardWithSpaceTight}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className={styles.fieldLabel}>Block Name</span>
            <p className="text-sm font-medium text-[var(--color-text-primary)] mt-0.5">
              {state.blockName || '(unnamed)'}
            </p>
          </div>
          <div>
            <span className={styles.fieldLabel}>Authentication</span>
            <p className="text-sm font-medium text-[var(--color-text-primary)] mt-0.5">
              {state.authMethod ? authMethodLabel(state.authMethod) : '(none)'}
            </p>
          </div>
          <div>
            <span className={styles.fieldLabel}>Index Pattern</span>
            <p className="text-sm font-mono font-medium text-[var(--color-text-primary)] mt-0.5">
              {state.indexPattern || '*'}
            </p>
          </div>
          <div>
            <span className={styles.fieldLabel}>Access Level</span>
            <p className="text-sm font-medium text-[var(--color-text-primary)] mt-0.5">
              {state.accessLevel ? accessLevelLabel(state.accessLevel) : '(none)'}
            </p>
          </div>
        </div>
      </div>

      {/* YAML preview */}
      <div>
        <span className={styles.fieldLabel}>Generated YAML</span>
        <pre className="mt-1.5 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-xs font-mono text-[var(--color-text-secondary)] overflow-x-auto">
          {yamlPreview}
        </pre>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main WizardModal                                                   */
/* ------------------------------------------------------------------ */

export function WizardModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const addBlock = useEditorStore((s) => s.addBlock)
  const setActiveTab = useEditorStore((s) => s.setActiveTab)
  const setWizardSeen = useEditorStore((s) => s.setWizardSeen)
  const { toast } = useToast()

  const [step, setStep] = useState(1)
  const [state, setState] = useState<WizardState>({
    blockName: '',
    authMethod: null,
    indexPattern: '*',
    accessLevel: null,
  })

  const updateField = <K extends keyof WizardState>(key: K, value: WizardState[K]) => {
    setState((prev) => ({ ...prev, [key]: value }))
  }

  const canProceed = (): boolean => {
    switch (step) {
      case 1:
        return true
      case 2:
        return state.blockName.trim().length > 0
      case 3:
        return state.authMethod !== null
      case 4:
        return state.indexPattern.trim().length > 0 && state.accessLevel !== null
      case 5:
        return true
      default:
        return false
    }
  }

  const handleNext = () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleSkip = () => {
    setWizardSeen(true)
    onOpenChange(false)
    resetWizard()
  }

  const handleCreate = () => {
    const block: AccessControlBlock = {
      id: crypto.randomUUID(),
      name: state.blockName.trim() || 'New Rule',
      type: 'allow',
      enabled: true,
      rules: buildRules(state),
    }

    addBlock(block)
    setWizardSeen(true)
    setActiveTab('access-control')
    onOpenChange(false)
    resetWizard()
    toast('Rule created')
  }

  const resetWizard = () => {
    setStep(1)
    setState({
      blockName: '',
      authMethod: null,
      indexPattern: '*',
      accessLevel: null,
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) resetWizard()
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent
        className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto"
        showCloseButton={false}
      >
        {/* Accessible title (visually hidden for screen readers) */}
        <DialogTitle className="sr-only">First-Time Setup Wizard</DialogTitle>
        <DialogDescription className="sr-only">
          A 5-step guided wizard to create your first access control rule.
        </DialogDescription>

        {/* Progress bar */}
        <ProgressBar currentStep={step} />

        {/* Step content */}
        <div className="min-h-[280px]">
          {step === 1 && <StepWelcome />}
          {step === 2 && (
            <StepName
              value={state.blockName}
              onChange={(v) => updateField('blockName', v)}
            />
          )}
          {step === 3 && (
            <StepAuth
              value={state.authMethod}
              onChange={(v) => updateField('authMethod', v)}
            />
          )}
          {step === 4 && (
            <StepPermissions
              indexPattern={state.indexPattern}
              onIndexChange={(v) => updateField('indexPattern', v)}
              accessLevel={state.accessLevel}
              onAccessChange={(v) => updateField('accessLevel', v)}
            />
          )}
          {step === 5 && <StepReview state={state} />}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]">
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] underline underline-offset-2 transition-colors"
          >
            Skip wizard, go to editor
          </button>

          <div className="flex items-center gap-2">
            {step > 1 && (
              <Button variant="outline" size="sm" onClick={handleBack}>
                <ChevronLeft className="w-3.5 h-3.5" />
                Back
              </Button>
            )}

            {step < TOTAL_STEPS ? (
              <Button
                size="sm"
                onClick={handleNext}
                disabled={!canProceed()}
                className="bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-white"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleCreate}
                className="bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-white"
              >
                <Check className="w-3.5 h-3.5" />
                Create Rule
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
