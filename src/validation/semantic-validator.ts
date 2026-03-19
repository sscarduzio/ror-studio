import type { RorConfig, AccessControlBlock } from '@/schema/types'
import type { ValidationIssue } from '@/validation/types'
import { ALL_USER_AUTH_METHODS, AUTH_KEY_METHODS } from '@/schema/auth-registry'

/** LDAP rule types that reference an LDAP connector by name */
const LDAP_RULE_TYPES = new Set(['ldap_authentication', 'ldap_auth', 'ldap_authorization'])

/** JWT rule types that reference a JWT connector by name */
const JWT_RULE_TYPES = new Set(['jwt_auth', 'jwt_authentication', 'jwt_authorization'])

/** ROR KBN rule types that reference a ror_kbn connector by name */
const ROR_KBN_RULE_TYPES = new Set(['ror_kbn_authentication', 'ror_kbn_authorization', 'ror_kbn_auth'])

/** External authentication rule type */
const EXTERNAL_AUTH_RULE_TYPES = new Set(['external_authentication'])

/** Groups provider authorization rule type */
const GROUPS_PROVIDER_RULE_TYPES = new Set(['groups_provider_authorization', 'external_authorization'])

/** Host/network rule types that accept IP/CIDR/hostname arrays */
const HOST_RULE_TYPES = new Set(['hosts', 'hosts_local', 'x_forwarded_for'])

/** Legacy individual kibana rules (superseded by composite "kibana" rule) */
const LEGACY_KIBANA_TYPES = new Set(['kibana_access', 'kibana_index', 'kibana_hide_apps', 'kibana_template_index'])

// IPv4: 0-255 octets
const IPV4_RE = /^(\d{1,3}\.){3}\d{1,3}$/
// IPv6: simplified — hex groups with colons, optional :: shorthand
const IPV6_RE = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/
// CIDR suffix
const CIDR_RE = /\/(\d{1,3})$/
// Hostname: labels separated by dots, each 1-63 alphanumeric/hyphen chars
const HOSTNAME_RE = /^(\*|([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z]{2,})$/

function isValidIPv4(s: string): boolean {
  if (!IPV4_RE.test(s)) return false
  return s.split('.').every((octet) => {
    const n = parseInt(octet, 10)
    return n >= 0 && n <= 255
  })
}

function isValidIPv6(s: string): boolean {
  // Handle :: expansion and basic structure
  if (s === '::') return true
  if (s === '::1') return true
  return IPV6_RE.test(s)
}

function isValidHostEntry(entry: string): boolean {
  const trimmed = entry.trim()
  if (!trimmed) return false
  if (trimmed === '*' || trimmed === 'localhost') return true

  // CIDR notation
  const cidrMatch = trimmed.match(CIDR_RE)
  if (cidrMatch) {
    const prefix = parseInt(cidrMatch[1], 10)
    const base = trimmed.replace(CIDR_RE, '')
    if (isValidIPv4(base)) return prefix >= 0 && prefix <= 32
    if (isValidIPv6(base)) return prefix >= 0 && prefix <= 128
    return false
  }

  if (isValidIPv4(trimmed)) return true
  if (isValidIPv6(trimmed)) return true
  if (HOSTNAME_RE.test(trimmed)) return true

  return false
}

/** Rule types whose values are Java regex patterns */
const REGEX_RULE_TYPES = new Set(['uri_re'])

// Java-only regex features that are valid but JS doesn't support.
// Strip these before testing with new RegExp() so we don't false-positive.
const JAVA_ONLY_RE = /\(\?>[^)]*\)|\+\+|\*\+|\?\+|\{\d+,?\d*\}\+/g

function isValidRegex(pattern: string): boolean {
  // Strip Java-only possessive quantifiers and atomic groups before JS parse
  const jsCompatible = pattern.replace(JAVA_ONLY_RE, '(?:x)')
  try {
    new RegExp(jsCompatible)
    return true
  } catch {
    return false
  }
}

/** All authentication rule types (set loggedUser) */
const AUTHENTICATION_RULE_TYPES = new Set([
  'auth_key', 'auth_key_sha1', 'auth_key_sha256', 'auth_key_sha512',
  'auth_key_pbkdf2', 'auth_key_unix', 'proxy_auth', 'token_authentication',
  'external_authentication', 'ldap_authentication', 'jwt_authentication',
  'ror_kbn_authentication', 'ldap_auth', 'jwt_auth', 'ror_kbn_auth',
])

/** Authorization-only rule types (require authentication in same block) */
const AUTHORIZATION_ONLY_RULE_TYPES = new Set([
  'ldap_authorization', 'jwt_authorization', 'ror_kbn_authorization',
  'groups_provider_authorization', 'external_authorization',
])

/** Rules incompatible with kibana_access */
const KIBANA_ACCESS_INCOMPATIBLE = new Set(['actions', 'filter', 'fields', 'response_fields'])

/**
 * Extract the connector name referenced by an ACL rule value.
 * Rule values can be a plain string (the name) or an object with a `name` property.
 */
function extractConnectorName(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && 'name' in value) {
    const name = (value as Record<string, unknown>).name
    if (typeof name === 'string') return name
  }
  return undefined
}

/**
 * Extract the external authentication service name from a rule value.
 * Value can be a plain string or an object with a `service` property.
 */
function extractExternalAuthName(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && 'service' in value) {
    const service = (value as Record<string, unknown>).service
    if (typeof service === 'string') return service
  }
  return undefined
}

/**
 * Extract the groups provider name from a rule value.
 * Value is an object with a `user_groups_provider` property.
 */
function extractGroupsProviderName(value: unknown): string | undefined {
  if (value && typeof value === 'object' && 'user_groups_provider' in value) {
    const provider = (value as Record<string, unknown>).user_groups_provider
    if (typeof provider === 'string') return provider
  }
  return undefined
}

/** Pre-computed connector name sets shared across validation functions */
interface ConnectorNames {
  ldapNames: Set<string>
  jwtNames: Set<string>
  rorKbnNames: Set<string>
  extAuthNames: Set<string>
  groupsProviderNames: Set<string>
}

function buildConnectorNames(config: RorConfig): ConnectorNames {
  return {
    ldapNames: new Set((config.ldaps ?? []).map((l) => l.name)),
    jwtNames: new Set((config.jwt ?? []).map((j) => j.name)),
    rorKbnNames: new Set((config.ror_kbn ?? []).map((r) => r.name)),
    extAuthNames: new Set((config.external_authentication_service_configs ?? []).map((e) => e.name)),
    groupsProviderNames: new Set((config.user_groups_providers ?? []).map((g) => g.name)),
  }
}

/**
 * Validate a RorConfig and return all semantic issues found.
 */
export function validateConfig(config: RorConfig): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const blocks = config.access_control_rules
  const connectorNames = buildConnectorNames(config)

  // --- Empty config ---
  if (blocks.length === 0) {
    issues.push({
      severity: 'info',
      message: 'No access control rules defined',
      tab: 'access-control',
      fix: 'Add at least one access control block to get started',
    })
    // Nothing else to validate for ACL
  } else {
    validateBlocks(blocks, config, connectorNames, issues)
  }

  // --- User definitions ---
  validateUsers(config, connectorNames, issues)

  // --- SSL keystore consistency ---
  validateSsl(config, issues)

  return issues
}

function validateBlocks(
  blocks: AccessControlBlock[],
  config: RorConfig,
  connectorNames: ConnectorNames,
  issues: ValidationIssue[],
): void {
  const { ldapNames, jwtNames, rorKbnNames, extAuthNames, groupsProviderNames } = connectorNames
  const proxyAuthNames = new Set((config.proxy_auth_configs ?? []).map((p) => p.name))
  const seenNames = new Map<string, number>()
  let hitCatchAll = false

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    const blockLabel = block.name || `Block #${i + 1}`

    // --- Unreachable block (after a catch-all) ---
    if (hitCatchAll) {
      issues.push({
        severity: 'warning',
        message: `"${blockLabel}" is unreachable — a previous block with no rules catches all requests`,
        tab: 'access-control',
        field: `access_control_rules[${i}]`,
        fix: 'Move this block above the catch-all block, or add rules to the catch-all block',
        fieldId: `block-${block.id}`,
      })
    }

    // --- Empty name ---
    if (!block.name || block.name.trim() === '') {
      issues.push({
        severity: 'error',
        message: `Block #${i + 1} has no name`,
        tab: 'access-control',
        field: `access_control_rules[${i}].name`,
        fix: 'Enter a unique name for this block',
        fieldId: `block-${block.id}-name`,
      })
    }

    // --- Duplicate names ---
    const trimmedName = (block.name ?? '').trim()
    if (trimmedName) {
      if (seenNames.has(trimmedName)) {
        issues.push({
          severity: 'error',
          message: `Duplicate block name "${trimmedName}" (first seen at block #${seenNames.get(trimmedName)! + 1})`,
          tab: 'access-control',
          field: `access_control_rules[${i}].name`,
          fix: `Rename this block to something unique`,
          fieldId: `block-${block.id}-name`,
        })
      } else {
        seenNames.set(trimmedName, i)
      }
    }

    // --- Empty rules ---
    if (block.rules.length === 0) {
      issues.push({
        severity: 'error',
        message: `"${blockLabel}" has no rules`,
        tab: 'access-control',
        field: `access_control_rules[${i}].rules`,
        fix: 'Add at least one rule to this block (e.g., indices, auth_key)',
        fieldId: `block-${block.id}`,
      })
      // A block with no rules is a catch-all: everything after it is unreachable
      hitCatchAll = true
    }

    // --- Authorization without authentication ---
    const hasAuthnRule = block.rules.some((r) => AUTHENTICATION_RULE_TYPES.has(r.type))
    const hasAuthzOnlyRule = block.rules.some((r) => AUTHORIZATION_ONLY_RULE_TYPES.has(r.type))
    if (hasAuthzOnlyRule && !hasAuthnRule) {
      issues.push({
        severity: 'error',
        message: `"${blockLabel}" has an authorization rule but no authentication rule — authorization requires a logged-in user`,
        tab: 'access-control',
        field: `access_control_rules[${i}].rules`,
        fix: 'Add an authentication rule (e.g., auth_key, ldap_auth) to this block',
        fieldId: `block-${block.id}`,
      })
    }

    // --- Multiple authentication rules ---
    const authnRules = block.rules.filter((r) => AUTHENTICATION_RULE_TYPES.has(r.type))
    if (authnRules.length > 1) {
      issues.push({
        severity: 'error',
        message: `"${blockLabel}" has ${authnRules.length} authentication rules — only one is allowed per block`,
        tab: 'access-control',
        field: `access_control_rules[${i}].rules`,
        fix: 'Remove extra authentication rules — keep only one per block',
        fieldId: `block-${block.id}`,
      })
    }

    // --- Kibana access incompatibilities ---
    const hasKibanaAccess = block.rules.some((r) => r.type === 'kibana_access' || r.type === 'kibana')
    if (hasKibanaAccess) {
      for (const rule of block.rules) {
        if (KIBANA_ACCESS_INCOMPATIBLE.has(rule.type)) {
          issues.push({
            severity: 'error',
            message: `"${blockLabel}" has kibana_access combined with ${rule.type} — these are incompatible`,
            tab: 'access-control',
            field: `access_control_rules[${i}].rules`,
            fix: `Remove either kibana_access or ${rule.type} from this block`,
            fieldId: `block-${block.id}`,
          })
        }
      }
    }

    // --- Legacy + modern kibana rule conflict ---
    const hasLegacyKibana = block.rules.some((r) => LEGACY_KIBANA_TYPES.has(r.type))
    const hasModernKibana = block.rules.some((r) => r.type === 'kibana')
    if (hasLegacyKibana && hasModernKibana) {
      issues.push({
        severity: 'error',
        message: `"${blockLabel}" has both legacy kibana rules (kibana_access, kibana_index, etc.) and the modern composite "kibana" rule — use one or the other`,
        tab: 'access-control',
        field: `access_control_rules[${i}].rules`,
        fix: 'Remove the legacy kibana_access/kibana_index/kibana_hide_apps/kibana_template_index rules and use only the composite "kibana" rule',
        fieldId: `block-${block.id}`,
      })
    }

    // --- Connector references and rule value validation ---
    for (let ri = 0; ri < block.rules.length; ri++) {
      const rule = block.rules[ri]
      const ruleFieldId = `block-${block.id}-rule-${ri}`

      // --- Connector reference checks (common pattern) ---
      const connectorChecks: Array<{
        ruleTypes: Set<string>
        names: Set<string>
        label: string
        tab: 'authentication' | 'authorization'
        extractor: (value: unknown) => string | undefined
      }> = [
        { ruleTypes: LDAP_RULE_TYPES, names: ldapNames, label: 'LDAP connector', tab: 'authentication', extractor: extractConnectorName },
        { ruleTypes: JWT_RULE_TYPES, names: jwtNames, label: 'JWT connector', tab: 'authentication', extractor: extractConnectorName },
        { ruleTypes: ROR_KBN_RULE_TYPES, names: rorKbnNames, label: 'ROR KBN connector', tab: 'authentication', extractor: extractConnectorName },
        { ruleTypes: EXTERNAL_AUTH_RULE_TYPES, names: extAuthNames, label: 'external authentication service', tab: 'authentication', extractor: extractExternalAuthName },
        { ruleTypes: GROUPS_PROVIDER_RULE_TYPES, names: groupsProviderNames, label: 'groups provider', tab: 'authorization', extractor: extractGroupsProviderName },
      ]

      for (const check of connectorChecks) {
        if (check.ruleTypes.has(rule.type)) {
          const name = check.extractor(rule.value)
          if (name && !check.names.has(name)) {
            issues.push({
              severity: 'error',
              message: `"${blockLabel}" references ${check.label} "${name}" which is not defined`,
              tab: check.tab,
              field: `access_control_rules[${i}].rules[${ri}]`,
              fix: `Create a ${check.label} named "${name}" in the ${check.tab === 'authentication' ? 'Authentication' : 'Authorization'} tab`,
              fieldId: ruleFieldId,
            })
          }
        }
      }

      // --- proxy_auth (special case: wildcard "*" support) ---
      if (rule.type === 'proxy_auth') {
        const val = typeof rule.value === 'string' ? rule.value.trim() : ''
        if (!val) {
          issues.push({
            severity: 'error',
            message: `"${blockLabel}" has a proxy_auth rule with no value`,
            tab: 'access-control',
            field: `access_control_rules[${i}].rules[${ri}]`,
            fix: 'Set the value to "*" (any user) or the name of a proxy_auth_configs entry',
            fieldId: ruleFieldId,
          })
        } else if (val !== '*' && !proxyAuthNames.has(val)) {
          issues.push({
            severity: 'error',
            message: `"${blockLabel}" references proxy_auth config "${val}" which is not defined`,
            tab: 'authentication',
            field: `access_control_rules[${i}].rules[${ri}]`,
            fix: proxyAuthNames.size === 0
              ? 'Use "*" to accept any proxied user, or create a proxy_auth_configs entry in the Authentication tab'
              : `Use "*" or one of the defined configs: ${[...proxyAuthNames].join(', ')}`,
            fieldId: ruleFieldId,
          })
        }
      }

      // --- Host/network value validation ---
      if (HOST_RULE_TYPES.has(rule.type) && Array.isArray(rule.value)) {
        for (const entry of rule.value as string[]) {
          if (!isValidHostEntry(entry)) {
            issues.push({
              severity: 'error',
              message: `"${blockLabel}" has invalid ${rule.type} value "${entry}"`,
              tab: 'access-control',
              field: `access_control_rules[${i}].rules[${ri}]`,
              fix: 'Must be an IPv4 (e.g. 192.168.1.1), IPv6 (e.g. ::1), CIDR (e.g. 10.0.0.0/8), hostname (e.g. proxy.example.com), or wildcard (*)',
              fieldId: ruleFieldId,
            })
          }
        }
      }

      // --- Regex pattern validation ---
      if (REGEX_RULE_TYPES.has(rule.type)) {
        const patterns = Array.isArray(rule.value) ? rule.value as string[] : typeof rule.value === 'string' && rule.value ? [rule.value] : []
        for (const pattern of patterns) {
          if (!isValidRegex(pattern)) {
            issues.push({
              severity: 'error',
              message: `"${blockLabel}" has invalid regex "${pattern}" in ${rule.type}`,
              tab: 'access-control',
              field: `access_control_rules[${i}].rules[${ri}]`,
              fix: 'Must be a valid Java-compatible regular expression (e.g. ^/api/.*, .*\\.json$)',
              fieldId: ruleFieldId,
            })
          }
        }
      }
    }
  }
}

/** Auth method keys on UserDefinition — imported from shared registry */
const USER_AUTH_METHODS = ALL_USER_AUTH_METHODS

/** Local (auth_key_*) methods — imported from shared registry */
const LOCAL_AUTH_METHODS = AUTH_KEY_METHODS

function validateUsers(config: RorConfig, connectorNames: ConnectorNames, issues: ValidationIssue[]): void {
  const users = config.users
  if (!users || users.length === 0) return

  const { ldapNames, jwtNames, rorKbnNames, extAuthNames, groupsProviderNames } = connectorNames
  const seenUsernames = new Map<string, { index: number; isLocal: boolean }>()

  for (let i = 0; i < users.length; i++) {
    const user = users[i]
    const uRec = user as unknown as Record<string, unknown>
    const fieldId = `user-${i}`
    const usernameStr = Array.isArray(user.username) ? user.username.join(', ') : user.username

    // Count auth methods present (needed before duplicate check)
    const presentMethods = USER_AUTH_METHODS.filter((m) => uRec[m] !== undefined)
    const isLocalAuth = presentMethods.some((m) => LOCAL_AUTH_METHODS.has(m))

    // Empty username
    if (!usernameStr || usernameStr.trim() === '') {
      issues.push({
        severity: 'error',
        message: `User #${i + 1} has no username`,
        tab: 'users-groups',
        field: `users[${i}].username`,
        fix: 'Enter a username or pattern (e.g. admin, *@example.com)',
        fieldId,
      })
    } else {
      const trimmed = usernameStr.trim()
      const existing = seenUsernames.get(trimmed)
      if (existing !== undefined) {
        // Duplicate username — only error if either entry uses local auth
        if (isLocalAuth || existing.isLocal) {
          issues.push({
            severity: 'error',
            message: `Duplicate username "${trimmed}" (first seen at user #${existing.index + 1})`,
            tab: 'users-groups',
            field: `users[${i}].username`,
            fix: 'Each local user definition must have a unique username. For group mapping with external auth, duplicate usernames are allowed.',
            fieldId,
          })
        }
        // else: both external auth → valid group mapping, no issue
      } else {
        seenUsernames.set(trimmed, { index: i, isLocal: isLocalAuth })
      }
    }

    if (presentMethods.length === 0) {
      issues.push({
        severity: 'error',
        message: `User "${usernameStr || `#${i + 1}`}" has no authentication method`,
        tab: 'users-groups',
        field: `users[${i}]`,
        fix: 'Select an authentication method for this user',
        fieldId,
      })
    } else if (presentMethods.length > 1) {
      issues.push({
        severity: 'error',
        message: `User "${usernameStr || `#${i + 1}`}" has multiple authentication methods (${presentMethods.join(', ')})`,
        tab: 'users-groups',
        field: `users[${i}]`,
        fix: 'Only one authentication method per user is allowed',
        fieldId,
      })
    }

    // Empty auth_key value
    for (const m of ['auth_key', 'auth_key_sha1', 'auth_key_sha256', 'auth_key_sha512', 'auth_key_pbkdf2', 'auth_key_unix'] as const) {
      if (uRec[m] !== undefined && !(uRec[m] as string)) {
        issues.push({
          severity: 'error',
          message: `User "${usernameStr || `#${i + 1}`}" has empty ${m} credentials`,
          tab: 'users-groups',
          field: `users[${i}].${m}`,
          fix: 'Enter credentials in the format username:password (or username:hash)',
          fieldId,
        })
      }
    }

    // Missing connector references
    if (user.ldap_auth) {
      const name = typeof user.ldap_auth === 'object' ? user.ldap_auth.name : ''
      if (name && !ldapNames.has(name)) {
        issues.push({
          severity: 'error',
          message: `User "${usernameStr || `#${i + 1}`}" references LDAP connector "${name}" which is not defined`,
          tab: 'users-groups',
          field: `users[${i}].ldap_auth`,
          fix: `Create an LDAP connector named "${name}" in the Authentication tab`,
          fieldId,
        })
      }
    }

    if (user.ldap_authentication) {
      const name = typeof user.ldap_authentication === 'string' ? user.ldap_authentication : user.ldap_authentication.name
      if (name && !ldapNames.has(name)) {
        issues.push({
          severity: 'error',
          message: `User "${usernameStr || `#${i + 1}`}" references LDAP connector "${name}" which is not defined`,
          tab: 'users-groups',
          field: `users[${i}].ldap_authentication`,
          fix: `Create an LDAP connector named "${name}" in the Authentication tab`,
          fieldId,
        })
      }
    }

    if (user.jwt_auth) {
      const name = typeof user.jwt_auth === 'object' ? user.jwt_auth.name : ''
      if (name && !jwtNames.has(name)) {
        issues.push({
          severity: 'error',
          message: `User "${usernameStr || `#${i + 1}`}" references JWT connector "${name}" which is not defined`,
          tab: 'users-groups',
          field: `users[${i}].jwt_auth`,
          fix: `Create a JWT connector named "${name}" in the Authentication tab`,
          fieldId,
        })
      }
    }

    if (user.ror_kbn_auth) {
      const name = typeof user.ror_kbn_auth === 'object' ? user.ror_kbn_auth.name : ''
      if (name && !rorKbnNames.has(name)) {
        issues.push({
          severity: 'error',
          message: `User "${usernameStr || `#${i + 1}`}" references ROR KBN connector "${name}" which is not defined`,
          tab: 'users-groups',
          field: `users[${i}].ror_kbn_auth`,
          fix: `Create a ROR KBN connector named "${name}" in the Authentication tab`,
          fieldId,
        })
      }
    }

    if (user.external_authentication) {
      const name = typeof user.external_authentication === 'string' ? user.external_authentication : user.external_authentication.service
      if (name && !extAuthNames.has(name)) {
        issues.push({
          severity: 'error',
          message: `User "${usernameStr || `#${i + 1}`}" references external auth service "${name}" which is not defined`,
          tab: 'users-groups',
          field: `users[${i}].external_authentication`,
          fix: `Create an external authentication service named "${name}" in the Authentication tab`,
          fieldId,
        })
      }
    }

    // Groups provider authorization references
    if (user.groups_provider_authorization) {
      const providerName = user.groups_provider_authorization.user_groups_provider
      if (providerName && !groupsProviderNames.has(providerName)) {
        issues.push({
          severity: 'error',
          message: `User "${usernameStr || `#${i + 1}`}" references groups provider "${providerName}" which is not defined`,
          tab: 'users-groups',
          field: `users[${i}].groups_provider_authorization`,
          fix: `Create a groups provider named "${providerName}" in the Authorization tab`,
          fieldId,
        })
      }
    }

    // LDAP authorization references
    if (user.ldap_authorization) {
      const name = user.ldap_authorization.name
      if (name && !ldapNames.has(name)) {
        issues.push({
          severity: 'error',
          message: `User "${usernameStr || `#${i + 1}`}" references LDAP connector "${name}" for authorization which is not defined`,
          tab: 'users-groups',
          field: `users[${i}].ldap_authorization`,
          fix: `Create an LDAP connector named "${name}" in the Authentication tab`,
          fieldId,
        })
      }
    }

    // No groups assigned (info, not error)
    if (!user.groups || user.groups.length === 0) {
      issues.push({
        severity: 'info',
        message: `User "${usernameStr || `#${i + 1}`}" has no local groups assigned`,
        tab: 'users-groups',
        field: `users[${i}].groups`,
        fix: 'Add local groups if you want ACL blocks to match this user via groups rules',
        fieldId,
      })
    }
  }
}

function validateSsl(config: RorConfig, issues: ValidationIssue[]): void {
  const ssl = config.ssl
  if (!ssl) return

  const hasFile = !!ssl.keystore_file
  const hasPass = !!ssl.keystore_pass

  if (hasFile !== hasPass) {
    issues.push({
      severity: 'error',
      message: hasFile
        ? 'SSL keystore_file is set but keystore_pass is missing'
        : 'SSL keystore_pass is set but keystore_file is missing',
      tab: 'ssl-tls',
      field: hasFile ? 'ssl.keystore_pass' : 'ssl.keystore_file',
      fix: hasFile
        ? 'Add the keystore password in the SSL/TLS tab'
        : 'Add the keystore file path in the SSL/TLS tab',
      fieldId: hasFile ? 'ssl-keystore-pass' : 'ssl-keystore-file',
    })
  }
}
