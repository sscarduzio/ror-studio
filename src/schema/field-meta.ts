// Field metadata for ROR Studio — drives tooltips, descriptions, tier badges, and form rendering.
// Derived from official ReadOnlyREST documentation.

import type { Edition, RuleType } from './types'

export interface RuleFieldMeta {
  type: RuleType
  label: string
  description: string
  tier: Edition
  category: 'authentication' | 'authorization' | 'network' | 'elasticsearch' | 'http' | 'kibana' | 'response' | 'deprecated'
  valueType: 'string' | 'string[]' | 'integer' | 'boolean' | 'enum' | 'object' | 'duration'
  enumValues?: string[]
  placeholder?: string
  deprecated?: boolean
  deprecationHint?: string
}

export const RULE_METADATA: RuleFieldMeta[] = [
  // === Authentication Rules ===
  {
    type: 'auth_key',
    label: 'Auth Key',
    description: 'HTTP Basic Auth credentials in username:password format (plaintext). Matched against Authorization header.',
    tier: 'free',
    category: 'authentication',
    valueType: 'string',
    placeholder: 'username:password',
  },
  {
    type: 'auth_key_sha256',
    label: 'Auth Key (SHA256)',
    description: 'SHA256-hashed credentials. Format: "hash" or "username:hash".',
    tier: 'free',
    category: 'authentication',
    valueType: 'string',
    placeholder: 'username:sha256hash',
  },
  {
    type: 'auth_key_sha512',
    label: 'Auth Key (SHA512)',
    description: 'SHA512-hashed credentials. Format: "hash" or "username:hash".',
    tier: 'free',
    category: 'authentication',
    valueType: 'string',
    placeholder: 'username:sha512hash',
  },
  {
    type: 'auth_key_sha1',
    label: 'Auth Key (SHA1)',
    description: 'SHA1-hashed credentials. Format: "hash" or "username:hash".',
    tier: 'free',
    category: 'authentication',
    valueType: 'string',
    placeholder: 'username:sha1hash',
  },
  {
    type: 'auth_key_pbkdf2',
    label: 'Auth Key (PBKDF2)',
    description: 'PBKDF2-hashed credentials. Uses HmacSHA512, 10000 iterations, 512-bit derived key.',
    tier: 'free',
    category: 'authentication',
    valueType: 'string',
    placeholder: 'username:pbkdf2hash',
  },
  {
    type: 'auth_key_unix',
    label: 'Auth Key (Unix)',
    description: 'Unix /etc/shadow format. CPU-intensive, results are cached.',
    tier: 'free',
    category: 'authentication',
    valueType: 'string',
    placeholder: 'username:$6$rounds=N$salt$hash',
  },
  {
    type: 'proxy_auth',
    label: 'Proxy Auth',
    description: 'Authenticate via reverse proxy header (e.g. X-Forwarded-User). Value must be "*" (accept any proxied user) or the name of a proxy_auth_configs entry that specifies which header to read.',
    tier: 'free',
    category: 'authentication',
    valueType: 'string',
    placeholder: '* or proxy_auth_config name',
  },
  {
    type: 'token_authentication',
    label: 'Token Authentication',
    description: 'Match a static token from a configurable HTTP header. Assign a fixed username.',
    tier: 'free',
    category: 'authentication',
    valueType: 'object',
  },
  {
    type: 'external_authentication',
    label: 'External Authentication',
    description: 'Authenticate via an external HTTP service. Forwards Basic Auth credentials.',
    tier: 'free',
    category: 'authentication',
    valueType: 'string',
    placeholder: 'service_name',
  },
  // === LDAP Rules ===
  {
    type: 'ldap_authentication',
    label: 'LDAP Authentication',
    description: 'Authenticate user credentials against an LDAP directory.',
    tier: 'free',
    category: 'authentication',
    valueType: 'string',
    placeholder: 'ldap_connector_name',
  },
  {
    type: 'ldap_authorization',
    label: 'LDAP Authorization',
    description: 'Check LDAP group membership. Requires a separate authentication rule in the same block.',
    tier: 'free',
    category: 'authorization',
    valueType: 'object',
  },
  {
    type: 'ldap_auth',
    label: 'LDAP Auth (Combined)',
    description: 'Combined LDAP authentication and authorization in one rule.',
    tier: 'free',
    category: 'authentication',
    valueType: 'object',
  },
  // === JWT Rules ===
  {
    type: 'jwt_authentication',
    label: 'JWT Authentication',
    description: 'Validate JWT token signature and extract user identity. Requires user_claim in JWT connector.',
    tier: 'free',
    category: 'authentication',
    valueType: 'string',
    placeholder: 'jwt_connector_name',
  },
  {
    type: 'jwt_authorization',
    label: 'JWT Authorization',
    description: 'Check JWT group claims. Requires group_ids_claim in JWT connector.',
    tier: 'free',
    category: 'authorization',
    valueType: 'object',
  },
  {
    type: 'jwt_auth',
    label: 'JWT Auth (Combined)',
    description: 'Combined JWT authentication and authorization. Requires both user_claim and group_ids_claim.',
    tier: 'free',
    category: 'authentication',
    valueType: 'object',
  },
  // === ROR KBN Rules (Enterprise) ===
  {
    type: 'ror_kbn_authentication',
    label: 'ROR KBN Authentication',
    description: 'Authenticate via ReadOnlyREST Kibana plugin (SAML). Enterprise only.',
    tier: 'enterprise',
    category: 'authentication',
    valueType: 'string',
    placeholder: 'ror_kbn_connector_name',
  },
  {
    type: 'ror_kbn_authorization',
    label: 'ROR KBN Authorization',
    description: 'Check group membership via ROR KBN connector. Enterprise only.',
    tier: 'enterprise',
    category: 'authorization',
    valueType: 'object',
  },
  {
    type: 'ror_kbn_auth',
    label: 'ROR KBN Auth (Combined)',
    description: 'Combined ROR KBN authentication and authorization. Enterprise only.',
    tier: 'enterprise',
    category: 'authentication',
    valueType: 'object',
  },
  // === Group Rules ===
  {
    type: 'groups_any_of',
    label: 'Groups (Any Of)',
    description: 'Match if user belongs to ANY of the listed groups (OR logic).',
    tier: 'free',
    category: 'authorization',
    valueType: 'string[]',
    placeholder: 'Add group name...',
  },
  {
    type: 'groups_all_of',
    label: 'Groups (All Of)',
    description: 'Match if user belongs to ALL listed groups (AND logic).',
    tier: 'free',
    category: 'authorization',
    valueType: 'string[]',
    placeholder: 'Add group name...',
  },
  {
    type: 'groups_not_any_of',
    label: 'Groups (Not Any Of)',
    description: 'Match if user belongs to NONE of the listed groups (negative OR).',
    tier: 'free',
    category: 'authorization',
    valueType: 'string[]',
    placeholder: 'Add group name...',
  },
  {
    type: 'groups_not_all_of',
    label: 'Groups (Not All Of)',
    description: 'Match if user does NOT belong to ALL listed groups (negative AND).',
    tier: 'free',
    category: 'authorization',
    valueType: 'string[]',
    placeholder: 'Add group name...',
  },
  {
    type: 'groups',
    label: 'Groups',
    description: 'Alias for groups_any_of. Match if user belongs to ANY of the listed groups (OR logic).',
    tier: 'free',
    category: 'authorization',
    valueType: 'string[]',
    placeholder: 'Add group name...',
  },
  {
    type: 'roles',
    label: 'Roles',
    description: 'Alias for groups_any_of. Match if user belongs to ANY of the listed groups (OR logic).',
    tier: 'free',
    category: 'authorization',
    valueType: 'string[]',
    placeholder: 'Add role name...',
  },
  {
    type: 'any_of',
    label: 'Any Of',
    description: 'Alias for groups_any_of. Match if user belongs to ANY of the listed groups.',
    tier: 'free',
    category: 'authorization',
    valueType: 'string[]',
    placeholder: 'Add group name...',
  },
  {
    type: 'groups_or',
    label: 'Groups (OR)',
    description: 'Alias for groups_any_of. Match if user belongs to ANY of the listed groups.',
    tier: 'free',
    category: 'authorization',
    valueType: 'string[]',
    placeholder: 'Add group name...',
  },
  {
    type: 'all_of',
    label: 'All Of',
    description: 'Alias for groups_all_of. Match if user belongs to ALL listed groups.',
    tier: 'free',
    category: 'authorization',
    valueType: 'string[]',
    placeholder: 'Add group name...',
  },
  {
    type: 'groups_and',
    label: 'Groups (AND)',
    description: 'Alias for groups_all_of. Match if user belongs to ALL listed groups.',
    tier: 'free',
    category: 'authorization',
    valueType: 'string[]',
    placeholder: 'Add group name...',
  },
  {
    type: 'roles_and',
    label: 'Roles (AND)',
    description: 'Alias for groups_all_of. Match if user belongs to ALL listed groups.',
    tier: 'free',
    category: 'authorization',
    valueType: 'string[]',
    placeholder: 'Add role name...',
  },
  {
    type: 'not_any_of',
    label: 'Not Any Of',
    description: 'Alias for groups_not_any_of. Match if user belongs to NONE of the listed groups.',
    tier: 'free',
    category: 'authorization',
    valueType: 'string[]',
    placeholder: 'Add group name...',
  },
  {
    type: 'not_all_of',
    label: 'Not All Of',
    description: 'Alias for groups_not_all_of. Match if user does NOT belong to ALL listed groups.',
    tier: 'free',
    category: 'authorization',
    valueType: 'string[]',
    placeholder: 'Add group name...',
  },
  {
    type: 'groups_combined',
    label: 'Groups (Combined)',
    description: 'Combined group matching with any_of, all_of, not_any_of, not_all_of sub-fields.',
    tier: 'free',
    category: 'authorization',
    valueType: 'object',
  },
  {
    type: 'groups_provider_authorization',
    label: 'Groups Provider Authorization',
    description: 'Check group membership via an external groups provider service.',
    tier: 'free',
    category: 'authorization',
    valueType: 'object',
  },
  {
    type: 'external_authorization',
    label: 'External Authorization',
    description: 'Check group membership via an external groups provider service (alias for groups_provider_authorization).',
    tier: 'free',
    category: 'authorization',
    valueType: 'object',
  },
  {
    type: 'users',
    label: 'Users',
    description: 'Match by username patterns. Supports wildcards (e.g. "root", "*@mydomain.com").',
    tier: 'free',
    category: 'authorization',
    valueType: 'string[]',
    placeholder: 'Add username pattern...',
  },
  // === Network Rules ===
  {
    type: 'hosts',
    label: 'Hosts',
    description: 'Source IP addresses or CIDR subnets of the TCP connection origin.',
    tier: 'free',
    category: 'network',
    valueType: 'string[]',
    placeholder: 'e.g. 192.168.1.0/24',
  },
  {
    type: 'hosts_local',
    label: 'Hosts Local',
    description: 'Destination IP addresses or CIDR subnets where the ES HTTP API is bound.',
    tier: 'free',
    category: 'network',
    valueType: 'string[]',
    placeholder: 'e.g. 127.0.0.1',
  },
  {
    type: 'x_forwarded_for',
    label: 'X-Forwarded-For',
    description: 'Match IP addresses from the X-Forwarded-For header (proxy scenarios).',
    tier: 'free',
    category: 'network',
    valueType: 'string[]',
    placeholder: 'e.g. 10.0.0.0/8',
  },
  // === Elasticsearch Rules ===
  {
    type: 'indices',
    label: 'Indices',
    description: 'Restrict access to specific indices, aliases, or data streams. Supports wildcards and dynamic variables.',
    tier: 'free',
    category: 'elasticsearch',
    valueType: 'string[]',
    placeholder: 'e.g. logstash-*, filebeat-*',
  },
  {
    type: 'actions',
    label: 'Actions',
    description: 'Restrict allowed Elasticsearch actions. Supports wildcards (e.g. "indices:data/read/*").',
    tier: 'free',
    category: 'elasticsearch',
    valueType: 'string[]',
    placeholder: 'e.g. indices:data/read/*',
  },
  {
    type: 'filter',
    label: 'Filter (DLS)',
    description: 'Document Level Security — Elasticsearch bool query JSON. Only affects read operations. Supports dynamic variables.',
    tier: 'free',
    category: 'elasticsearch',
    valueType: 'string',
    placeholder: '{"bool":{"must":[{"term":{"department":"@{user}"}}]}}',
  },
  {
    type: 'fields',
    label: 'Fields (FLS)',
    description: 'Field Level Security — whitelist or blacklist (~prefix) field names. Wildcards and nested paths supported.',
    tier: 'free',
    category: 'elasticsearch',
    valueType: 'string[]',
    placeholder: 'e.g. title, body, ~secret_*',
  },
  {
    type: 'response_fields',
    label: 'Response Fields',
    description: 'Whitelist or blacklist (~prefix) fields in any ES response, not just documents.',
    tier: 'free',
    category: 'elasticsearch',
    valueType: 'string[]',
    placeholder: 'e.g. hits.hits._source, ~aggregations',
  },
  {
    type: 'snapshots',
    label: 'Snapshots',
    description: 'Restrict snapshot operations by name pattern. Wildcards and dynamic variables supported.',
    tier: 'free',
    category: 'elasticsearch',
    valueType: 'string[]',
    placeholder: 'e.g. snap_*',
  },
  {
    type: 'repositories',
    label: 'Repositories',
    description: 'Restrict repository operations by name pattern. Wildcards and dynamic variables supported.',
    tier: 'free',
    category: 'elasticsearch',
    valueType: 'string[]',
    placeholder: 'e.g. my_repo_*',
  },
  {
    type: 'data_streams',
    label: 'Data Streams',
    description: 'Restrict access to specific data streams. Wildcards and dynamic variables supported.',
    tier: 'free',
    category: 'elasticsearch',
    valueType: 'string[]',
    placeholder: 'e.g. logs-*',
  },
  // === HTTP Rules ===
  {
    type: 'methods',
    label: 'HTTP Methods',
    description: 'Restrict allowed HTTP methods.',
    tier: 'free',
    category: 'http',
    valueType: 'string[]',
    enumValues: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'PATCH', 'OPTIONS'],
    placeholder: 'Select methods...',
  },
  {
    type: 'headers',
    label: 'Headers (AND)',
    description: 'ALL listed headers must match. Format: "header:pattern" or "~header:pattern" for negation.',
    tier: 'free',
    category: 'http',
    valueType: 'string[]',
    placeholder: 'e.g. X-Custom-Header:value*',
  },
  {
    type: 'headers_and',
    label: 'Headers (AND)',
    description: 'Alias for headers rule. ALL headers must match.',
    tier: 'free',
    category: 'http',
    valueType: 'string[]',
    placeholder: 'e.g. X-Custom-Header:value*',
  },
  {
    type: 'headers_or',
    label: 'Headers (OR)',
    description: 'At least ONE of the listed headers must match.',
    tier: 'free',
    category: 'http',
    valueType: 'string[]',
    placeholder: 'e.g. X-Custom-Header:value*',
  },
  {
    type: 'uri_re',
    label: 'URI Regex',
    description: 'Java regex patterns matching the request URI. OR logic across multiple patterns.',
    tier: 'free',
    category: 'http',
    valueType: 'string[]',
    placeholder: 'e.g. ^/myindex/.*$',
  },
  {
    type: 'max_body_length',
    label: 'Max Body Length',
    description: 'Maximum request body size in bytes. Set to 0 for bodyless requests only.',
    tier: 'free',
    category: 'http',
    valueType: 'integer',
    placeholder: '0',
  },
  {
    type: 'api_keys',
    label: 'API Keys',
    description: 'Acceptable API key values from the X-Api-Key header.',
    tier: 'free',
    category: 'http',
    valueType: 'string[]',
    placeholder: 'Add API key...',
  },
  // === Kibana Rule ===
  {
    type: 'kibana',
    label: 'Kibana',
    description: 'Kibana access settings: access level, index, hide_apps, metadata, allowed_api_paths.',
    tier: 'free',
    category: 'kibana',
    valueType: 'object',
  },
  // === Legacy Kibana Rules ===
  {
    type: 'kibana_access',
    label: 'Kibana Access',
    description: 'Legacy: Kibana access level (ro, rw, admin, etc.). Prefer the composite "kibana" rule.',
    tier: 'free',
    category: 'kibana',
    valueType: 'enum',
    enumValues: ['ro_strict', 'ro', 'rw', 'admin', 'api_only', 'unrestricted'],
    deprecated: true,
    deprecationHint: 'Use the composite "kibana" rule instead.',
  },
  {
    type: 'kibana_index',
    label: 'Kibana Index',
    description: 'Legacy: Custom Kibana index name. Prefer the composite "kibana" rule.',
    tier: 'free',
    category: 'kibana',
    valueType: 'string',
    placeholder: '.kibana_username',
    deprecated: true,
    deprecationHint: 'Use the composite "kibana" rule instead.',
  },
  {
    type: 'kibana_hide_apps',
    label: 'Kibana Hide Apps',
    description: 'Legacy: List of Kibana apps to hide. Prefer the composite "kibana" rule.',
    tier: 'free',
    category: 'kibana',
    valueType: 'string[]',
    placeholder: 'e.g. Enterprise Search|Overview',
    deprecated: true,
    deprecationHint: 'Use the composite "kibana" rule instead.',
  },
  {
    type: 'kibana_template_index',
    label: 'Kibana Template Index',
    description: 'Legacy: Kibana template index pattern. Prefer the composite "kibana" rule.',
    tier: 'free',
    category: 'kibana',
    valueType: 'string',
    placeholder: '.kibana_template',
    deprecated: true,
    deprecationHint: 'Use the composite "kibana" rule instead.',
  },
  // === Response Rules ===
  {
    type: 'response_headers',
    label: 'Response Headers',
    description: 'Add custom HTTP response headers. Format: "Header-Name:value".',
    tier: 'free',
    category: 'response',
    valueType: 'string[]',
    placeholder: 'e.g. X-Custom:value',
  },
  // === Deprecated ===
  {
    type: 'session_max_idle',
    label: 'Session Max Idle',
    description: 'Browser session timeout duration.',
    tier: 'free',
    category: 'deprecated',
    valueType: 'duration',
    placeholder: 'e.g. 1h, 30m',
    deprecated: true,
    deprecationHint: 'This setting is deprecated. Session management is handled by the Kibana plugin.',
  },
]

export const RULE_META_MAP = new Map(RULE_METADATA.map((m) => [m.type, m]))

export function getRuleMeta(type: RuleType): RuleFieldMeta | undefined {
  return RULE_META_MAP.get(type)
}

/** Returns all non-deprecated rules grouped by category, regardless of edition. */
export function getAllRulesByCategory() {
  const rules = RULE_METADATA.filter((m) => !m.deprecated)
  const categories = new Map<string, RuleFieldMeta[]>()
  for (const rule of rules) {
    const cat = categories.get(rule.category) || []
    cat.push(rule)
    categories.set(rule.category, cat)
  }
  return categories
}

const EDITION_RANK: Record<Edition, number> = { free: 0, pro: 1, enterprise: 2 }

/** Returns true if the given rule tier exceeds the current edition. */
export function isRuleAboveEdition(ruleTier: Edition, currentEdition: Edition): boolean {
  return EDITION_RANK[ruleTier] > EDITION_RANK[currentEdition]
}

// Kibana access level options
export const KIBANA_ACCESS_LEVELS = [
  { value: 'ro_strict', label: 'Read Only (Strict)', description: 'No write operations at all' },
  { value: 'ro', label: 'Read Only', description: 'Read access with minor write operations (e.g. saved objects)' },
  { value: 'rw', label: 'Read Write', description: 'Full read and write access to Kibana' },
  { value: 'admin', label: 'Admin', description: 'Full Kibana administration access' },
  { value: 'api_only', label: 'API Only', description: 'Programmatic API access without UI' },
  { value: 'unrestricted', label: 'Unrestricted', description: 'No restrictions on Kibana actions' },
] as const
