import { useCallback } from 'react'
import { Dialog as DialogPrimitive, VisuallyHidden } from 'radix-ui'
import { X, Trash2, Info } from 'lucide-react'
import { useEditorStore } from '@/store/editor-store'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { StringArrayInput } from '@/components/fields/StringArrayField'
import { AuthKeyEditor } from '@/components/acl/AuthKeyEditor'
import { useConnectorNames } from '@/hooks/useConnectorNames'
import { styles } from '@/components/shared-styles'
import { cn } from '@/lib/utils'
import type { UserDefinition, AclRule, RuleType } from '@/schema/types'
import {
  type AuthMethod,
  AUTH_METHODS,
  AUTH_KEY_METHODS,
  COMBINED_AUTH_METHODS,
  userFields,
  detectAuthMethod,
  clearAuthFields,
} from '@/schema/auth-registry'

function UserAuthKeyEditor({ method, value, onChange }: {
  method: string; value: string; onChange: (v: string) => void
}) {
  const rule: AclRule = { type: method as RuleType, value }
  return <AuthKeyEditor rule={rule} onChange={(r) => onChange(r.value as string)} />
}

interface UserDrawerProps {
  userIndex: number | null
  onClose: () => void
  onNavigate?: (direction: 'up' | 'down') => void
}

export function UserDrawer({ userIndex, onClose, onNavigate }: UserDrawerProps) {
  const user = useEditorStore((s) =>
    userIndex !== null ? (s.config.users ?? [])[userIndex] : undefined
  )
  const updateUser = useEditorStore((s) => s.updateUser)
  const removeUser = useEditorStore((s) => s.removeUser)

  const ldapNames = useConnectorNames('ldaps')
  const jwtNames = useConnectorNames('jwt')
  const rorKbnNames = useConnectorNames('ror_kbn')
  const proxyAuthNames = useConnectorNames('proxy_auth_configs')
  const extAuthNames = useConnectorNames('external_authentication_service_configs')
  const groupsProviderNames = useConnectorNames('user_groups_providers')

  const onUpdate = useCallback((updated: UserDefinition) => {
    if (userIndex !== null) updateUser(userIndex, updated)
  }, [userIndex, updateUser])

  const handleDelete = useCallback(() => {
    if (userIndex !== null) {
      removeUser(userIndex)
      onClose()
    }
  }, [userIndex, removeUser, onClose])

  if (userIndex === null || !user) return null

  const method = detectAuthMethod(user)

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
    <DialogPrimitive.Root open={userIndex !== null} onOpenChange={(open) => { if (!open) onClose() }} modal={false}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          className="fixed right-0 top-0 bottom-0 z-50 w-[480px] max-w-[90vw] bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200"
          onEscapeKeyDown={onClose}
          onKeyDown={(e) => {
            if (!onNavigate) return
            if (e.key === 'ArrowUp') { e.preventDefault(); onNavigate('up') }
            if (e.key === 'ArrowDown') { e.preventDefault(); onNavigate('down') }
          }}
        >
          <VisuallyHidden.Root><DialogPrimitive.Title>Edit User</DialogPrimitive.Title></VisuallyHidden.Root>
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-3.5 border-b bg-purple-50/80 border-purple-200">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-purple-400">User</div>
              <div className="text-sm font-bold text-slate-900 mt-0.5">{displayName}</div>
            </div>
            {method && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 shrink-0">
                {AUTH_METHODS.find((m) => m.value === method)?.label ?? method}
              </span>
            )}
            <DialogPrimitive.Close asChild>
              <button className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </DialogPrimitive.Close>
          </div>

          {/* Form body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* Username */}
            <div>
              <Label className={styles.fieldLabel}>
                Username
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 ml-1 inline text-[var(--color-text-tertiary)]" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    Username or pattern to match. Use * as wildcard (e.g. *@example.com).
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input
                value={Array.isArray(user.username) ? user.username.join(', ') : user.username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdate({ ...user, username: e.target.value })}
                placeholder="e.g. admin, *@example.com"
                className="mt-1 font-mono text-sm"
              />
            </div>

            {/* Auth method */}
            <div>
              <Label className={styles.fieldLabel}>Authentication Method</Label>
              <select
                value={method}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleMethodChange(e.target.value as AuthMethod | '')}
                className={cn(styles.select, 'mt-1')}
              >
                <option value="">Select authentication method...</option>
                {Array.from(new Set(AUTH_METHODS.map((m) => m.group))).map((group) => (
                  <optgroup key={group} label={group}>
                    {AUTH_METHODS.filter((am) => am.group === group).map((am) => (
                      <option key={am.value} value={am.value}>{am.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Auth key credentials */}
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

            {/* Connector selector */}
            {method && !AUTH_KEY_METHODS.has(method) && (
              <div>
                <Label className={styles.fieldLabel}>
                  {method === 'proxy_auth' ? 'Config' : 'Connector'}
                </Label>
                <select
                  value={currentConnectorName}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleConnectorNameChange(e.target.value)}
                  className={cn(styles.select, 'mt-1')}
                >
                  <option value="">Select...</option>
                  {method === 'proxy_auth' && <option value="*">* (any proxied user)</option>}
                  {connectorNameOptions.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Groups filter for combined auth */}
            {COMBINED_AUTH_METHODS.has(method) && (
              <div className="space-y-3 rounded-md border border-[var(--color-border)] p-3">
                <p className={styles.categoryLabel}>External Group Filter</p>
                <div>
                  <Label className={styles.fieldLabel}>Groups (any of)</Label>
                  <div className="mt-1">
                    <StringArrayInput
                      value={currentGroupsFilter.any}
                      onChange={(v) => handleGroupsFilterChange('groups_any_of', v)}
                      placeholder="Add external group pattern..."
                    />
                  </div>
                </div>
                <div>
                  <Label className={styles.fieldLabel}>Groups (all of)</Label>
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

            {/* Local groups */}
            <div>
              <Label className={styles.fieldLabel}>
                Local Groups
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 ml-1 inline text-[var(--color-text-tertiary)]" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    Local groups assigned to this user. ACL blocks use "groups" rules to match against these.
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

            {/* Authorization section for auth-only methods */}
            {(method === 'ldap_authentication' || method === 'external_authentication') && (
              <div className="space-y-3 rounded-md border border-dashed border-[var(--color-border)] p-3">
                <p className={styles.categoryLabel}>Authorization (optional)</p>
                {!user.ldap_authorization && !user.groups_provider_authorization && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onUpdate({ ...user, ldap_authorization: { name: '', groups_any_of: [] } })}
                      className="text-[10px] text-[var(--color-accent)] hover:underline font-medium"
                    >
                      + LDAP Authorization
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdate({ ...user, groups_provider_authorization: { user_groups_provider: '', groups_any_of: [] } })}
                      className="text-[10px] text-[var(--color-accent)] hover:underline font-medium"
                    >
                      + Groups Provider
                    </button>
                  </div>
                )}
                {user.ldap_authorization && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className={styles.fieldLabel}>LDAP Connector</Label>
                      <button type="button" onClick={() => { const c = { ...user }; delete c.ldap_authorization; onUpdate(c) }} className="text-[10px] text-[var(--color-error)] hover:underline">Remove</button>
                    </div>
                    <select
                      value={user.ldap_authorization.name}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onUpdate({ ...user, ldap_authorization: { ...user.ldap_authorization!, name: e.target.value } })}
                      className={cn(styles.select)}
                    >
                      <option value="">Select...</option>
                      {ldapNames.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
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
                  </div>
                )}
                {user.groups_provider_authorization && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className={styles.fieldLabel}>Groups Provider</Label>
                      <button type="button" onClick={() => { const c = { ...user }; delete c.groups_provider_authorization; onUpdate(c) }} className="text-[10px] text-[var(--color-error)] hover:underline">Remove</button>
                    </div>
                    <select
                      value={user.groups_provider_authorization.user_groups_provider}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onUpdate({ ...user, groups_provider_authorization: { ...user.groups_provider_authorization!, user_groups_provider: e.target.value } })}
                      className={cn(styles.select)}
                    >
                      <option value="">Select...</option>
                      {groupsProviderNames.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
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
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 px-5 py-3 flex justify-end">
            <Button variant="outline" size="sm" onClick={handleDelete} className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Delete User
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
