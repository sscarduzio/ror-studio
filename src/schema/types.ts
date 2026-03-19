// ROR Studio - ReadOnlyREST Configuration Types
// Single source of truth derived from official ROR docs.

export type Edition = 'free' | 'pro' | 'enterprise'

export type RuleType =
  // Authentication rules (Free)
  | 'auth_key'
  | 'auth_key_sha1'
  | 'auth_key_sha256'
  | 'auth_key_sha512'
  | 'auth_key_pbkdf2'
  | 'auth_key_unix'
  | 'proxy_auth'
  | 'token_authentication'
  | 'external_authentication'
  // LDAP rules (Free)
  | 'ldap_authentication'
  | 'ldap_authorization'
  | 'ldap_auth'
  // JWT rules (Free)
  | 'jwt_authentication'
  | 'jwt_authorization'
  | 'jwt_auth'
  // ROR KBN rules (Enterprise)
  | 'ror_kbn_authentication'
  | 'ror_kbn_authorization'
  | 'ror_kbn_auth'
  // Group rules (Free)
  | 'groups_any_of'
  | 'groups_all_of'
  | 'groups_not_any_of'
  | 'groups_not_all_of'
  | 'groups'
  | 'roles'
  | 'any_of'
  | 'groups_or'
  | 'all_of'
  | 'groups_and'
  | 'roles_and'
  | 'not_any_of'
  | 'not_all_of'
  | 'groups_combined'
  | 'groups_provider_authorization'
  | 'external_authorization'
  | 'users'
  // Network rules (Free)
  | 'hosts'
  | 'hosts_local'
  | 'x_forwarded_for'
  // Elasticsearch rules (Free)
  | 'indices'
  | 'actions'
  | 'filter'
  | 'fields'
  | 'response_fields'
  | 'snapshots'
  | 'repositories'
  | 'data_streams'
  // HTTP rules (Free)
  | 'methods'
  | 'headers'
  | 'headers_and'
  | 'headers_or'
  | 'uri_re'
  | 'max_body_length'
  | 'api_keys'
  // Kibana rules
  | 'kibana'
  | 'kibana_access'
  | 'kibana_index'
  | 'kibana_hide_apps'
  | 'kibana_template_index'
  // Response rules (Free)
  | 'response_headers'
  // Deprecated
  | 'session_max_idle'

export interface AclRule {
  type: RuleType
  value: unknown
}

export interface AccessControlBlock {
  id: string
  name: string
  type: 'allow' | 'forbid'
  enabled: boolean
  rules: AclRule[]
  verbosity?: 'error' | 'info'
  response_message?: string
}

export interface UserDefinition {
  username: string | string[]
  auth_key?: string
  auth_key_sha256?: string
  auth_key_sha512?: string
  auth_key_sha1?: string
  auth_key_pbkdf2?: string
  auth_key_unix?: string
  groups?: string[] | Array<{ id: string; name?: string }>
  ldap_auth?: { name: string; groups_any_of?: string[]; groups_all_of?: string[] }
  ldap_authentication?: string | { name: string }
  ldap_authorization?: { name: string; groups_any_of?: string[]; groups_all_of?: string[] }
  jwt_auth?: { name: string; groups_any_of?: string[]; groups_all_of?: string[] }
  ror_kbn_auth?: { name: string; groups_any_of?: string[]; groups_all_of?: string[] }
  proxy_auth?: string
  external_authentication?: string | { service: string; cache_ttl_in_sec?: number }
  groups_provider_authorization?: { user_groups_provider: string; groups_any_of?: string[]; groups_all_of?: string[] }
}

export interface LdapUserSearch {
  search_user_base_DN: string
  user_id_attribute?: string
  skip_user_search?: boolean
}

export interface LdapGroupSearch {
  search_groups_base_DN?: string
  group_search_filter?: string
  group_id_attribute?: string
  group_name_attribute?: string
  unique_member_attribute?: string
  group_attribute_is_dn?: boolean
  server_side_groups_filtering?: boolean
  nested_groups_depth?: number
  groups_from_user_attribute?: string
}

export interface LdapConnector {
  name: string
  // Connection - single host
  host?: string
  port?: number
  // Connection - multi host
  hosts?: string[]
  ha?: 'FAILOVER' | 'ROUND_ROBIN'
  // SSL
  ssl_enabled?: boolean
  ssl_trust_all_certs?: boolean
  // Connection settings
  connection_pool_size?: number
  connection_timeout?: string
  request_timeout?: string
  connection_health_check_interval?: string
  connection_max_age?: string
  ignore_ldap_connectivity_problems?: boolean
  cache_ttl?: string
  // Circuit breaker
  circuit_breaker?: {
    max_retries?: number
    reset_duration?: string
  }
  // Server discovery
  server_discovery?: boolean | {
    record_name?: string
    dns_url?: string
    ttl?: string
    use_ssl?: boolean
  }
  // Binding
  bind_dn?: string
  bind_password?: string
  // User search (nested)
  users: LdapUserSearch
  // Group search (nested)
  groups?: LdapGroupSearch
}

export interface JwtConfig {
  name: string
  signature_key: string
  signature_algo?: 'NONE' | 'RSA' | 'HMAC' | 'EC'
  user_claim?: string
  group_ids_claim?: string
  group_names_claim?: string
  header_name?: string
}

export interface RorKbnConfig {
  name: string
  signature_key: string
}

export interface ProxyAuthConfig {
  name: string
  user_id_header: string
}

export interface ExternalAuthenticationConfig {
  name: string
  authentication_endpoint: string
  success_status_code: number
  cache_ttl_in_sec?: number
  http_connection_settings?: HttpConnectionSettings
}

export interface ExternalAuthorizationConfig {
  name: string
  groups_endpoint: string
  auth_token_name: string
  auth_token_passed_as: 'HEADER' | 'QUERY_PARAM'
  http_method?: 'GET' | 'POST'
  response_groups_ids_json_path?: string
  response_groups_json_path?: string
  response_groups_names_json_path?: string
  cache_ttl_in_sec?: number
  http_connection_settings?: HttpConnectionSettings
}

export interface HttpConnectionSettings {
  connection_timeout_in_sec?: number
  socket_timeout_in_sec?: number
  connection_request_timeout_in_sec?: number
  connection_pool_size?: number
  validate?: boolean
}

export interface ImpersonationEntry {
  impersonator: string
  users: string[]
  auth_key?: string
  auth_key_sha256?: string
  ldap_authentication?: string | { name: string }
}

export interface SslConfig {
  // Keystore mode
  keystore_file?: string
  keystore_pass?: string
  key_pass?: string
  key_alias?: string
  // PEM mode
  server_certificate_key_file?: string
  server_certificate_file?: string
  // Security
  allowed_protocols?: string[]
  allowed_ciphers?: string[]
  client_authentication?: boolean
  certificate_verification?: boolean
  // Trust store
  truststore_file?: string
  truststore_pass?: string
  client_trusted_certificate_file?: string
}

export interface SslInternodeConfig {
  enable?: boolean
  keystore_file?: string
  keystore_pass?: string
  key_pass?: string
  truststore_file?: string
  truststore_pass?: string
  certificate_verification?: boolean
  hostname_verification?: boolean
  client_authentication?: boolean
}

export interface AuditOutput {
  type: 'index' | 'data_stream' | 'log'
  enabled?: boolean
  // index type
  index_template?: string
  cluster?: string[]
  // data_stream type
  data_stream?: string
  // log type
  logger_name?: string
  // serializer
  serializer?: {
    type: 'static' | 'configurable' | 'ecs'
    class_name?: string
    fields?: Record<string, unknown>
    verbosity_level_serialization_mode?: string[]
    include_full_request_content?: boolean
  }
}

export interface AuditConfig {
  enabled: boolean
  outputs?: AuditOutput[]
}

export interface GlobalSettings {
  prompt_for_basic_auth?: boolean
  response_if_req_forbidden?: string
  fls_engine?: 'es_with_lucene' | 'es'
  username_case_sensitivity?: 'case_sensitive' | 'case_insensitive'
  users_section_duplicate_usernames_detection?: boolean
  fips_mode?: 'SSL_ONLY'
}

export interface RorConfig {
  // Top-level
  enable?: boolean
  global_settings?: GlobalSettings

  // Access control rules
  access_control_rules: AccessControlBlock[]

  // User definitions
  users?: UserDefinition[]

  // Authentication connectors
  ldaps?: LdapConnector[]
  jwt?: JwtConfig[]
  ror_kbn?: RorKbnConfig[]
  proxy_auth_configs?: ProxyAuthConfig[]
  external_authentication_service_configs?: ExternalAuthenticationConfig[]

  // Authorization connectors
  user_groups_providers?: ExternalAuthorizationConfig[]

  // Impersonation (Enterprise)
  impersonation?: ImpersonationEntry[]

  // Audit
  audit?: AuditConfig

  // SSL
  ssl?: SslConfig
  ssl_internode?: SslInternodeConfig

  // Misc
  obfuscated_headers?: string[]

  // Unrecognized keys (preserved from import, internal only)
  _unrecognized?: Record<string, unknown>
}

// Editor state wraps the config with UI concerns
export interface EditorState {
  config: RorConfig
  edition: Edition
  activeTab: TabId
  wizardSeen: boolean
}

export type TabId =
  | 'getting-started'
  | 'acl-flow'
  | 'users-groups'
  | 'authentication'
  | 'authorization'
  | 'ssl-tls'
  | 'audit'
  | 'advanced'
