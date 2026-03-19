/**
 * Visual style definitions for ACL flow graph nodes and edges.
 * Pure data-mapping functions — no React or side effects.
 */

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
  ext_auth: 0,
  unknown: 1,
}

function getAuthColor(authType: string) {
  const idx = AUTH_TYPE_COLOR_INDEX[authType] ?? (authType.length % AUTH_COLORS.length)
  return AUTH_COLORS[idx]
}

/** Color palette for node types — exported for legend rendering */
export const COLORS = {
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

export function getNodeStyle(nodeId: string, data: Record<string, unknown>) {
  const nodeType = data.nodeType as string
  const blockType = data.blockType as string | undefined
  const enabled = data.enabled as boolean | undefined

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

export function getEdgeStyle(data: Record<string, unknown>) {
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
