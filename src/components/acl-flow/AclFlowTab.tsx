import { useEffect, useRef, useState, useCallback } from 'react'
import { Graph } from '@antv/g6'
import type { NodeData, EdgeData } from '@antv/g6'
import { Maximize2, ZoomIn, ZoomOut } from 'lucide-react'
import { useEditorStore } from '@/store/editor-store'
import { useAclFlowGraph } from './useAclFlowGraph'
import { BlockDrawer } from './BlockDrawer'
import { ConnectorDrawer, type ConnectorTarget } from './ConnectorDrawer'
import { UserDrawer } from './UserDrawer'

/** Auth-type color ring — 5 distinct pastel palettes */
const AUTH_COLORS: { fill: string; stroke: string; text: string }[] = [
  { fill: '#ede9fe', stroke: '#8b5cf6', text: '#5b21b6' }, // violet  — local
  { fill: '#dbeafe', stroke: '#3b82f6', text: '#1e40af' }, // blue    — ldap
  { fill: '#fef3c7', stroke: '#f59e0b', text: '#92400e' }, // amber   — jwt
  { fill: '#d1fae5', stroke: '#10b981', text: '#065f46' }, // emerald — ror_kbn
  { fill: '#fce7f3', stroke: '#ec4899', text: '#9d174d' }, // pink    — proxy/ext
]

const AUTH_TYPE_COLOR_INDEX: Record<string, number> = {
  local: 0,
  ldap: 1,
  jwt: 2,
  ror_kbn: 3,
  proxy: 4,
  ext_auth: 0,  // wraps around
  unknown: 1,
}

function getAuthColor(authType: string) {
  const idx = AUTH_TYPE_COLOR_INDEX[authType] ?? (authType.length % AUTH_COLORS.length)
  return AUTH_COLORS[idx]
}

/** Color palette for node types */
const COLORS = {
  entry: { fill: '#e0f2fe', stroke: '#0ea5e9', text: '#0369a1' },
  allow: { fill: '#dcfce7', stroke: '#22c55e', text: '#15803d' },
  forbid: { fill: '#fee2e2', stroke: '#ef4444', text: '#b91c1c' },
  disabled: { fill: '#f1f5f9', stroke: '#94a3b8', text: '#64748b' },
  connector: { fill: '#fef3c7', stroke: '#f59e0b', text: '#92400e' },
  users: { fill: '#ede9fe', stroke: '#8b5cf6', text: '#5b21b6' },
  ssl: { fill: '#fce7f3', stroke: '#ec4899', text: '#9d174d' },
  exitAllow: { fill: '#22c55e', stroke: '#16a34a', text: '#ffffff' },
  exitForbid: { fill: '#ef4444', stroke: '#dc2626', text: '#ffffff' },
}

function getNodeStyle(nodeId: string, data: Record<string, unknown>) {
  const nodeType = data.nodeType as string
  const blockType = data.blockType as string | undefined
  const enabled = data.enabled as boolean | undefined

  // ── Shared HTML helpers ──
  const font = 'ui-sans-serif,system-ui,-apple-system,sans-serif'
  const nid = (id: string) => `data-node-id="${id}"`

  if (nodeType === 'entry') {
    return {
      type: 'rect' as const,
      style: {
        size: [140, 40] as [number, number],
        radius: 20,
        fill: COLORS.entry.fill,
        stroke: COLORS.entry.stroke,
        lineWidth: 2,
        labelText: data.label as string,
        labelPlacement: 'center' as const,
        labelFill: COLORS.entry.text,
        labelFontSize: 12,
        labelFontWeight: 700,
      },
    }
  }

  if (nodeType === 'block') {
    const palette = enabled === false ? COLORS.disabled : blockType === 'forbid' ? COLORS.forbid : COLORS.allow
    const idx = (data.blockIndex as number) + 1
    const ruleCount = data.ruleCount as number
    const groupsBadge = data.groupsBadge as string
    const typeTag = blockType === 'forbid' ? 'FORBID' : 'ALLOW'
    const meta = `${ruleCount} rule${ruleCount !== 1 ? 's' : ''}${groupsBadge ? ` · ${groupsBadge}` : ''}`
    return {
      type: 'rect' as const,
      style: {
        size: [260, 56] as [number, number],
        radius: 8,
        fill: palette.fill,
        stroke: palette.stroke,
        lineWidth: 2,
        opacity: enabled === false ? 0.5 : 1,
        cursor: 'pointer' as const,
        labelText: `${idx}. ${data.label}  [${typeTag}]\n${meta}`,
        labelPlacement: 'center' as const,
        labelFill: palette.text,
        labelFontSize: 10,
        labelFontWeight: 600,
        labelLineHeight: 15,
        ports: [
          { id: 'top', placement: [0.5, 0] as [number, number] },
          { id: 'bottom', placement: [0.5, 1] as [number, number] },
          { id: 'right', placement: [1, 0.5] as [number, number] },
          { id: 'left', placement: [0, 0.5] as [number, number] },
        ],
      },
    }
  }

  if (nodeType === 'allow-pill') {
    return {
      type: 'rect' as const,
      style: {
        size: [72, 28] as [number, number],
        radius: 14,
        fill: COLORS.exitAllow.fill,
        stroke: COLORS.exitAllow.stroke,
        lineWidth: 1.5,
        labelText: 'ALLOW',
        labelPlacement: 'center' as const,
        labelFill: '#fff',
        labelFontSize: 9,
        labelFontWeight: 800,
        shadowColor: 'rgba(34,197,94,0.25)',
        shadowBlur: 8,
        shadowOffsetY: 2,
        ports: [
          { id: 'left', placement: [0, 0.5] as [number, number] },
        ],
      },
    }
  }

  if (nodeType === 'forbid-pill') {
    return {
      type: 'rect' as const,
      style: {
        size: [72, 28] as [number, number],
        radius: 14,
        fill: COLORS.exitForbid.fill,
        stroke: COLORS.exitForbid.stroke,
        lineWidth: 1.5,
        labelText: 'FORBID',
        labelPlacement: 'center' as const,
        labelFill: '#fff',
        labelFontSize: 9,
        labelFontWeight: 800,
        shadowColor: 'rgba(239,68,68,0.25)',
        shadowBlur: 8,
        shadowOffsetY: 2,
        ports: [
          { id: 'right', placement: [1, 0.5] as [number, number] },
        ],
      },
    }
  }

  if (nodeType === 'connector') {
    const connType = data.connectorType as string
    return {
      type: 'rect' as const,
      style: {
        size: [160, 48] as [number, number],
        radius: 6,
        fill: COLORS.connector.fill,
        stroke: COLORS.connector.stroke,
        lineWidth: 1.5,
        labelText: `${connType}\n${data.label}`,
        labelPlacement: 'center' as const,
        labelFill: COLORS.connector.text,
        labelFontSize: 10,
        labelFontWeight: 600,
        labelLineHeight: 14,
        ports: [
          { id: 'left', placement: [0, 0.5] as [number, number] },
          { id: 'top', placement: [0.5, 0] as [number, number] },
        ],
      },
    }
  }

  // User card (individual user in identity band) — HTML node for rich layout
  if (nodeType === 'user-card') {
    const authPalette = getAuthColor(data.authType as string)
    const username = data.label as string
    const authLabel = data.authLabel as string
    const groupsLabel = (data.groupsLabel as string) || ''
    const w = 140
    const h = 56

    const innerHTML = `<div ${nid(nodeId)} style="
      width:${w}px;height:${h}px;box-sizing:border-box;
      background:${authPalette.fill};border:1.5px solid ${authPalette.stroke};
      border-radius:6px;cursor:pointer;position:relative;overflow:hidden;
      font-family:ui-sans-serif,system-ui,sans-serif;
      display:flex;flex-direction:column;justify-content:center;padding:6px 10px;
      transition:box-shadow 0.2s ease;
    ">
      <div style="
        position:absolute;top:0;right:0;
        background:${authPalette.stroke};color:#fff;
        font-size:7px;font-weight:700;letter-spacing:0.3px;
        padding:1px 6px 1px 8px;border-radius:0 4px 0 6px;
        text-transform:uppercase;line-height:14px;
      ">${authLabel}</div>
      <div style="
        font-size:10px;font-weight:700;color:${authPalette.text};
        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
        padding-right:36px;
      ">${username}</div>
      ${groupsLabel ? `<div style="
        font-size:8px;color:${authPalette.text};opacity:0.7;
        margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
      ">${groupsLabel}</div>` : ''}
    </div>`

    return {
      type: 'html' as const,
      style: {
        size: [w, h] as [number, number],
        innerHTML,
        dx: -w / 2,
        dy: -h / 2,
        ports: [
          { id: 'bottom', placement: [0.5, 1] as [number, number] },
        ],
      },
    }
  }

  // User group (collapsed, for 7+ users)
  if (nodeType === 'user-group') {
    const authPalette = getAuthColor(data.authType as string)
    return {
      type: 'rect' as const,
      style: {
        size: [120, 44] as [number, number],
        radius: 6,
        fill: authPalette.fill,
        stroke: authPalette.stroke,
        lineWidth: 1.5,
        cursor: 'pointer' as const,
        labelText: data.label as string,
        labelPlacement: 'center' as const,
        labelFill: authPalette.text,
        labelFontSize: 10,
        labelFontWeight: 600,
      },
    }
  }

  // Section labels (IDENTITY, ACL CHAIN, CONNECTORS)
  if (nodeType === 'section-label') {
    return {
      type: 'rect' as const,
      style: {
        size: [1, 1] as [number, number],
        fill: 'transparent',
        stroke: 'transparent',
        lineWidth: 0,
        labelText: data.label as string,
        labelPlacement: 'center' as const,
        labelFill: '#94a3b8',
        labelFontSize: 9,
        labelFontWeight: 700,
        labelLetterSpacing: 1.5,
      },
    }
  }

  // ACL blocks band background
  if (nodeType === 'acl-band-bg') {
    const bandWidth = (data.bandWidth as number) || 500
    const bandHeight = (data.bandHeight as number) || 400
    return {
      type: 'rect' as const,
      style: {
        size: [bandWidth, bandHeight] as [number, number],
        radius: 12,
        fill: '#f0fdf4',
        stroke: '#bbf7d0',
        lineWidth: 1,
        opacity: 0.5,
        zIndex: -1,
      },
    }
  }

  // Identity band background
  if (nodeType === 'identity-band-bg') {
    const bandWidth = (data.bandWidth as number) || 400
    return {
      type: 'rect' as const,
      style: {
        size: [bandWidth, 80] as [number, number],
        radius: 12,
        fill: '#f5f3ff',
        stroke: '#e9d5ff',
        lineWidth: 1,
        opacity: 0.5,
        zIndex: -1,
      },
    }
  }

  if (nodeType === 'users') {
    return {
      type: 'rect' as const,
      style: {
        size: [140, 42] as [number, number],
        radius: 6,
        fill: COLORS.users.fill,
        stroke: COLORS.users.stroke,
        lineWidth: 1.5,
        labelText: data.label as string,
        labelPlacement: 'center' as const,
        labelFill: COLORS.users.text,
        labelFontSize: 11,
        labelFontWeight: 600,
      },
    }
  }

  if (nodeType === 'ssl') {
    return {
      type: 'rect' as const,
      style: {
        size: [130, 40] as [number, number],
        radius: 6,
        fill: COLORS.ssl.fill,
        stroke: COLORS.ssl.stroke,
        lineWidth: 1.5,
        labelText: data.label as string,
        labelPlacement: 'center' as const,
        labelFill: COLORS.ssl.text,
        labelFontSize: 11,
        labelFontWeight: 600,
      },
    }
  }

  // Fallback
  return { type: 'rect' as const, style: { size: [100, 40] as [number, number] } }
}

function getEdgeStyle(data: Record<string, unknown>) {
  const edgeType = data.edgeType as string

  if (edgeType === 'chain') {
    return {
      type: 'polyline' as const,
      style: {
        stroke: '#94a3b8',
        lineWidth: 2,
        router: { type: 'orth' as const },
        endArrow: true,
        endArrowSize: 6,
        endArrowFill: '#94a3b8',
      },
    }
  }

  if (edgeType === 'match') {
    const matchType = data.matchType as string
    const color = matchType === 'allow' ? '#16a34a' : '#dc2626'
    return {
      type: 'polyline' as const,
      style: {
        stroke: color,
        lineWidth: 1.5,
        lineDash: [6, 3],
        endArrow: true,
        endArrowSize: 5,
        endArrowFill: color,
      },
    }
  }

  if (edgeType === 'reference') {
    return {
      type: 'polyline' as const,
      style: {
        stroke: '#d97706',
        lineWidth: 1,
        lineDash: [4, 4],
        opacity: 0.5,
        router: { type: 'orth' as const },
        endArrow: true,
        endArrowSize: 4,
        endArrowFill: '#d97706',
      },
    }
  }

  if (edgeType === 'user-connector') {
    return {
      type: 'polyline' as const,
      style: {
        stroke: '#8b5cf6',
        lineWidth: 1,
        lineDash: [4, 4],
        opacity: 0.4,
        router: { type: 'orth' as const },
        endArrow: true,
        endArrowSize: 4,
        endArrowFill: '#8b5cf6',
      },
    }
  }

  if (edgeType === 'default-deny') {
    return {
      type: 'polyline' as const,
      style: {
        stroke: '#dc2626',
        lineWidth: 2,
        endArrow: true,
        endArrowSize: 6,
        endArrowFill: '#dc2626',
        labelText: 'no match',
        labelFontSize: 9,
        labelFill: '#dc2626',
        labelFontWeight: 600,
        labelBackground: true,
        labelBackgroundFill: '#ffffff',
        labelBackgroundOpacity: 0.9,
        labelPadding: [1, 4, 1, 4],
      },
    }
  }

  return { type: 'line' as const, style: { stroke: '#cbd5e1', lineWidth: 1 } }
}

interface HighlightAPI {
  highlightNode: (nodeId: string) => void
  highlightRelatedToBlock: (blockId: string) => void
  highlightRelatedToUser: (userId: string) => void
  clearAll: () => void
}

export function AclFlowTab() {
  const containerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<Graph | null>(null)
  const highlightRef = useRef<HighlightAPI | null>(null)
  const config = useEditorStore((s) => s.config)
  const updateBlock = useEditorStore((s) => s.updateBlock)
  const setActiveTab = useEditorStore((s) => s.setActiveTab)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [selectedConnector, setSelectedConnector] = useState<ConnectorTarget | null>(null)
  const [selectedUserIndex, setSelectedUserIndex] = useState<number | null>(null)
  const graphData = useAclFlowGraph(config)

  const handleFitView = useCallback(() => {
    graphRef.current?.fitView()
  }, [])

  const handleZoomIn = useCallback(() => {
    graphRef.current?.zoomBy(1.2)
  }, [])

  const handleZoomOut = useCallback(() => {
    graphRef.current?.zoomBy(0.8)
  }, [])

  useEffect(() => {
    if (!containerRef.current) return

    const graph = new Graph({
      container: containerRef.current,
      autoFit: 'view',
      padding: [20, 40, 60, 40],
      animation: false,
      node: {
        type: (d: NodeData) => getNodeStyle(d.id as string, d.data as Record<string, unknown>).type,
        style: (d: NodeData) => getNodeStyle(d.id as string, d.data as Record<string, unknown>).style,
        state: {
          highlight: {
            shadowColor: '#8b5cf6',
            shadowBlur: 14,
            shadowOffsetX: 0,
            shadowOffsetY: 0,
            stroke: '#8b5cf6',
            lineWidth: 3,
          },
          selected: {
            shadowColor: '#ef4444',
            shadowBlur: 16,
            shadowOffsetX: 0,
            shadowOffsetY: 0,
            stroke: '#ef4444',
            lineWidth: 3,
          },
        },
      },
      edge: {
        type: (d: EdgeData) => getEdgeStyle(d.data as Record<string, unknown>).type,
        style: (d: EdgeData) => getEdgeStyle(d.data as Record<string, unknown>).style,
      },
      behaviors: [
        'drag-canvas',
        'zoom-canvas',
      ],
      data: graphData,
    })

    // ── Hover highlighting: purple outline glow on related nodes ──
    const highlightedIds = new Set<string>()

    function setHighlight(id: string, on: boolean) {
      const nd = nodeDataMap.get(id)
      if (!nd) return

      if (nd.nodeType === 'user-card') {
        // HTML node — use DOM manipulation
        const el = containerRef.current?.querySelector(`[data-node-id="${id}"]`) as HTMLElement | null
        if (el) {
          el.style.boxShadow = on ? '0 0 0 3px rgba(139,92,246,0.6), 0 0 12px rgba(139,92,246,0.3)' : ''
        }
      } else {
        // Rect node — use g6 state system
        try {
          graph.setElementState(id, on ? ['highlight'] : [])
        } catch { /* node may not exist */ }
      }

      if (on) highlightedIds.add(id)
      else highlightedIds.delete(id)
    }

    // Build lookup tables from graphData
    const nodeDataMap = new Map<string, Record<string, unknown>>()
    graphData.nodes?.forEach((n) => {
      nodeDataMap.set(n.id as string, n.data as Record<string, unknown>)
    })

    // Reference edges: block → connector
    const blockToConnectors = new Map<string, string[]>()
    const connectorToBlocks = new Map<string, string[]>()
    graphData.edges?.forEach((e) => {
      const d = e.data as Record<string, unknown> | undefined
      if (d?.edgeType === 'reference') {
        const src = e.source as string
        const tgt = e.target as string
        if (!blockToConnectors.has(src)) blockToConnectors.set(src, [])
        blockToConnectors.get(src)!.push(tgt)
        if (!connectorToBlocks.has(tgt)) connectorToBlocks.set(tgt, [])
        connectorToBlocks.get(tgt)!.push(src)
      }
    })

    // User → connector edges
    const userToConnectors = new Map<string, string[]>()
    graphData.edges?.forEach((e) => {
      const d = e.data as Record<string, unknown> | undefined
      if (d?.edgeType === 'user-connector') {
        const src = e.source as string
        const tgt = e.target as string
        if (!userToConnectors.has(src)) userToConnectors.set(src, [])
        userToConnectors.get(src)!.push(tgt)
      }
    })

    function clearAllHighlights() {
      for (const id of highlightedIds) {
        setHighlight(id, false)
      }
      highlightedIds.clear()
    }

    function highlightRelatedToBlock(blockNodeId: string) {
      const matchingUsers = findMatchingUsersForBlock(blockNodeId)
      matchingUsers.forEach((uid) => setHighlight(uid, true))
      blockToConnectors.get(blockNodeId)?.forEach((cid) => setHighlight(cid, true))
      setHighlight(blockNodeId, true)
    }

    function highlightRelatedToUser(userNodeId: string) {
      const matchingBlocks = findMatchingBlocksForUser(userNodeId)
      matchingBlocks.forEach((bid) => setHighlight(bid, true))
      userToConnectors.get(userNodeId)?.forEach((cid) => setHighlight(cid, true))
      matchingBlocks.forEach((bid) => {
        blockToConnectors.get(bid)?.forEach((cid) => setHighlight(cid, true))
      })
      setHighlight(userNodeId, true)
    }

    // Expose highlight API for selection effects
    highlightRef.current = {
      highlightNode: (id) => setHighlight(id, true),
      highlightRelatedToBlock,
      highlightRelatedToUser,
      clearAll: clearAllHighlights,
    }

    function findMatchingBlocksForUser(userId: string): string[] {
      const userData = nodeDataMap.get(userId)
      const userGroups = userData?.localGroups as string[] | undefined
      if (!userGroups?.length) return []
      const userGroupsSet = new Set(userGroups)
      const matches: string[] = []
      nodeDataMap.forEach((d, nid) => {
        if (d.nodeType !== 'block') return
        const mg = d.matchingGroups as string[] | undefined
        if (mg?.some((g) => userGroupsSet.has(g))) matches.push(nid)
      })
      return matches
    }

    function findMatchingUsersForBlock(blockId: string): string[] {
      const blockData = nodeDataMap.get(blockId)
      const mg = blockData?.matchingGroups as string[] | undefined
      if (!mg?.length) return []
      const blockGroupsSet = new Set(mg)
      const matches: string[] = []
      nodeDataMap.forEach((d, nid) => {
        if (d.nodeType !== 'user-card') return
        const ug = d.localGroups as string[] | undefined
        if (ug?.some((g) => blockGroupsSet.has(g))) matches.push(nid)
      })
      return matches
    }

    graph.render().then(() => {
      graphRef.current = graph

      // Single-click → open drawer
      graph.on('node:click', (evt: any) => {
        const nodeId = evt?.target?.id
        if (typeof nodeId !== 'string') return
        if (nodeId.startsWith('block-')) { setSelectedBlockId(nodeId.replace('block-', '')); return }
        if (nodeId.startsWith('connector-')) {
          const nd = graphData.nodes?.find((n) => n.id === nodeId)
          if (nd?.data) {
            const d = nd.data as Record<string, unknown>
            setSelectedConnector({ configKey: '', typeLabel: d.connectorType as string, name: d.label as string })
          }
          return
        }
        if (nodeId.startsWith('user-') && !nodeId.startsWith('user-group-')) {
          const nd = graphData.nodes?.find((n) => n.id === nodeId)
          if (nd?.data) {
            const idx = (nd.data as Record<string, unknown>).userIndex as number
            if (typeof idx === 'number') setSelectedUserIndex(idx)
          }
          return
        }
        if (nodeId.startsWith('user-group-')) { setActiveTab('users-groups'); return }
        if (nodeId.startsWith('allow-pill-')) { updateBlock(nodeId.replace('allow-pill-', ''), { type: 'forbid' }); return }
      })

      // Hover highlighting — reuse shared functions
      graph.on('node:pointerenter', (evt: any) => {
        const nodeId = evt?.target?.id
        if (typeof nodeId !== 'string') return
        const nodeData = nodeDataMap.get(nodeId)
        if (!nodeData) return

        if (nodeData.nodeType === 'user-card') { highlightRelatedToUser(nodeId); return }
        if (nodeData.nodeType === 'block') { highlightRelatedToBlock(nodeId); return }
        if (nodeData.nodeType === 'connector') {
          const linkedBlocks = connectorToBlocks.get(nodeId) ?? []
          linkedBlocks.forEach((bid) => {
            highlightRelatedToBlock(bid)
          })
          setHighlight(nodeId, true)
          return
        }
      })

      graph.on('node:pointerleave', () => {
        clearAllHighlights()
      })
    }).catch(() => {/* graph destroyed during async render (React Strict Mode) */})

    // Resize graph when container changes size (window resize, panel drag, etc.)
    const ro = new ResizeObserver(() => {
      if (!graphRef.current) return
      const { width, height } = containerRef.current!.getBoundingClientRect()
      if (width > 0 && height > 0) {
        graphRef.current.resize(width, height)
        graphRef.current.fitView()
      }
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      graphRef.current = null
      graph.destroy()
    }
  }, [graphData])

  // Highlight the selected item + its related nodes when drawer is open
  useEffect(() => {
    const graph = graphRef.current
    const api = highlightRef.current
    if (!graph || !api) return

    // Clear previous highlights
    api.clearAll()
    const blocks = config.access_control_rules ?? []
    blocks.forEach((b) => {
      try { graph.setElementState(`block-${b.id}`, []) } catch { /* not rendered yet */ }
    })

    // Apply selected state + relation highlights
    if (selectedBlockId) {
      try { graph.setElementState(`block-${selectedBlockId}`, ['selected']) } catch { /* */ }
      api.highlightRelatedToBlock(`block-${selectedBlockId}`)
    }
    if (selectedUserIndex !== null) {
      api.highlightRelatedToUser(`user-${selectedUserIndex}`)
    }
  }, [selectedBlockId, selectedUserIndex, selectedConnector, config.access_control_rules])

  const blocks = config.access_control_rules ?? []
  const users = config.users ?? []

  return (
    <div className="h-full flex flex-col -m-6">
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div>
          <h2 className="text-[15px] font-bold text-slate-900 tracking-tight">ACL Flow</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {blocks.length} block{blocks.length !== 1 ? 's' : ''}
            {users.length > 0 && ` \u00B7 ${users.length} user${users.length !== 1 ? 's' : ''}`}
            {' '}&middot; evaluated top to bottom &middot; first match wins
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleZoomOut} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 transition-colors" title="Zoom out">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button onClick={handleZoomIn} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 transition-colors" title="Zoom in">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={handleFitView} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 transition-colors" title="Fit to view">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Graph canvas */}
      <div ref={containerRef} className="flex-1 min-h-0 bg-[#fafbfc]" />

      {/* Legend */}
      <div className="flex items-center gap-4 px-6 py-2 border-t border-slate-200 bg-white text-[10px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ background: COLORS.allow.fill, border: `1.5px solid ${COLORS.allow.stroke}` }} />
          Allow
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ background: COLORS.forbid.fill, border: `1.5px solid ${COLORS.forbid.stroke}` }} />
          Forbid
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ background: COLORS.connector.fill, border: `1.5px solid ${COLORS.connector.stroke}` }} />
          Connector
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ background: '#faf5ff', border: `1.5px solid ${COLORS.users.stroke}` }} />
          User
        </span>
        <span className="text-slate-300">|</span>
        <span>Click to edit &middot; Arrow keys to navigate</span>
        <span className="text-slate-300">|</span>
        <span>Hover to highlight connections</span>
        <span className="text-slate-300">|</span>
        <span>Scroll to zoom &middot; Drag to pan</span>
      </div>

      {/* Block editor drawer */}
      <BlockDrawer
        blockId={selectedBlockId}
        onClose={() => setSelectedBlockId(null)}
        onNavigate={(direction) => {
          if (!selectedBlockId) return
          const idx = blocks.findIndex((b) => b.id === selectedBlockId)
          if (idx === -1) return
          const nextIdx = direction === 'up' ? idx - 1 : idx + 1
          if (nextIdx >= 0 && nextIdx < blocks.length) {
            setSelectedBlockId(blocks[nextIdx].id)
          }
        }}
      />

      {/* Connector editor drawer */}
      <ConnectorDrawer
        target={selectedConnector}
        onClose={() => setSelectedConnector(null)}
        onNavigate={(direction) => {
          if (!selectedConnector) return
          // Build flat connector list from graphData
          const connNodes = graphData.nodes?.filter((n) => (n.data as Record<string, unknown>)?.nodeType === 'connector') ?? []
          const idx = connNodes.findIndex((n) => (n.data as Record<string, unknown>).label === selectedConnector.name)
          if (idx === -1) return
          const nextIdx = direction === 'up' ? idx - 1 : idx + 1
          if (nextIdx >= 0 && nextIdx < connNodes.length) {
            const d = connNodes[nextIdx].data as Record<string, unknown>
            setSelectedConnector({ configKey: '', typeLabel: d.connectorType as string, name: d.label as string })
          }
        }}
      />

      {/* User editor drawer */}
      <UserDrawer
        userIndex={selectedUserIndex}
        onClose={() => setSelectedUserIndex(null)}
        onNavigate={(direction) => {
          if (selectedUserIndex === null) return
          const nextIdx = direction === 'up' ? selectedUserIndex - 1 : selectedUserIndex + 1
          if (nextIdx >= 0 && nextIdx < users.length) {
            setSelectedUserIndex(nextIdx)
          }
        }}
      />
    </div>
  )
}
