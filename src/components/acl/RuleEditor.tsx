import { Info, X, AlertTriangle } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { styles } from '@/components/shared-styles'
import { getRuleMeta } from '@/schema/field-meta'
import type { AclRule, RorConfig } from '@/schema/types'
import { StringArrayInput } from '@/components/fields/StringArrayField'
import { useEditorStore } from '@/store/editor-store'
import { AuthKeyEditor, AUTH_KEY_TYPES } from '@/components/acl/AuthKeyEditor'
import { KibanaRuleEditor } from '@/components/acl/KibanaRuleEditor'
import { useConnectorNames } from '@/hooks/useConnectorNames'
import { VariableAwareInput } from '@/components/fields/VariableAwareInput'

// ---------------------------------------------------------------------------
// Connector-referencing rule definitions
// ---------------------------------------------------------------------------

interface ConnectorRefDef {
  configKey: keyof RorConfig
  connectorLabel: string
  targetTab: 'authentication' | 'authorization'
  simple: boolean
  nameField?: string
}

const CONNECTOR_REF_MAP: Record<string, ConnectorRefDef> = {
  ldap_authentication:          { configKey: 'ldaps', connectorLabel: 'LDAP', targetTab: 'authentication', simple: true },
  ldap_authorization:           { configKey: 'ldaps', connectorLabel: 'LDAP', targetTab: 'authentication', simple: false },
  ldap_auth:                    { configKey: 'ldaps', connectorLabel: 'LDAP', targetTab: 'authentication', simple: false },
  jwt_authentication:           { configKey: 'jwt', connectorLabel: 'JWT', targetTab: 'authentication', simple: false },
  jwt_authorization:            { configKey: 'jwt', connectorLabel: 'JWT', targetTab: 'authentication', simple: false },
  jwt_auth:                     { configKey: 'jwt', connectorLabel: 'JWT', targetTab: 'authentication', simple: false },
  ror_kbn_authentication:       { configKey: 'ror_kbn', connectorLabel: 'ROR KBN', targetTab: 'authentication', simple: true },
  ror_kbn_authorization:        { configKey: 'ror_kbn', connectorLabel: 'ROR KBN', targetTab: 'authentication', simple: false },
  ror_kbn_auth:                 { configKey: 'ror_kbn', connectorLabel: 'ROR KBN', targetTab: 'authentication', simple: false },
  external_authentication:      { configKey: 'external_authentication_service_configs', connectorLabel: 'External Authentication', targetTab: 'authentication', simple: true },
  groups_provider_authorization: { configKey: 'user_groups_providers', connectorLabel: 'Groups Provider', targetTab: 'authorization', simple: false, nameField: 'user_groups_provider' },
}

function getConnectorName(value: unknown, nameField: string): string {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && nameField in (value as Record<string, unknown>)) {
    return String((value as Record<string, unknown>)[nameField] ?? '')
  }
  return ''
}

function getGroupsAnyOf(value: unknown): string[] {
  if (value && typeof value === 'object' && 'groups_any_of' in (value as Record<string, unknown>)) {
    const g = (value as Record<string, unknown>).groups_any_of
    return Array.isArray(g) ? g as string[] : []
  }
  return []
}

// ---------------------------------------------------------------------------
// ConnectorSelector
// ---------------------------------------------------------------------------

function ConnectorSelector({
  rule,
  def,
  onChange,
  blockId,
  ruleId,
}: {
  rule: AclRule
  def: ConnectorRefDef
  onChange: (rule: AclRule) => void
  blockId?: string
  ruleId?: string
}) {
  const names = useConnectorNames(def.configKey)
  const navigateWithReturn = useEditorStore((s) => s.navigateWithReturn)
  const nameField = def.nameField ?? 'name'

  const currentName = getConnectorName(rule.value, nameField)

  const manageLink = (
    <button
      type="button"
      onClick={() => navigateWithReturn(def.targetTab, blockId, ruleId)}
      className="text-[var(--color-accent)] hover:underline font-medium text-[10px] whitespace-nowrap"
    >
      {names.length === 0 ? `Create ${def.connectorLabel} connector →` : `Manage ${def.connectorLabel} →`}
    </button>
  )

  if (names.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-dashed border-[var(--color-border)] px-2.5 py-1.5 text-xs text-[var(--color-text-tertiary)]">
        <span>No {def.connectorLabel} connectors.</span>
        {manageLink}
      </div>
    )
  }

  if (def.simple) {
    return (
      <div className="space-y-1.5">
        <select
          value={currentName}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            onChange({ ...rule, value: e.target.value })
          }
          className="w-full rounded-[var(--radius-input)] border border-[var(--color-border)] bg-white px-2.5 py-1.5 text-xs"
        >
          <option value="">Select {def.connectorLabel}...</option>
          {names.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <div className="flex justify-end">{manageLink}</div>
      </div>
    )
  }

  const currentGroups = getGroupsAnyOf(rule.value)

  const handleNameChange = (newName: string) => {
    const obj: Record<string, unknown> = { [nameField]: newName }
    if (currentGroups.length > 0) obj.groups_any_of = currentGroups
    onChange({ ...rule, value: obj })
  }

  const handleGroupsChange = (groups: string[]) => {
    const obj: Record<string, unknown> = { [nameField]: currentName }
    if (groups.length > 0) obj.groups_any_of = groups
    onChange({ ...rule, value: obj })
  }

  return (
    <div className="space-y-1.5">
      <select
        value={currentName}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleNameChange(e.target.value)}
        className="w-full rounded-[var(--radius-input)] border border-[var(--color-border)] bg-white px-2.5 py-1.5 text-xs"
      >
        <option value="">Select {def.connectorLabel}...</option>
        {names.map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>
      <div className="flex items-end justify-between gap-2">
        <div className="flex-1 min-w-0">
          <label className="text-[10px] text-[var(--color-text-tertiary)]">Groups (any of)</label>
          <StringArrayInput
            value={currentGroups}
            onChange={handleGroupsChange}
            placeholder="Add group..."
          />
        </div>
        {manageLink}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ProxyAuthSelector — special handling for proxy_auth: "*" or config name
// ---------------------------------------------------------------------------

function ProxyAuthSelector({
  rule,
  onChange,
  blockId,
  ruleId,
}: {
  rule: AclRule
  onChange: (rule: AclRule) => void
  blockId?: string
  ruleId?: string
}) {
  const names = useConnectorNames('proxy_auth_configs')
  const navigateWithReturn = useEditorStore((s) => s.navigateWithReturn)
  const currentValue = typeof rule.value === 'string' ? rule.value : ''
  const isWildcard = currentValue === '*'

  const manageLink = (
    <button
      type="button"
      onClick={() => navigateWithReturn('authentication', blockId, ruleId)}
      className="text-[var(--color-accent)] hover:underline font-medium text-[10px] whitespace-nowrap"
    >
      Manage configs &rarr;
    </button>
  )

  return (
    <div className="space-y-1.5">
      <select
        value={isWildcard ? '*' : (names.includes(currentValue) ? currentValue : '')}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange({ ...rule, value: e.target.value })}
        className="w-full rounded-[var(--radius-input)] border border-[var(--color-border)] bg-white px-2.5 py-1.5 text-xs"
      >
        <option value="">Select...</option>
        <option value="*">* (any proxied user via X-Forwarded-User header)</option>
        {names.map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>
      <div className="flex justify-end">{manageLink}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// RuleEditor
// ---------------------------------------------------------------------------

export function RuleEditor({ rule, onChange, onRemove, errors, blockId, ruleId }: {
  rule: AclRule
  onChange: (rule: AclRule) => void
  onRemove: () => void
  errors?: import('@/validation/types').ValidationIssue[]
  blockId?: string
  ruleId?: string
}) {
  const meta = getRuleMeta(rule.type)
  const isArrayType = meta?.valueType === 'string[]'
  const isEnumType = meta?.enumValues && meta.enumValues.length > 0
  const connectorDef = CONNECTOR_REF_MAP[rule.type]
  const isAuthKey = AUTH_KEY_TYPES.has(rule.type)

  const hasError = errors && errors.length > 0

  return (
    <div className={cn(
      'group flex items-stretch gap-0 transition-colors rounded-md',
      hasError
        ? 'bg-[var(--color-error-bg)] ring-1 ring-[var(--color-error)]/20'
        : ''
    )}>
      {/* Left accent bar */}
      <div className={cn(
        'w-[3px] shrink-0 rounded-full transition-colors',
        hasError
          ? 'bg-[var(--color-error)]'
          : meta?.deprecated
            ? 'bg-amber-300 group-hover:bg-amber-400'
            : 'bg-[var(--color-accent)]/20 group-hover:bg-[var(--color-accent)]/50'
      )} />

      {/* Content */}
      <div className="flex-1 min-w-0 pl-3 pr-1">
        {/* Label + remove row */}
        <div className="flex items-center justify-between gap-1.5 mb-1">
          <div className="flex items-center gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={cn(
                  'inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide cursor-default',
                  hasError ? 'text-[var(--color-error)]' : 'text-[var(--color-text-tertiary)]'
                )}>
                  {meta?.label || rule.type}
                  {meta?.description && <Info className="w-2.5 h-2.5" />}
                </span>
              </TooltipTrigger>
              {meta?.description && (
                <TooltipContent side="top" className="max-w-xs">
                  {meta.description}
                </TooltipContent>
              )}
            </Tooltip>
            {meta?.tier !== 'free' && (
              <span className={cn(
                'px-1 py-0.5 text-[8px] font-bold rounded leading-none',
                meta?.tier === 'pro' ? styles.tierBadge.pro : styles.tierBadge.ent
              )}>
                {meta?.tier === 'pro' ? 'PRO' : 'ENT'}
              </span>
            )}
            {meta?.deprecated && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200/60 text-amber-600 text-[8px] font-bold uppercase">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    Deprecated
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs">
                  {meta.deprecationHint || 'This rule is deprecated and may be removed in a future version.'}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <button
            onClick={onRemove}
            className="shrink-0 p-0.5 rounded text-[var(--color-text-tertiary)]/0 group-hover:text-[var(--color-text-tertiary)] hover:text-[var(--color-error)] hover:bg-[var(--color-error-bg)] transition-all"
            title="Remove rule"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        {/* Rule value input */}
        {rule.type === 'kibana' ? (
          <KibanaRuleEditor rule={rule} onChange={onChange} />
        ) : isAuthKey ? (
          <AuthKeyEditor rule={rule} onChange={onChange} />
        ) : rule.type === 'proxy_auth' ? (
          <ProxyAuthSelector rule={rule} onChange={onChange} blockId={blockId} ruleId={ruleId} />
        ) : connectorDef ? (
          <ConnectorSelector rule={rule} def={connectorDef} onChange={onChange} blockId={blockId} ruleId={ruleId} />
        ) : isArrayType ? (
          <StringArrayInput
            value={Array.isArray(rule.value) ? rule.value as string[] : rule.value ? [String(rule.value)] : []}
            onChange={(val) => onChange({ ...rule, value: val })}
            placeholder={meta?.placeholder || `Add ${rule.type}...`}
          />
        ) : isEnumType ? (
          <select
            value={String(rule.value || '')}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange({ ...rule, value: e.target.value })}
            className="w-full rounded-[var(--radius-input)] border border-[var(--color-border)] bg-white px-2.5 py-1.5 text-xs"
          >
            <option value="">Select...</option>
            {meta.enumValues!.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        ) : (
          <VariableAwareInput
            value={String(rule.value || '')}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...rule, value: e.target.value })}
            placeholder={meta?.placeholder || `Enter ${rule.type} value...`}
            className="font-mono text-xs h-8"
          />
        )}
      </div>
    </div>
  )
}
