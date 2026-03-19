import { useMemo } from 'react'
import type { RorConfig, AccessControlBlock, UserDefinition } from '@/schema/types'
import type { GraphData, NodeData, EdgeData } from '@antv/g6'
import { AUTH_KEY_METHODS } from '@/schema/auth-registry'

/** Connector types we scan for in block rules (subset of CONNECTOR_CONFIG_KEY relevant for graph edges) */
const CONNECTOR_RULE_TYPES: Record<string, keyof RorConfig> = {
  ldap_auth: 'ldaps',
  ldap_authorization: 'ldaps',
  jwt_auth: 'jwt',
  ror_kbn_auth: 'ror_kbn',
  proxy_auth: 'proxy_auth_configs',
  external_authentication: 'external_authentication_service_configs',
  groups_provider_authorization: 'user_groups_providers',
}

/** Extract connector references from a block's rules */
function getBlockConnectorRefs(block: AccessControlBlock): string[] {
  const refs: string[] = []
  for (const rule of block.rules) {
    if (rule.type in CONNECTOR_RULE_TYPES) {
      const val = rule.value
      if (typeof val === 'string') refs.push(val)
      else if (val && typeof val === 'object' && 'name' in (val as Record<string, unknown>)) {
        refs.push((val as Record<string, string>).name)
      }
    }
  }
  return refs
}

/** Rule types that reference groups */
const GROUP_RULE_TYPES = new Set([
  'groups', 'groups_any_of', 'groups_all_of', 'groups_not_any_of', 'groups_not_all_of',
  'roles', 'any_of', 'groups_or', 'all_of', 'groups_and', 'roles_and',
  'not_any_of', 'not_all_of', 'groups_combined',
])

/** Get groups from a block's group rules (groups, groups_any_of, etc.) */
function getBlockGroups(block: AccessControlBlock): string[] {
  const groups: string[] = []
  for (const rule of block.rules) {
    if (GROUP_RULE_TYPES.has(rule.type)) {
      const val = rule.value
      if (Array.isArray(val)) {
        for (const v of val) {
          if (typeof v === 'string') groups.push(v)
        }
      } else if (typeof val === 'string') {
        groups.push(val)
      }
    }
  }
  return groups
}

/** Get a user's local groups as string[] */
function getUserLocalGroups(user: UserDefinition): string[] {
  if (!user.groups) return []
  return user.groups.map((g) => (typeof g === 'string' ? g : g.id))
}

/** Detect a user's auth type for display */
function getUserAuthType(user: UserDefinition): { type: 'local' | 'ldap' | 'jwt' | 'ror_kbn' | 'proxy' | 'ext_auth' | 'unknown'; connectorName: string } {
  const fields = user as unknown as Record<string, unknown>
  for (const m of AUTH_KEY_METHODS) {
    if (fields[m] !== undefined) return { type: 'local', connectorName: '' }
  }
  if (fields.ldap_auth !== undefined) {
    const val = fields.ldap_auth
    const name = val && typeof val === 'object' ? ((val as Record<string, unknown>).name as string) ?? '' : ''
    return { type: 'ldap', connectorName: name }
  }
  if (fields.ldap_authentication !== undefined) {
    const val = fields.ldap_authentication
    const name = typeof val === 'string' ? val : val && typeof val === 'object' ? ((val as Record<string, unknown>).name as string) ?? '' : ''
    return { type: 'ldap', connectorName: name }
  }
  if (fields.jwt_auth !== undefined) {
    const val = fields.jwt_auth
    const name = val && typeof val === 'object' ? ((val as Record<string, unknown>).name as string) ?? '' : ''
    return { type: 'jwt', connectorName: name }
  }
  if (fields.ror_kbn_auth !== undefined) {
    const val = fields.ror_kbn_auth
    const name = val && typeof val === 'object' ? ((val as Record<string, unknown>).name as string) ?? '' : ''
    return { type: 'ror_kbn', connectorName: name }
  }
  if (fields.proxy_auth !== undefined) return { type: 'proxy', connectorName: '' }
  if (fields.external_authentication !== undefined) {
    const val = fields.external_authentication
    const name = typeof val === 'string' ? val : val && typeof val === 'object' ? ((val as Record<string, unknown>).service as string) ?? '' : ''
    return { type: 'ext_auth', connectorName: name }
  }
  return { type: 'unknown', connectorName: '' }
}

const AUTH_TYPE_LABELS: Record<string, string> = {
  local: 'Local',
  ldap: 'LDAP',
  jwt: 'JWT',
  ror_kbn: 'ROR KBN',
  proxy: 'Proxy',
  ext_auth: 'Ext Auth',
  unknown: '?',
}

const AUTH_TYPE_ICONS: Record<string, string> = {
  local: '\uD83D\uDD11',   // 🔑
  ldap: '\uD83D\uDD17',    // 🔗
  jwt: '\uD83D\uDD17',     // 🔗
  ror_kbn: '\uD83D\uDD17', // 🔗
  proxy: '\uD83D\uDD17',   // 🔗
  ext_auth: '\uD83D\uDD17',// 🔗
  unknown: '?',
}

/** Map auth type → connector config key for edge targeting */
const AUTH_TYPE_TO_CONNECTOR_TYPE: Record<string, string> = {
  ldap: 'LDAP',
  jwt: 'JWT',
  ror_kbn: 'ROR KBN',
  proxy: 'Proxy Auth',
  ext_auth: 'Ext Auth',
}

// Layout constants — compact to maximize screen usage
const CHAIN_X = 300
const IDENTITY_BAND_Y = 50
const CHAIN_START_Y = 140       // pushed down to make room for identity band
const BLOCK_SPACING_Y = 90
const ALLOW_PILL_OFFSET_X = 220  // right of block (block half 130 + gap 50 + pill half 40)
const FORBID_PILL_X = 50         // left side, fixed
const CONNECTOR_X = 600
const PERIPHERAL_LEFT_X = 50
const USER_CARD_WIDTH = 140
const USER_SPACING_X = 12
const IDENTITY_BAND_X_START = 140

export function useAclFlowGraph(config: RorConfig): GraphData {
  return useMemo(() => {
    const nodes: NodeData[] = []
    const edges: EdgeData[] = []
    const blocks = config.access_control_rules ?? []
    const users = config.users ?? []
    const hasUsers = users.length > 0

    // Adjust chain start based on whether users exist
    const effectiveChainStartY = hasUsers ? CHAIN_START_Y : 40

    // ── Collect all user local groups for block badge computation ──
    const allUserGroups = new Set<string>()
    for (const u of users) {
      for (const g of getUserLocalGroups(u)) allUserGroups.add(g)
    }

    // ── Identity band (users above the chain) ──
    if (hasUsers) {
      // Section label: IDENTITY
      nodes.push({
        id: 'section-identity',
        style: { x: IDENTITY_BAND_X_START - 10, y: IDENTITY_BAND_Y - 50 },
        data: { nodeType: 'section-label', label: 'IDENTITY' },
      })

      if (users.length <= 6) {
        // Individual user cards
        users.forEach((user, i) => {
          const auth = getUserAuthType(user)
          const localGroups = getUserLocalGroups(user)
          const displayName = Array.isArray(user.username)
            ? user.username.join(', ')
            : user.username || 'User'
          const truncatedName = displayName.length > 18 ? displayName.slice(0, 17) + '\u2026' : displayName
          const groupsText = localGroups.length > 0 ? localGroups.join(', ') : ''
          const truncatedGroups = groupsText.length > 20 ? groupsText.slice(0, 19) + '\u2026' : groupsText
          const authLabel = AUTH_TYPE_LABELS[auth.type] || '?'
          const authIcon = AUTH_TYPE_ICONS[auth.type] || '?'

          const nodeId = `user-${i}`
          const x = IDENTITY_BAND_X_START + i * (USER_CARD_WIDTH + USER_SPACING_X)
          nodes.push({
            id: nodeId,
            style: { x, y: IDENTITY_BAND_Y },
            data: {
              nodeType: 'user-card',
              label: truncatedName,
              userIndex: i,
              authType: auth.type,
              authLabel,
              authIcon,
              connectorName: auth.connectorName,
              localGroups,
              groupsLabel: truncatedGroups,
            },
          })

          // Edge from user card → connector (external auth only)
          if (auth.connectorName && auth.type in AUTH_TYPE_TO_CONNECTOR_TYPE) {
            const connType = AUTH_TYPE_TO_CONNECTOR_TYPE[auth.type]
            const connId = `connector-${connType}-${auth.connectorName}`
            edges.push({
              id: `user-conn-${i}`,
              source: nodeId,
              target: connId,
              data: { edgeType: 'user-connector' },
            })
          }
        })
      } else {
        // Collapsed: group by auth type
        const byType: Record<string, number> = {}
        for (const u of users) {
          const auth = getUserAuthType(u)
          const key = auth.type
          byType[key] = (byType[key] || 0) + 1
        }
        const entries = Object.entries(byType)
        entries.forEach(([type, count], i) => {
          const icon = AUTH_TYPE_ICONS[type] || '?'
          const typeLabel = AUTH_TYPE_LABELS[type] || type
          const label = `${count} ${typeLabel} ${icon}`
          const x = IDENTITY_BAND_X_START + i * (130 + USER_SPACING_X)
          nodes.push({
            id: `user-group-${type}`,
            style: { x, y: IDENTITY_BAND_Y },
            data: {
              nodeType: 'user-group',
              label,
              authType: type,
              userCount: count,
            },
          })
        })
      }

      // Identity band background rect (subtle visual grouping)
      const itemCount = users.length <= 6
        ? users.length
        : Object.keys(users.reduce((acc, u) => { acc[getUserAuthType(u).type] = true; return acc }, {} as Record<string, boolean>)).length
      const itemWidth = users.length <= 6 ? USER_CARD_WIDTH : 120
      const itemSpacing = users.length <= 6 ? USER_SPACING_X : 22
      const cardsSpan = (itemCount - 1) * (itemWidth + itemSpacing)
      const bandWidth = Math.max(cardsSpan + itemWidth + 40, 300)
      const bandCenterX = IDENTITY_BAND_X_START + cardsSpan / 2
      nodes.push({
        id: 'identity-band-bg',
        style: { x: bandCenterX, y: IDENTITY_BAND_Y },
        data: {
          nodeType: 'identity-band-bg',
          label: '',
          bandWidth,
        },
      })
    }

    // ── ACL blocks background band ──
    if (blocks.length > 0) {
      const firstBlockY = effectiveChainStartY
      const lastBlockY = effectiveChainStartY + blocks.length * BLOCK_SPACING_Y
      const bandHeight = (lastBlockY - firstBlockY) + BLOCK_SPACING_Y + 40
      const bandWidth = 500 // wide enough for blocks + pills
      nodes.push({
        id: 'acl-band-bg',
        style: { x: CHAIN_X + 30, y: firstBlockY + bandHeight / 2 - 20 },
        data: { nodeType: 'acl-band-bg', bandWidth, bandHeight },
      })
    }

    // ── Section label: ACL CHAIN (inside the band) ──
    nodes.push({
      id: 'section-acl-chain',
      style: { x: CHAIN_X - 130, y: effectiveChainStartY - 20 },
      data: { nodeType: 'section-label', label: 'ACL BLOCKS' },
    })

    // ── Entry node ──
    nodes.push({
      id: 'entry',
      style: { x: CHAIN_X, y: effectiveChainStartY },
      data: { nodeType: 'entry', label: 'Request In' },
    })

    // ── Block nodes + per-block outcome pills ──
    let prevId = 'entry'
    blocks.forEach((block, i) => {
      const nodeId = `block-${block.id}`
      const blockY = effectiveChainStartY + (i + 1) * BLOCK_SPACING_Y

      // Compute group badge: intersect block's group rules with all users' local groups
      const blockGroups = getBlockGroups(block)
      const matchingGroups = blockGroups.filter((g) => allUserGroups.has(g))
      const groupsBadge = matchingGroups.length > 0
        ? matchingGroups.slice(0, 3).join(', ') + (matchingGroups.length > 3 ? '...' : '')
        : ''

      // The block node itself (in the chain)
      const ruleCount = block.rules.length
      const blockName = block.name || `Block ${i + 1}`
      const truncatedBlockName = blockName.length > 28 ? blockName.slice(0, 27) + '\u2026' : blockName

      nodes.push({
        id: nodeId,
        style: { x: CHAIN_X, y: blockY },
        data: {
          nodeType: 'block',
          label: truncatedBlockName,
          blockType: block.type,
          enabled: block.enabled,
          ruleCount,
          blockIndex: i,
          matchingGroups,
          groupsBadge,
        },
      })

      // Chain edge: "no match → try next"
      edges.push({
        id: `chain-${prevId}-${nodeId}`,
        source: prevId,
        target: nodeId,
        data: { edgeType: 'chain' },
      })

      // Per-block outcome pill (ALLOW blocks get their own pill on the right)
      if (block.type === 'allow') {
        const pillId = `allow-pill-${block.id}`
        nodes.push({
          id: pillId,
          style: { x: CHAIN_X + ALLOW_PILL_OFFSET_X, y: blockY },
          data: { nodeType: 'allow-pill', label: 'ALLOW' },
        })
        edges.push({
          id: `match-${nodeId}`,
          source: nodeId,
          target: pillId,
          style: { sourcePort: 'right', targetPort: 'left' },
          data: { edgeType: 'match', matchType: 'allow' },
        })
      }

      prevId = nodeId
    })

    // ── Shared FORBID pill (left side) — at same Y as last block for straight arrow ──
    const lastBlockY = effectiveChainStartY + blocks.length * BLOCK_SPACING_Y
    const forbidBlocks = blocks.filter((b) => b.type === 'forbid')

    nodes.push({
      id: 'forbid-pill',
      style: { x: FORBID_PILL_X, y: lastBlockY },
      data: { nodeType: 'forbid-pill', label: 'FORBID' },
    })

    // Each forbid block → shared forbid pill
    forbidBlocks.forEach((block) => {
      edges.push({
        id: `match-block-${block.id}`,
        source: `block-${block.id}`,
        target: 'forbid-pill',
        style: { sourcePort: 'left', targetPort: 'right' },
        data: { edgeType: 'match', matchType: 'forbid' },
      })
    })

    // Default deny: last block in chain → FORBID pill directly, labeled "no match"
    edges.push({
      id: 'default-deny-to-forbid',
      source: prevId,
      target: 'forbid-pill',
      style: { sourcePort: 'left', targetPort: 'right' },
      data: { edgeType: 'default-deny' },
    })

    // ── Connector nodes (right side, further out) ──
    const allConnectors: { id: string; name: string; type: string }[] = []
    const addConnectors = (list: { name: string }[] | undefined, type: string) => {
      list?.forEach((c) => {
        allConnectors.push({ id: `connector-${type}-${c.name}`, name: c.name, type })
      })
    }
    addConnectors(config.ldaps, 'LDAP')
    addConnectors(config.jwt, 'JWT')
    addConnectors(config.ror_kbn, 'ROR KBN')
    addConnectors(config.proxy_auth_configs, 'Proxy Auth')
    addConnectors(config.external_authentication_service_configs, 'Ext Auth')
    addConnectors(config.user_groups_providers, 'Groups')

    // Section label: CONNECTORS (only if any exist)
    if (allConnectors.length > 0) {
      nodes.push({
        id: 'section-connectors',
        style: { x: CONNECTOR_X, y: effectiveChainStartY },
        data: { nodeType: 'section-label', label: 'CONNECTORS' },
      })
    }

    allConnectors.forEach((conn, i) => {
      nodes.push({
        id: conn.id,
        style: { x: CONNECTOR_X, y: effectiveChainStartY + 40 + i * 60 },
        data: { nodeType: 'connector', label: conn.name, connectorType: conn.type },
      })
    })

    // Reference edges: blocks → connectors they use
    blocks.forEach((block) => {
      const refs = getBlockConnectorRefs(block)
      refs.forEach((refName) => {
        const conn = allConnectors.find((c) => c.name === refName)
        if (conn) {
          edges.push({
            id: `ref-${block.id}-${conn.id}`,
            source: `block-${block.id}`,
            target: conn.id,
            data: { edgeType: 'reference' },
          })
        }
      })
    })

    // ── SSL node (left side) ──
    if (config.ssl) {
      nodes.push({
        id: 'ssl',
        style: { x: PERIPHERAL_LEFT_X, y: effectiveChainStartY + 100 },
        data: { nodeType: 'ssl', label: 'SSL / TLS' },
      })
    }

    return { nodes, edges }
  }, [config])
}
