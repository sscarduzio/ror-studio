import { useState } from 'react'
import { VariableAwareInput } from '@/components/fields/VariableAwareInput'
import { cn } from '@/lib/utils'
import { styles } from '@/components/shared-styles'
import { KIBANA_ACCESS_LEVELS } from '@/schema/field-meta'
import type { AclRule } from '@/schema/types'
import { StringArrayInput } from '@/components/fields/StringArrayField'
import { ChevronRight } from 'lucide-react'

interface KibanaRuleValue {
  access?: string
  index?: string
  hide_apps?: string[]
  template_index?: string
  allowed_api_paths?: string[]
  metadata?: unknown
}

type OptionalKibanaField = 'index' | 'hide_apps' | 'template_index' | 'allowed_api_paths' | 'metadata'

function TierBadge({ tier }: { tier: 'pro' | 'ent' }) {
  return (
    <span className={cn('px-1 py-0.5 text-[8px] font-bold rounded leading-none', styles.tierBadge[tier])}>
      {tier === 'pro' ? 'PRO' : 'ENT'}
    </span>
  )
}

function OptionalField({
  label,
  tier,
  active,
  onToggle,
  children,
}: {
  label: string
  tier?: 'pro' | 'ent'
  active: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className={cn(
      'rounded-md border transition-colors',
      active
        ? 'border-[var(--color-border)] bg-white p-2.5'
        : 'border-transparent'
    )}>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'flex items-center gap-1.5 w-full text-left transition-colors',
          active ? 'mb-2' : ''
        )}
      >
        <ChevronRight className={cn(
          'w-3 h-3 transition-transform duration-150 shrink-0',
          active ? 'rotate-90 text-[var(--color-accent)]' : 'text-[var(--color-text-tertiary)]'
        )} />
        <span className={cn(
          'text-[10px] font-semibold uppercase tracking-wide',
          active ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-tertiary)]'
        )}>
          {label}
        </span>
        {tier && <TierBadge tier={tier} />}
        {!active && (
          <span className="ml-auto text-[9px] text-[var(--color-text-tertiary)] opacity-60">
            click to enable
          </span>
        )}
      </button>
      {active && children}
    </div>
  )
}

export function KibanaRuleEditor({ rule, onChange }: { rule: AclRule; onChange: (rule: AclRule) => void }) {
  const val = (rule.value && typeof rule.value === 'object' ? rule.value : {}) as KibanaRuleValue

  // Track which optional fields are enabled (independent of whether they have a value)
  // Initialize from existing data — if a field has a value, it's enabled
  const [enabledFields, setEnabledFields] = useState<Set<OptionalKibanaField>>(() => {
    const initial = new Set<OptionalKibanaField>()
    if (val.index !== undefined) initial.add('index')
    if (val.hide_apps !== undefined) initial.add('hide_apps')
    if (val.template_index !== undefined) initial.add('template_index')
    if (val.allowed_api_paths !== undefined) initial.add('allowed_api_paths')
    if (val.metadata !== undefined) initial.add('metadata')
    return initial
  })

  const emitValue = (merged: KibanaRuleValue) => {
    // Only include fields that are enabled AND have meaningful values
    const clean: Record<string, unknown> = {}
    if (merged.access) clean.access = merged.access
    if (enabledFields.has('index') && merged.index) clean.index = merged.index
    if (enabledFields.has('hide_apps') && merged.hide_apps && merged.hide_apps.length > 0) clean.hide_apps = merged.hide_apps
    if (enabledFields.has('template_index') && merged.template_index) clean.template_index = merged.template_index
    if (enabledFields.has('allowed_api_paths') && merged.allowed_api_paths && merged.allowed_api_paths.length > 0) clean.allowed_api_paths = merged.allowed_api_paths
    if (enabledFields.has('metadata') && merged.metadata !== undefined && merged.metadata !== '') clean.metadata = merged.metadata
    onChange({ ...rule, value: Object.keys(clean).length > 0 ? clean : {} })
  }

  const update = (patch: Partial<KibanaRuleValue>) => {
    emitValue({ ...val, ...patch })
  }

  const toggleField = (field: OptionalKibanaField) => {
    const next = new Set(enabledFields)
    if (next.has(field)) {
      next.delete(field)
      // Remove the field value when disabling
      const nextVal = { ...val }
      delete nextVal[field]
      setEnabledFields(next)
      // Emit without this field
      const clean: Record<string, unknown> = {}
      if (nextVal.access) clean.access = nextVal.access
      if (next.has('index') && nextVal.index) clean.index = nextVal.index
      if (next.has('hide_apps') && nextVal.hide_apps && nextVal.hide_apps.length > 0) clean.hide_apps = nextVal.hide_apps
      if (next.has('template_index') && nextVal.template_index) clean.template_index = nextVal.template_index
      if (next.has('allowed_api_paths') && nextVal.allowed_api_paths && nextVal.allowed_api_paths.length > 0) clean.allowed_api_paths = nextVal.allowed_api_paths
      if (next.has('metadata') && nextVal.metadata !== undefined && nextVal.metadata !== '') clean.metadata = nextVal.metadata
      onChange({ ...rule, value: Object.keys(clean).length > 0 ? clean : {} })
    } else {
      next.add(field)
      setEnabledFields(next)
      // Don't emit yet — field is enabled but empty, user will fill it in
    }
  }

  const metadataStr = val.metadata !== undefined ? (typeof val.metadata === 'string' ? val.metadata : JSON.stringify(val.metadata, null, 2)) : ''

  return (
    <div className="space-y-1.5">
      {/* Access — always visible, required */}
      <div>
        <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)] mb-1">
          Access
        </label>
        <select
          value={val.access || ''}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => update({ access: e.target.value || undefined })}
          className="w-full rounded-[var(--radius-input)] border border-[var(--color-border)] bg-white px-2.5 py-1.5 text-xs"
        >
          <option value="">Select access level...</option>
          {KIBANA_ACCESS_LEVELS.map((lvl) => (
            <option key={lvl.value} value={lvl.value}>{lvl.label} — {lvl.description}</option>
          ))}
        </select>
      </div>

      {/* Optional fields — toggleable */}
      <OptionalField label="Index" tier="ent" active={enabledFields.has('index')} onToggle={() => toggleField('index')}>
        <VariableAwareInput
          value={val.index || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => update({ index: e.target.value || undefined })}
          placeholder=".kibana_username"
          className="font-mono text-xs h-8"
          autoFocus
        />
      </OptionalField>

      <OptionalField label="Hide Apps" tier="pro" active={enabledFields.has('hide_apps')} onToggle={() => toggleField('hide_apps')}>
        <StringArrayInput
          value={val.hide_apps || []}
          onChange={(v) => update({ hide_apps: v.length > 0 ? v : undefined })}
          placeholder="e.g. Enterprise Search|Overview"
        />
      </OptionalField>

      <OptionalField label="Template Index" tier="ent" active={enabledFields.has('template_index')} onToggle={() => toggleField('template_index')}>
        <VariableAwareInput
          value={val.template_index || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => update({ template_index: e.target.value || undefined })}
          placeholder=".kibana_template"
          className="font-mono text-xs h-8"
          autoFocus
        />
      </OptionalField>

      <OptionalField label="Allowed API Paths" active={enabledFields.has('allowed_api_paths')} onToggle={() => toggleField('allowed_api_paths')}>
        <StringArrayInput
          value={val.allowed_api_paths || []}
          onChange={(v) => update({ allowed_api_paths: v.length > 0 ? v : undefined })}
          placeholder="/api/saved_objects/*"
        />
      </OptionalField>

      <OptionalField label="Metadata" tier="ent" active={enabledFields.has('metadata')} onToggle={() => toggleField('metadata')}>
        <textarea
          value={metadataStr}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
            const raw = e.target.value
            if (!raw.trim()) {
              update({ metadata: undefined })
              return
            }
            try {
              update({ metadata: JSON.parse(raw) })
            } catch {
              update({ metadata: raw })
            }
          }}
          placeholder='{"key": "value"}'
          rows={3}
          autoFocus
          className="w-full rounded-[var(--radius-input)] border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-1.5 text-xs font-mono resize-y focus:border-[var(--color-border-focus)] focus:shadow-[var(--shadow-focus)] transition-all duration-150 outline-none"
        />
      </OptionalField>
    </div>
  )
}
