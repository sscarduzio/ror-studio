import { useMemo } from 'react'
import type { RorConfig } from '@/schema/types'
import { useEditorStore } from '@/store/editor-store'
import { EMPTY_LDAPS, EMPTY_JWTS, EMPTY_ROR_KBNS, EMPTY_PROXY_AUTHS, EMPTY_EXT_AUTHS, EMPTY_USER_GROUPS } from '@/schema/empty-defaults'

const CONNECTOR_SELECTORS: Record<string, (s: { config: RorConfig }) => Array<{ name: string }>> = {
  ldaps: (s) => s.config.ldaps ?? EMPTY_LDAPS,
  jwt: (s) => s.config.jwt ?? EMPTY_JWTS,
  ror_kbn: (s) => s.config.ror_kbn ?? EMPTY_ROR_KBNS,
  proxy_auth_configs: (s) => s.config.proxy_auth_configs ?? EMPTY_PROXY_AUTHS,
  external_authentication_service_configs: (s) => s.config.external_authentication_service_configs ?? EMPTY_EXT_AUTHS,
  user_groups_providers: (s) => s.config.user_groups_providers ?? EMPTY_USER_GROUPS,
}

const EMPTY_NAMES: string[] = []
const FALLBACK_SELECTOR = () => EMPTY_NAMES

export function useConnectorNames(configKey: keyof RorConfig | string): string[] {
  const selector = CONNECTOR_SELECTORS[configKey as string]
  const connectors = useEditorStore(selector ?? FALLBACK_SELECTOR)
  return useMemo(
    () => Array.isArray(connectors) ? connectors.map((c) => (c as { name: string }).name) : [],
    [connectors]
  )
}
