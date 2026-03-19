import { useState } from 'react'
import { Plus, Trash2, Users, ChevronRight, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { useEditorStore } from '@/store/editor-store'
import { StringArrayInput } from '@/components/fields/StringArrayField'
import { styles } from '@/components/shared-styles'
import { cn } from '@/lib/utils'
import type { UserDefinition, AclRule, RuleType } from '@/schema/types'
import { useConnectorNames } from '@/hooks/useConnectorNames'
import { AuthKeyEditor } from '@/components/acl/AuthKeyEditor'
import { EMPTY_USERS } from '@/schema/empty-defaults'
import {
  type AuthMethod,
  AUTH_METHODS,
  AUTH_KEY_METHODS,
  COMBINED_AUTH_METHODS,
  userFields,
  detectAuthMethod,
  clearAuthFields,
} from '@/schema/auth-registry'

// ---------------------------------------------------------------------------
// AuthKeyEditor adapter for UserDefinition string properties
// ---------------------------------------------------------------------------

function UserAuthKeyEditor({ method, value, onChange }: {
  method: string; value: string; onChange: (v: string) => void
}) {
  const rule: AclRule = { type: method as RuleType, value }
  return <AuthKeyEditor rule={rule} onChange={(r) => onChange(r.value as string)} />
}

// ---------------------------------------------------------------------------
// UserCard — individual user editor
// ---------------------------------------------------------------------------

function UserCard({ user, index, onUpdate, onRemove }: {
  user: UserDefinition
  index: number
  onUpdate: (user: UserDefinition) => void
  onRemove: () => void
}) {
  const [expanded, setExpanded] = useState(true)
  const method = detectAuthMethod(user)

  const ldapNames = useConnectorNames('ldaps')
  const jwtNames = useConnectorNames('jwt')
  const rorKbnNames = useConnectorNames('ror_kbn')
  const proxyAuthNames = useConnectorNames('proxy_auth_configs')
  const extAuthNames = useConnectorNames('external_authentication_service_configs')
  const groupsProviderNames = useConnectorNames('user_groups_providers')

  const navigateWithReturn = useEditorStore((s) => s.navigateWithReturn)

  const handleMethodChange = (newMethod: AuthMethod | '') => {
    const cleaned = clearAuthFields(user)
    if (!newMethod) {
      onUpdate(cleaned)
      return
    }
    if (AUTH_KEY_METHODS.has(newMethod)) {
      ;userFields(cleaned)[newMethod] = ''
    } else if (COMBINED_AUTH_METHODS.has(newMethod)) {
      ;userFields(cleaned)[newMethod] = { name: '' }
    } else if (newMethod === 'ldap_authentication') {
      cleaned.ldap_authentication = ''
    } else if (newMethod === 'proxy_auth') {
      cleaned.proxy_auth = '*'
    } else if (newMethod === 'external_authentication') {
      cleaned.external_authentication = ''
    }
    onUpdate(cleaned)
  }

  const handleAuthKeyChange = (value: string) => {
    if (AUTH_KEY_METHODS.has(method)) {
      onUpdate({ ...user, [method]: value })
    }
  }

  const handleConnectorNameChange = (name: string) => {
    if (COMBINED_AUTH_METHODS.has(method)) {
      const current = userFields(user)[method] as Record<string, unknown> ?? {}
      onUpdate({ ...user, [method]: { ...current, name } })
    } else if (method === 'ldap_authentication') {
      onUpdate({ ...user, ldap_authentication: name })
    } else if (method === 'external_authentication') {
      onUpdate({ ...user, external_authentication: name })
    } else if (method === 'proxy_auth') {
      onUpdate({ ...user, proxy_auth: name })
    }
  }

  const handleGroupsFilterChange = (field: 'groups_any_of' | 'groups_all_of', values: string[]) => {
    if (COMBINED_AUTH_METHODS.has(method)) {
      const current = userFields(user)[method] as Record<string, unknown> ?? {}
      const updated = { ...current }
      if (values.length > 0) {
        updated[field] = values
      } else {
        delete updated[field]
      }
      onUpdate({ ...user, [method]: updated })
    }
  }

  const connectorNameOptions = (() => {
    if (method === 'ldap_auth' || method === 'ldap_authentication') return ldapNames
    if (method === 'jwt_auth') return jwtNames
    if (method === 'ror_kbn_auth') return rorKbnNames
    if (method === 'proxy_auth') return proxyAuthNames
    if (method === 'external_authentication') return extAuthNames
    return []
  })()

  const connectorTargetTab = (() => {
    if (method === 'ldap_auth' || method === 'ldap_authentication') return 'authentication' as const
    if (method === 'jwt_auth') return 'authentication' as const
    if (method === 'ror_kbn_auth') return 'authentication' as const
    if (method === 'proxy_auth') return 'authentication' as const
    if (method === 'external_authentication') return 'authentication' as const
    return null
  })()

  const currentConnectorName = (() => {
    if (AUTH_KEY_METHODS.has(method)) return ''
    if (COMBINED_AUTH_METHODS.has(method)) {
      const val = userFields(user)[method]
      return val && typeof val === 'object' ? (val as Record<string, unknown>).name as string ?? '' : ''
    }
    if (method === 'ldap_authentication') {
      const val = user.ldap_authentication
      return typeof val === 'string' ? val : val?.name ?? ''
    }
    if (method === 'external_authentication') {
      const val = user.external_authentication
      return typeof val === 'string' ? val : val?.service ?? ''
    }
    if (method === 'proxy_auth') return user.proxy_auth ?? ''
    return ''
  })()

  const currentGroupsFilter = (() => {
    if (!COMBINED_AUTH_METHODS.has(method)) return { any: [] as string[], all: [] as string[] }
    const val = userFields(user)[method] as Record<string, unknown> | undefined
    return {
      any: Array.isArray(val?.groups_any_of) ? val.groups_any_of as string[] : [],
      all: Array.isArray(val?.groups_all_of) ? val.groups_all_of as string[] : [],
    }
  })()

  const displayName = Array.isArray(user.username)
    ? user.username.join(', ')
    : user.username || 'New User'

  return (
    <div id={`user-${index}`} className={styles.card}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 p-0.5 rounded text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-gray-100 transition-all"
        >
          <ChevronRight className={cn('w-4 h-4 transition-transform duration-150', expanded && 'rotate-90')} />
        </button>
        <button onClick={() => setExpanded(!expanded)} className="flex-1 text-left min-w-0">
          <span className="text-sm font-semibold text-[var(--color-text-primary)] truncate block">
            {displayName}
          </span>
        </button>
        {method && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-[var(--color-text-secondary)] shrink-0">
            {AUTH_METHODS.find((m) => m.value === method)?.label ?? method}
          </span>
        )}
      </div>

      {expanded && (
        <div className="mt-3 space-y-4">
          {/* Username */}
          <div>
            <Label className={styles.fieldLabel}>
              Username
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 ml-1 inline text-[var(--color-text-tertiary)]" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  Username or pattern to match. Use * as wildcard (e.g. *@example.com). Supports multiple comma-separated values.
                </TooltipContent>
              </Tooltip>
            </Label>
            <Input
              value={Array.isArray(user.username) ? user.username.join(', ') : user.username}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdate({ ...user, username: e.target.value })}
              placeholder="e.g. admin, *@example.com, *"
              className="mt-1 font-mono text-sm"
            />
          </div>

          {/* Authentication method selector */}
          <div>
            <Label className={styles.fieldLabel}>Authentication Method</Label>
            <select
              value={method}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleMethodChange(e.target.value as AuthMethod | '')}
              className={cn(styles.select, 'mt-1')}
            >
              <option value="">Select authentication method...</option>
              {(() => {
                let lastGroup = ''
                return AUTH_METHODS.map((m) => {
                  const showGroup = m.group !== lastGroup
                  lastGroup = m.group
                  return showGroup ? (
                    <optgroup key={m.group} label={m.group}>
                      {AUTH_METHODS.filter((am) => am.group === m.group).map((am) => (
                        <option key={am.value} value={am.value}>{am.label}</option>
                      ))}
                    </optgroup>
                  ) : null
                }).filter(Boolean)
              })()}
            </select>
          </div>

          {/* Credentials (auth_key_* methods) — uses AuthKeyEditor with hash-and-lock UX */}
          {AUTH_KEY_METHODS.has(method) && (
            <div>
              <Label className={styles.fieldLabel}>Credentials</Label>
              <div className="mt-1">
                <UserAuthKeyEditor
                  method={method}
                  value={userFields(user)[method] as string ?? ''}
                  onChange={handleAuthKeyChange}
                />
              </div>
            </div>
          )}

          {/* Connector selector (for external methods) */}
          {method && !AUTH_KEY_METHODS.has(method) && (
            <div>
              <Label className={styles.fieldLabel}>
                {method === 'proxy_auth' ? 'Config' : 'Connector'}
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <select
                  value={currentConnectorName}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleConnectorNameChange(e.target.value)}
                  className={cn(styles.select, 'flex-1')}
                >
                  <option value="">Select...</option>
                  {method === 'proxy_auth' && <option value="*">* (any proxied user)</option>}
                  {connectorNameOptions.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                {connectorTargetTab && (
                  <button
                    type="button"
                    onClick={() => navigateWithReturn(connectorTargetTab)}
                    className="text-[var(--color-accent)] hover:underline font-medium text-[10px] whitespace-nowrap shrink-0"
                  >
                    Manage &rarr;
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Groups filter (for combined auth methods: ldap_auth, jwt_auth, ror_kbn_auth) */}
          {COMBINED_AUTH_METHODS.has(method) && (
            <div className="space-y-3 rounded-md border border-[var(--color-border)] p-3">
              <p className={styles.categoryLabel}>
                External Group Filter
              </p>
              <div>
                <Label className={styles.fieldLabel}>
                  Groups (any of)
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3 h-3 ml-1 inline text-[var(--color-text-tertiary)]" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      User must belong to at least one of these external groups. Supports wildcards (e.g. ldap_*_devops).
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <div className="mt-1">
                  <StringArrayInput
                    value={currentGroupsFilter.any}
                    onChange={(v) => handleGroupsFilterChange('groups_any_of', v)}
                    placeholder="Add external group pattern..."
                  />
                </div>
              </div>
              <div>
                <Label className={styles.fieldLabel}>
                  Groups (all of)
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3 h-3 ml-1 inline text-[var(--color-text-tertiary)]" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      User must belong to ALL of these external groups.
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <div className="mt-1">
                  <StringArrayInput
                    value={currentGroupsFilter.all}
                    onChange={(v) => handleGroupsFilterChange('groups_all_of', v)}
                    placeholder="Add external group..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Local groups (always shown) */}
          <div>
            <Label className={styles.fieldLabel}>
              Local Groups
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 ml-1 inline text-[var(--color-text-tertiary)]" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  Local groups assigned to this user. ACL blocks use "groups" rules to match against these. See ReadOnlyREST groups rule mapping documentation.
                </TooltipContent>
              </Tooltip>
            </Label>
            <div className="mt-1">
              <StringArrayInput
                value={(user.groups || []).map((g) => typeof g === 'string' ? g : g.id)}
                onChange={(groups) => onUpdate({ ...user, groups })}
                placeholder="Add local group..."
              />
            </div>
          </div>

          {/* Optional separate authorization (for auth-only methods) */}
          {(method === 'ldap_authentication' || method === 'external_authentication') && (
            <AuthorizationSection user={user} onUpdate={onUpdate} groupsProviderNames={groupsProviderNames} ldapNames={ldapNames} />
          )}

          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={onRemove} className={styles.removeButton}>
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Remove
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Optional authorization section (for auth-only methods)
// ---------------------------------------------------------------------------

function AuthorizationSection({ user, onUpdate, groupsProviderNames, ldapNames }: {
  user: UserDefinition
  onUpdate: (user: UserDefinition) => void
  groupsProviderNames: string[]
  ldapNames: string[]
}) {
  const hasLdapAuthz = !!user.ldap_authorization
  const hasGroupsProvider = !!user.groups_provider_authorization
  const hasAuthz = hasLdapAuthz || hasGroupsProvider
  const authzType = hasLdapAuthz ? 'ldap' : hasGroupsProvider ? 'groups_provider' : ''

  const handleAuthzTypeChange = (type: string) => {
    const cleaned = { ...user }
    delete cleaned.ldap_authorization
    delete cleaned.groups_provider_authorization
    if (type === 'ldap') {
      cleaned.ldap_authorization = { name: '', groups_any_of: [] }
    } else if (type === 'groups_provider') {
      cleaned.groups_provider_authorization = { user_groups_provider: '', groups_any_of: [] }
    }
    onUpdate(cleaned)
  }

  return (
    <div className="space-y-3 rounded-md border border-dashed border-[var(--color-border)] p-3">
      <div className="flex items-center justify-between">
        <p className={styles.categoryLabel}>
          Authorization (optional)
        </p>
        {!hasAuthz && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleAuthzTypeChange('ldap')}
              className="text-[10px] text-[var(--color-accent)] hover:underline font-medium"
            >
              + LDAP Authorization
            </button>
            <button
              type="button"
              onClick={() => handleAuthzTypeChange('groups_provider')}
              className="text-[10px] text-[var(--color-accent)] hover:underline font-medium"
            >
              + Groups Provider
            </button>
          </div>
        )}
      </div>

      {hasAuthz && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <select
              value={authzType}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleAuthzTypeChange(e.target.value)}
              className={cn(styles.select, 'flex-1')}
            >
              <option value="ldap">LDAP Authorization</option>
              <option value="groups_provider">Groups Provider</option>
            </select>
            <button
              type="button"
              onClick={() => handleAuthzTypeChange('')}
              className="text-[10px] text-[var(--color-error)] hover:underline font-medium shrink-0"
            >
              Remove
            </button>
          </div>

          {authzType === 'ldap' && user.ldap_authorization && (
            <>
              <div>
                <Label className={styles.fieldLabel}>LDAP Connector</Label>
                <select
                  value={user.ldap_authorization.name}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    onUpdate({ ...user, ldap_authorization: { ...user.ldap_authorization!, name: e.target.value } })
                  }
                  className={cn(styles.select, 'mt-1')}
                >
                  <option value="">Select...</option>
                  {ldapNames.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <Label className={styles.fieldLabel}>Groups (any of)</Label>
                <div className="mt-1">
                  <StringArrayInput
                    value={user.ldap_authorization.groups_any_of ?? []}
                    onChange={(v) => onUpdate({ ...user, ldap_authorization: { ...user.ldap_authorization!, groups_any_of: v.length > 0 ? v : undefined } })}
                    placeholder="Add external group..."
                  />
                </div>
              </div>
            </>
          )}

          {authzType === 'groups_provider' && user.groups_provider_authorization && (
            <>
              <div>
                <Label className={styles.fieldLabel}>Groups Provider</Label>
                <select
                  value={user.groups_provider_authorization.user_groups_provider}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    onUpdate({ ...user, groups_provider_authorization: { ...user.groups_provider_authorization!, user_groups_provider: e.target.value } })
                  }
                  className={cn(styles.select, 'mt-1')}
                >
                  <option value="">Select...</option>
                  {groupsProviderNames.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <Label className={styles.fieldLabel}>Groups (any of)</Label>
                <div className="mt-1">
                  <StringArrayInput
                    value={user.groups_provider_authorization.groups_any_of ?? []}
                    onChange={(v) => onUpdate({ ...user, groups_provider_authorization: { ...user.groups_provider_authorization!, groups_any_of: v.length > 0 ? v : undefined } })}
                    placeholder="Add external group..."
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main tab
// ---------------------------------------------------------------------------

export function UsersGroupsTab() {
  const users = useEditorStore((s) => s.config.users ?? EMPTY_USERS)
  const addUser = useEditorStore((s) => s.addUser)
  const updateUser = useEditorStore((s) => s.updateUser)
  const removeUser = useEditorStore((s) => s.removeUser)

  const handleAddUser = () => {
    addUser({ username: '', groups: [] })
  }

  return (
    <div className={styles.pageContainer}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className={styles.pageTitle}>Users & Groups</h2>
          <p className={styles.pageSubtitle}>
            Define users, their authentication methods, and local group memberships for role mapping
          </p>
        </div>
        <Button size="sm" onClick={handleAddUser} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          Add User
        </Button>
      </div>

      {users.length === 0 ? (
        <div className={styles.emptyStateCard}>
          <Users className="w-10 h-10 text-[var(--color-text-tertiary)]" />
          <p className="text-sm text-[var(--color-text-secondary)]">No users defined yet</p>
          <p className="text-xs text-[var(--color-text-tertiary)] max-w-sm text-center">
            Users map authentication methods to local groups. ACL blocks then use <code className="text-[10px] px-0.5 rounded bg-gray-100">groups</code> rules to authorize based on group membership.
          </p>
          <Button size="sm" onClick={handleAddUser} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Add your first user
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user, i) => (
            <UserCard
              key={i}
              user={user}
              index={i}
              onUpdate={(updated) => updateUser(i, updated)}
              onRemove={() => removeUser(i)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
