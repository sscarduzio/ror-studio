import { useState } from 'react'
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import { useEditorStore } from '@/store/editor-store'
import { AclFlowGraph } from './AclFlowGraph'
import { AclCodeEditor } from './AclCodeEditor'
import { AccessControlTab } from '@/components/acl/AccessControlTab'
import { ViewModeToggle } from './ViewModeToggle'
import { ACL_VIEW_MODES } from './acl-view-modes'

export function AclTab() {
  const config = useEditorStore((s) => s.config)
  const viewMode = useEditorStore((s) => s.aclViewMode)
  const setViewMode = useEditorStore((s) => s.setAclViewMode)
  const [zoomActions, setZoomActions] = useState<{
    zoomIn: () => void
    zoomOut: () => void
    fitView: () => void
  } | null>(null)

  const blocks = config.access_control_rules ?? []
  const users = config.users ?? []

  return (
    <div className="h-full flex flex-col -m-6">
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-[15px] font-bold text-slate-900 tracking-tight">ACL</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {blocks.length} block{blocks.length !== 1 ? 's' : ''}
              {users.length > 0 && ` \u00B7 ${users.length} user${users.length !== 1 ? 's' : ''}`}
              {' '}&middot; evaluated top to bottom &middot; first match wins
            </p>
          </div>
          <ViewModeToggle modes={ACL_VIEW_MODES} value={viewMode} onChange={setViewMode} />
        </div>
        {/* Mode-specific controls */}
        {viewMode === 'graph' && zoomActions && (
          <div className="flex items-center gap-1">
            <button onClick={zoomActions.zoomOut} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 transition-colors" title="Zoom out">
              <ZoomOut className="w-4 h-4" />
            </button>
            <button onClick={zoomActions.zoomIn} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 transition-colors" title="Zoom in">
              <ZoomIn className="w-4 h-4" />
            </button>
            <button onClick={zoomActions.fitView} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 transition-colors" title="Fit to view">
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Body — conditional rendering by mode */}
      <div className="flex-1 min-h-0">
        {viewMode === 'graph' && <AclFlowGraph onZoomReady={setZoomActions} />}
        {viewMode === 'form' && (
          <div className="h-full overflow-y-auto p-6">
            <AccessControlTab />
          </div>
        )}
        {viewMode === 'code' && <AclCodeEditor />}
      </div>
    </div>
  )
}
