import type {
  LdapConnector,
  JwtConfig,
  RorKbnConfig,
  ProxyAuthConfig,
  ExternalAuthenticationConfig,
  ExternalAuthorizationConfig,
  UserDefinition,
} from '@/schema/types'

/** Stable empty arrays for Zustand selector references — prevents unnecessary re-renders. */
export const EMPTY_LDAPS: LdapConnector[] = []
export const EMPTY_JWTS: JwtConfig[] = []
export const EMPTY_ROR_KBNS: RorKbnConfig[] = []
export const EMPTY_PROXY_AUTHS: ProxyAuthConfig[] = []
export const EMPTY_EXT_AUTHS: ExternalAuthenticationConfig[] = []
export const EMPTY_USER_GROUPS: ExternalAuthorizationConfig[] = []
export const EMPTY_USERS: UserDefinition[] = []
export const EMPTY_PROVIDERS: ExternalAuthorizationConfig[] = []
