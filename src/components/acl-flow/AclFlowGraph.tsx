import { useEffect, useRef, useState, useCallback } from 'react'
import { Graph } from '@antv/g6'
import type { NodeData, EdgeData } from '@antv/g6'
import { useEditorStore } from '@/store/editor-store'
import { useAclFlowGraph } from './useAclFlowGraph'
import { BlockDrawer } from './BlockDrawer'
import { ConnectorDrawer, type ConnectorTarget } from './ConnectorDrawer'
import { UserDrawer } from './UserDrawer'
import { COLORS, getNodeStyle, getEdgeStyle } from './graph-styles'

interface HighlightAPI {
  highlightNode: (nodeId: string) => void
  highlightRelatedToBlock: (blockId: string) => void
  highlightRelatedToUser: (userId: string) => void
  clearAll: () => void
}

interface AclFlowGraphProps {
  onZoomReady?: (actions: { zoomIn: () => void; zoomOut: () => void; fitView: () => void } | null) => void
}

export function AclFlowGraph({ onZoomReady }: AclFlowGraphProps) {
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

  // Expose zoom controls to parent
  useEffect(() => {
    onZoomReady?.({ zoomIn: handleZoomIn, zoomOut: handleZoomOut, fitView: handleFitView })
    return () => { onZoomReady?.(null) }
  }, [onZoomReady, handleZoomIn, handleZoomOut, handleFitView])

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
      graph.on('node:click', // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (evt: any) => {
        const nodeId = evt?.target?.id as string | undefined
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
      graph.on('node:pointerenter', // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (evt: any) => {
        const nodeId = evt?.target?.id as string | undefined
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
  }, [graphData, setActiveTab, updateBlock])

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
    <div className="h-full flex flex-col">
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
