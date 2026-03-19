// YAML serialization and parsing utilities for ROR config
// Converts between internal editor state and valid readonlyrest.yml format

import * as yaml from 'js-yaml'
import type { RorConfig, AccessControlBlock, RuleType } from '@/schema/types'

/**
 * Serialize RorConfig to valid readonlyrest.yml YAML.
 * The internal store format differs from YAML format:
 * - ACL blocks store rules as {type, value} array; YAML flattens them as keys
 * - Internal `id` and `enabled` fields are stripped from YAML output
 */
export function configToYaml(config: RorConfig): string {
  const rorObj: Record<string, unknown> = {}

  // Enable flag
  if (config.enable !== undefined) rorObj.enable = config.enable

  // Global settings
  if (config.global_settings) {
    const gs: Record<string, unknown> = {}
    if (config.global_settings.prompt_for_basic_auth !== undefined)
      gs.prompt_for_basic_auth = config.global_settings.prompt_for_basic_auth
    if (config.global_settings.response_if_req_forbidden)
      gs.response_if_req_forbidden = config.global_settings.response_if_req_forbidden
    if (config.global_settings.fls_engine)
      gs.fls_engine = config.global_settings.fls_engine
    if (config.global_settings.username_case_sensitivity)
      gs.username_case_sensitivity = config.global_settings.username_case_sensitivity
    if (Object.keys(gs).length > 0) rorObj.global_settings = gs
  }

  // Access control rules — flatten from internal format to ROR YAML format
  // Enabled blocks are serialized normally; disabled blocks are commented out.
  const enabledBlocks = config.access_control_rules.filter((b) => b.enabled)
  const disabledBlocks = config.access_control_rules.filter((b) => !b.enabled)
  if (enabledBlocks.length > 0 || disabledBlocks.length > 0) {
    rorObj.access_control_rules = enabledBlocks.map(blockToYamlObj)
  }

  // Users section
  if (config.users && config.users.length > 0) {
    rorObj.users = config.users.map((u) => {
      const obj: Record<string, unknown> = { username: u.username }
      if (u.auth_key) obj.auth_key = u.auth_key
      if (u.auth_key_sha256) obj.auth_key_sha256 = u.auth_key_sha256
      if (u.auth_key_sha512) obj.auth_key_sha512 = u.auth_key_sha512
      if (u.auth_key_sha1) obj.auth_key_sha1 = u.auth_key_sha1
      if (u.auth_key_pbkdf2) obj.auth_key_pbkdf2 = u.auth_key_pbkdf2
      if (u.auth_key_unix) obj.auth_key_unix = u.auth_key_unix
      if (u.groups && u.groups.length > 0) obj.groups = u.groups
      if (u.ldap_auth) obj.ldap_auth = u.ldap_auth
      if (u.ldap_authentication) obj.ldap_authentication = u.ldap_authentication
      if (u.jwt_auth) obj.jwt_auth = u.jwt_auth
      if (u.proxy_auth) obj.proxy_auth = u.proxy_auth
      if (u.external_authentication) obj.external_authentication = u.external_authentication
      if (u.ror_kbn_auth) obj.ror_kbn_auth = u.ror_kbn_auth
      if (u.ldap_authorization) obj.ldap_authorization = u.ldap_authorization
      if (u.groups_provider_authorization) obj.groups_provider_authorization = u.groups_provider_authorization
      return obj
    })
  }

  // Connectors
  if (config.ldaps && config.ldaps.length > 0) rorObj.ldaps = config.ldaps
  if (config.jwt && config.jwt.length > 0) rorObj.jwt = config.jwt
  if (config.ror_kbn && config.ror_kbn.length > 0) rorObj.ror_kbn = config.ror_kbn
  if (config.proxy_auth_configs && config.proxy_auth_configs.length > 0)
    rorObj.proxy_auth_configs = config.proxy_auth_configs
  if (config.external_authentication_service_configs && config.external_authentication_service_configs.length > 0)
    rorObj.external_authentication_service_configs = config.external_authentication_service_configs
  if (config.user_groups_providers && config.user_groups_providers.length > 0)
    rorObj.user_groups_providers = config.user_groups_providers
  if (config.impersonation && config.impersonation.length > 0)
    rorObj.impersonation = config.impersonation

  // Audit
  if (config.audit?.enabled) rorObj.audit = config.audit

  // SSL
  if (config.ssl && Object.keys(config.ssl).length > 0) rorObj.ssl = config.ssl
  if (config.ssl_internode && Object.keys(config.ssl_internode).length > 0)
    rorObj.ssl_internode = config.ssl_internode

  // Obfuscated headers
  if (config.obfuscated_headers && config.obfuscated_headers.length > 0)
    rorObj.obfuscated_headers = config.obfuscated_headers

  // Unrecognized keys (preserved from import)
  if (config._unrecognized) {
    for (const [key, val] of Object.entries(config._unrecognized)) {
      rorObj[key] = val
    }
  }

  if (Object.keys(rorObj).length === 0) {
    return '# ROR Studio - ReadOnlyREST Configuration\n# Add access control rules to get started.\n\nreadonlyrest:\n  access_control_rules: []\n'
  }

  const yamlStr = yaml.dump({ readonlyrest: rorObj }, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
    quotingType: '"',
    forceQuotes: false,
  })

  // Append commented-out disabled blocks at the end of access_control_rules
  let commentedBlocks = ''
  if (disabledBlocks.length > 0) {
    for (const block of disabledBlocks) {
      const blockYaml = yaml.dump([blockToYamlObj(block)], {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        sortKeys: false,
      })
      // Comment out each line and indent to match the access_control_rules section
      const commented = blockYaml
        .split('\n')
        .filter((line) => line.trim() !== '')
        .map((line) => `    # ${line}`)
        .join('\n')
      commentedBlocks += `\n    # [disabled]\n${commented}\n`
    }
  }

  // Insert commented blocks right after access_control_rules entries
  let result = `# Generated by ROR Studio\n${yamlStr}`
  if (commentedBlocks) {
    // Find the last line of access_control_rules and append after it
    const acrIndex = result.indexOf('access_control_rules:')
    if (acrIndex !== -1) {
      // Find the next top-level key (indented at same level as access_control_rules)
      const afterAcr = result.substring(acrIndex)
      const lines = afterAcr.split('\n')
      let insertAfterLine = 0
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i]
        // A line at indent level 2 (2 spaces + non-space) that isn't a continuation of ACR
        if (line.match(/^  [a-z]/) || line.trim() === '') {
          insertAfterLine = i
          break
        }
        insertAfterLine = i + 1
      }
      const before = lines.slice(0, insertAfterLine).join('\n')
      const after = lines.slice(insertAfterLine).join('\n')
      result = result.substring(0, acrIndex) + before + commentedBlocks + after
    }
  }

  return result
}

/**
 * Convert an internal ACL block to the flat YAML object format ROR expects.
 * Internal: { name, type, rules: [{type: 'indices', value: ['a','b']}] }
 * YAML:    { name: '...', type: allow, indices: ['a','b'] }
 */
function blockToYamlObj(block: AccessControlBlock): Record<string, unknown> {
  const obj: Record<string, unknown> = {}
  obj.name = block.name
  if (block.type !== 'allow') {
    if (block.response_message) {
      obj.type = { policy: block.type, response_message: block.response_message }
    } else {
      obj.type = block.type
    }
  }
  if (block.verbosity) obj.verbosity = block.verbosity

  for (const rule of block.rules) {
    // Flatten rule.type -> rule.value as a top-level key
    obj[rule.type] = rule.value
  }

  return obj
}

/**
 * Parse a readonlyrest.yml YAML string into internal RorConfig format.
 * Handles the readonlyrest: wrapper and converts flat ACL block keys to rule arrays.
 */
export function yamlToConfig(yamlText: string): { config: RorConfig; warnings: string[] } {
  const warnings: string[] = []
  const parsed = yaml.load(yamlText) as Record<string, unknown>

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid YAML: expected an object')
  }

  // Handle readonlyrest wrapper
  const ror = (parsed.readonlyrest || parsed) as Record<string, unknown>

  const config: RorConfig = {
    access_control_rules: [],
  }

  // Known top-level keys
  const knownKeys = new Set([
    'enable', 'global_settings', 'access_control_rules', 'users',
    'ldaps', 'jwt', 'ror_kbn', 'proxy_auth_configs',
    'external_authentication_service_configs', 'user_groups_providers',
    'external_groups_provider_service_configs',
    'impersonation', 'audit', 'ssl', 'ssl_internode',
    'obfuscated_headers',
    // Legacy aliases
    'prompt_for_basic_auth', 'response_if_req_forbidden',
  ])

  // Parse known fields
  if (ror.enable !== undefined) config.enable = ror.enable as boolean
  if (ror.global_settings) config.global_settings = ror.global_settings as RorConfig['global_settings']

  // Legacy top-level settings → global_settings
  if (ror.prompt_for_basic_auth !== undefined || ror.response_if_req_forbidden !== undefined) {
    config.global_settings = config.global_settings || {}
    if (ror.prompt_for_basic_auth !== undefined)
      config.global_settings.prompt_for_basic_auth = ror.prompt_for_basic_auth as boolean
    if (ror.response_if_req_forbidden !== undefined)
      config.global_settings.response_if_req_forbidden = ror.response_if_req_forbidden as string
  }

  // ACL blocks
  const rawBlocks = (ror.access_control_rules || []) as Array<Record<string, unknown>>
  config.access_control_rules = rawBlocks.map((block) => {
    const name = (block.name as string) || 'Unnamed Block'
    const typeVal = block.type
    let blockType: 'allow' | 'forbid' = 'allow'
    let responseMessage: string | undefined
    if (typeof typeVal === 'string') {
      blockType = typeVal === 'forbid' ? 'forbid' : 'allow'
    } else if (typeof typeVal === 'object' && typeVal !== null) {
      const typeObj = typeVal as Record<string, unknown>
      blockType = (typeObj.policy as string) === 'forbid' ? 'forbid' : 'allow'
      if (typeObj.response_message) responseMessage = typeObj.response_message as string
    }

    const blockKnownKeys = new Set(['name', 'type', 'verbosity'])
    const rules: Array<{ type: RuleType; value: unknown }> = []

    for (const [key, val] of Object.entries(block)) {
      if (!blockKnownKeys.has(key)) {
        rules.push({ type: key as RuleType, value: val })
      }
    }

    return {
      id: crypto.randomUUID(),
      name,
      type: blockType,
      enabled: true,
      rules,
      verbosity: block.verbosity as 'info' | 'error' | undefined,
      response_message: responseMessage,
    }
  })

  // Users
  if (ror.users) config.users = ror.users as RorConfig['users']

  // Connectors
  if (ror.ldaps) config.ldaps = ror.ldaps as RorConfig['ldaps']
  if (ror.jwt) config.jwt = ror.jwt as RorConfig['jwt']
  if (ror.ror_kbn) config.ror_kbn = ror.ror_kbn as RorConfig['ror_kbn']
  if (ror.proxy_auth_configs) config.proxy_auth_configs = ror.proxy_auth_configs as RorConfig['proxy_auth_configs']
  if (ror.external_authentication_service_configs)
    config.external_authentication_service_configs = ror.external_authentication_service_configs as RorConfig['external_authentication_service_configs']
  if (ror.user_groups_providers) config.user_groups_providers = ror.user_groups_providers as RorConfig['user_groups_providers']
  // Legacy alias for user_groups_providers
  if (ror.external_groups_provider_service_configs && !ror.user_groups_providers)
    config.user_groups_providers = ror.external_groups_provider_service_configs as RorConfig['user_groups_providers']
  if (ror.impersonation) config.impersonation = ror.impersonation as RorConfig['impersonation']

  // Audit
  if (ror.audit) config.audit = ror.audit as RorConfig['audit']

  // SSL
  if (ror.ssl) config.ssl = ror.ssl as RorConfig['ssl']
  if (ror.ssl_internode) config.ssl_internode = ror.ssl_internode as RorConfig['ssl_internode']
  if (ror.obfuscated_headers) config.obfuscated_headers = ror.obfuscated_headers as string[]

  // Collect unrecognized keys
  const unrecognized: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(ror)) {
    if (!knownKeys.has(key)) {
      unrecognized[key] = val
      warnings.push(`Unrecognized key: ${key}`)
    }
  }
  if (Object.keys(unrecognized).length > 0) {
    config._unrecognized = unrecognized
  }

  return { config, warnings }
}
