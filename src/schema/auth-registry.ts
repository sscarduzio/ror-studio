/**
 * Centralized auth method constants, types, and helpers.
 *
 * This module is the single source of truth for authentication method
 * definitions used across the UI (user editors, ACL flow graph, validation,
 * rule editor, etc.).  All consumers should import from here instead of
 * maintaining their own copies.
 */

import type { UserDefinition } from '@/schema/types'

// ---------------------------------------------------------------------------
// AuthMethod type & dropdown options
// ---------------------------------------------------------------------------

export type AuthMethod =
  | 'auth_key' | 'auth_key_sha1' | 'auth_key_sha256' | 'auth_key_sha512'
  | 'auth_key_pbkdf2' | 'auth_key_unix'
  | 'ldap_auth' | 'ldap_authentication'
  | 'jwt_auth' | 'ror_kbn_auth'
  | 'proxy_auth' | 'external_authentication'

export interface AuthMethodOption {
  value: AuthMethod
  label: string
  group: string
}

/** Dropdown options for the user auth-method selector (ordered). */
export const AUTH_METHODS: AuthMethodOption[] = [
  { value: 'auth_key', label: 'Auth Key (plaintext)', group: 'Local Credentials' },
  { value: 'auth_key_sha256', label: 'Auth Key (SHA-256)', group: 'Local Credentials' },
  { value: 'auth_key_sha512', label: 'Auth Key (SHA-512)', group: 'Local Credentials' },
  { value: 'auth_key_sha1', label: 'Auth Key (SHA-1)', group: 'Local Credentials' },
  { value: 'auth_key_pbkdf2', label: 'Auth Key (PBKDF2)', group: 'Local Credentials' },
  { value: 'auth_key_unix', label: 'Auth Key (Unix shadow)', group: 'Local Credentials' },
  { value: 'ldap_auth', label: 'LDAP (auth + groups)', group: 'External' },
  { value: 'ldap_authentication', label: 'LDAP (auth only)', group: 'External' },
  { value: 'jwt_auth', label: 'JWT (auth + groups)', group: 'External' },
  { value: 'ror_kbn_auth', label: 'ROR KBN / SAML', group: 'External' },
  { value: 'proxy_auth', label: 'Proxy Auth', group: 'External' },
  { value: 'external_authentication', label: 'External Authentication', group: 'External' },
]

// ---------------------------------------------------------------------------
// Method sets
// ---------------------------------------------------------------------------

/** The 6 local auth_key variants (credential stored inline). */
export const AUTH_KEY_METHODS = new Set<string>([
  'auth_key', 'auth_key_sha1', 'auth_key_sha256', 'auth_key_sha512',
  'auth_key_pbkdf2', 'auth_key_unix',
])

/** External auth methods that reference a connector by name. */
export const EXTERNAL_AUTH_METHODS = new Set<string>([
  'ldap_auth', 'ldap_authentication', 'jwt_auth', 'ror_kbn_auth',
  'proxy_auth', 'external_authentication',
])

/** Combined auth methods (auth + groups in one object with `name` + optional `groups_any_of`). */
export const COMBINED_AUTH_METHODS = new Set<string>([
  'ldap_auth', 'jwt_auth', 'ror_kbn_auth',
])

/** All auth method keys that can appear on a UserDefinition (union of local + external). */
export const ALL_USER_AUTH_METHODS: string[] = AUTH_METHODS.map((m) => m.value)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Helper to treat a UserDefinition as a generic record for dynamic key access. */
export function userFields(user: UserDefinition): Record<string, unknown> {
  return user as unknown as Record<string, unknown>
}

/** Returns true when `method` is one of the 6 local auth_key variants. */
export function isLocalAuth(method: string): boolean {
  return AUTH_KEY_METHODS.has(method)
}

/** Detect which auth method is set on a user (first match wins). */
export function detectAuthMethod(user: UserDefinition): AuthMethod | '' {
  for (const m of AUTH_METHODS) {
    if (userFields(user)[m.value] !== undefined) return m.value
  }
  return ''
}

/** Remove all auth-method fields (and authorization fields) from a user copy. */
export function clearAuthFields(user: UserDefinition): UserDefinition {
  const clean = { ...user }
  for (const m of AUTH_METHODS) {
    delete userFields(clean)[m.value]
  }
  delete userFields(clean).ldap_authorization
  delete userFields(clean).groups_provider_authorization
  return clean
}

// ---------------------------------------------------------------------------
// Connector config key mapping
// ---------------------------------------------------------------------------

/**
 * Maps an auth method (or rule type) to the RorConfig key that holds its
 * connector definitions.  Used by the rule editor and the ACL flow graph.
 */
export const CONNECTOR_CONFIG_KEY: Record<string, string> = {
  ldap_auth: 'ldaps',
  ldap_authentication: 'ldaps',
  ldap_authorization: 'ldaps',
  jwt_auth: 'jwt',
  jwt_authentication: 'jwt',
  jwt_authorization: 'jwt',
  ror_kbn_auth: 'ror_kbn',
  ror_kbn_authentication: 'ror_kbn',
  ror_kbn_authorization: 'ror_kbn',
  proxy_auth: 'proxy_auth_configs',
  external_authentication: 'external_authentication_service_configs',
  groups_provider_authorization: 'user_groups_providers',
  external_authorization: 'user_groups_providers',
}
