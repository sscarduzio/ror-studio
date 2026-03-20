// Wizard types, data, and helper functions
// Extracted from WizardModal to reduce file size and improve testability.

import type { AclRule, RuleType } from '@/schema/types'

export type AuthMethod = 'auth_key' | 'groups_any_of' | 'ldap_authentication' | 'jwt_auth'
export type AccessLevel = 'read-only' | 'read-write' | 'full-admin'

export interface WizardState {
  blockName: string
  authMethod: AuthMethod | null
  indexPattern: string
  accessLevel: AccessLevel | null
}

export const STEP_LABELS = ['Welcome', 'Name', 'Auth', 'Permissions', 'Review'] as const
export const TOTAL_STEPS = STEP_LABELS.length

export const NAME_SUGGESTIONS = ['admin_access', 'devops_team', 'readonly_public']

export function authMethodLabel(method: AuthMethod): string {
  switch (method) {
    case 'auth_key': return 'Username & Password'
    case 'groups_any_of': return 'Group Membership'
    case 'ldap_authentication': return 'LDAP'
    case 'jwt_auth': return 'JWT'
  }
}

export function accessLevelLabel(level: AccessLevel): string {
  switch (level) {
    case 'read-only': return 'Read Only'
    case 'read-write': return 'Read-Write'
    case 'full-admin': return 'Full Admin'
  }
}

export function buildRules(state: WizardState): AclRule[] {
  const rules: AclRule[] = []

  if (state.authMethod) {
    switch (state.authMethod) {
      case 'auth_key':
        rules.push({ type: 'auth_key' as RuleType, value: 'user:changeme' })
        break
      case 'groups_any_of':
        rules.push({ type: 'groups_any_of' as RuleType, value: ['group1'] })
        break
      case 'ldap_authentication':
        rules.push({ type: 'ldap_authentication' as RuleType, value: 'ldap1' })
        break
      case 'jwt_auth':
        rules.push({ type: 'jwt_authentication' as RuleType, value: { name: 'jwt1' } })
        break
    }
  }

  if (state.indexPattern && state.indexPattern !== '*') {
    rules.push({ type: 'indices' as RuleType, value: [state.indexPattern] })
  }

  if (state.accessLevel === 'read-only') {
    rules.push({ type: 'actions' as RuleType, value: ['indices:data/read/*'] })
  } else if (state.accessLevel === 'read-write') {
    rules.push({ type: 'actions' as RuleType, value: ['indices:data/read/*', 'indices:data/write/*'] })
  }

  return rules
}

export function generateYamlPreview(state: WizardState): string {
  const lines: string[] = []
  lines.push(`- name: "${state.blockName || 'unnamed'}"`)
  lines.push(`  type: allow`)

  if (state.authMethod === 'auth_key') {
    lines.push(`  auth_key: "user:changeme"`)
  } else if (state.authMethod === 'groups_any_of') {
    lines.push(`  groups_any_of: ["group1"]`)
  } else if (state.authMethod === 'ldap_authentication') {
    lines.push(`  ldap_authentication: "ldap1"`)
  } else if (state.authMethod === 'jwt_auth') {
    lines.push(`  jwt_authentication:`)
    lines.push(`    name: "jwt1"`)
  }

  if (state.indexPattern && state.indexPattern !== '*') {
    lines.push(`  indices: ["${state.indexPattern}"]`)
  }

  if (state.accessLevel === 'read-only') {
    lines.push(`  actions: ["indices:data/read/*"]`)
  } else if (state.accessLevel === 'read-write') {
    lines.push(`  actions: ["indices:data/read/*", "indices:data/write/*"]`)
  }

  return lines.join('\n')
}
