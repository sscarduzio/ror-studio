import { useCallback } from 'react'
import { Dialog as DialogPrimitive, VisuallyHidden } from 'radix-ui'
import { X, ShieldCheck, ShieldX, Trash2 } from 'lucide-react'
import { useEditorStore } from '@/store/editor-store'
import { RuleEditor } from '@/components/acl/RuleEditor'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { AclRule, RuleType } from '@/schema/types'
import { getAllRulesByCategory, getRuleMeta } from '@/schema/field-meta'

interface BlockDrawerProps {
  blockId: string | null
  onClose: () => void
  onNavigate?: (direction: 'up' | 'down') => void
}

export function BlockDrawer({ blockId, onClose, onNavigate }: BlockDrawerProps) {
  const block = useEditorStore((s) =>
    s.config.access_control_rules.find((b) => b.id === blockId)
  )
  const updateBlock = useEditorStore((s) => s.updateBlock)
  const removeBlock = useEditorStore((s) => s.removeBlock)
  const handleNameChange = useCallback(
    (name: string) => {
      if (blockId) updateBlock(blockId, { name })
    },
    [blockId, updateBlock]
  )

  const handleToggleType = useCallback(() => {
    if (blockId && block) {
      updateBlock(blockId, { type: block.type === 'allow' ? 'forbid' : 'allow' })
    }
  }, [blockId, block, updateBlock])

  const handleUpdateRule = useCallback(
    (ruleIndex: number, updated: AclRule) => {
      if (!blockId || !block) return
      const newRules = [...block.rules]
      newRules[ruleIndex] = updated
      updateBlock(blockId, { rules: newRules })
    },
    [blockId, block, updateBlock]
  )

  const handleRemoveRule = useCallback(
    (ruleIndex: number) => {
      if (!blockId || !block) return
      const newRules = block.rules.filter((_, i) => i !== ruleIndex)
      updateBlock(blockId, { rules: newRules })
    },
    [blockId, block, updateBlock]
  )

  const handleAddRule = useCallback(
    (type: RuleType) => {
      if (!blockId || !block) return
      const meta = getRuleMeta(type)
      const defaultValue = meta?.valueType === 'string[]' ? [] : meta?.valueType === 'boolean' ? true : ''
      updateBlock(blockId, { rules: [...block.rules, { type, value: defaultValue }] })
    },
    [blockId, block, updateBlock]
  )

  const handleDelete = useCallback(() => {
    if (blockId) {
      removeBlock(blockId)
      onClose()
    }
  }, [blockId, removeBlock, onClose])

  if (!blockId) return null

  const isAllow = block?.type === 'allow'

  return (
    <DialogPrimitive.Root open={!!blockId} onOpenChange={(open) => { if (!open) onClose() }} modal={false}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          className="fixed right-0 top-0 bottom-0 z-50 w-[480px] max-w-[90vw] bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200"
          onEscapeKeyDown={onClose}
          onKeyDown={(e) => {
            if (!onNavigate) return
            if (e.key === 'ArrowUp') { e.preventDefault(); onNavigate('up') }
            if (e.key === 'ArrowDown') { e.preventDefault(); onNavigate('down') }
          }}
        >
          <VisuallyHidden.Root><DialogPrimitive.Title>Edit Block</DialogPrimitive.Title></VisuallyHidden.Root>
          {/* Header */}
          <div className={cn(
            'flex items-center gap-3 px-5 py-3.5 border-b',
            isAllow ? 'bg-green-50/80 border-green-200' : 'bg-red-50/80 border-red-200'
          )}>
            <button
              onClick={handleToggleType}
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                isAllow ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'
              )}
              title={`Switch to ${isAllow ? 'forbid' : 'allow'}`}
            >
              {isAllow ? <ShieldCheck className="w-4 h-4" /> : <ShieldX className="w-4 h-4" />}
            </button>
            <div className="flex-1 min-w-0">
              <Input
                value={block?.name ?? ''}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Block name..."
                className="h-8 text-sm font-bold border-0 bg-transparent shadow-none focus-visible:ring-0 px-0"
              />
            </div>
            <button
              onClick={handleToggleType}
              className={cn(
                'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded cursor-pointer transition-colors',
                isAllow ? 'bg-green-200 text-green-800 hover:bg-green-300' : 'bg-red-200 text-red-800 hover:bg-red-300'
              )}
              title={`Click to switch to ${isAllow ? 'forbid' : 'allow'}`}
            >
              {block?.type}
            </button>
            <DialogPrimitive.Close asChild>
              <button className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </DialogPrimitive.Close>
          </div>

          {/* Rules list */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {block?.rules.length === 0 && (
              <div className="text-center py-8 text-sm text-slate-400">
                No rules yet. Add a rule to define matching criteria.
              </div>
            )}
            {block?.rules.map((rule, i) => (
              <div key={`${rule.type}-${i}`} className="relative group">
                <RuleEditor
                  rule={rule}
                  blockId={blockId}
                  onChange={(updated) => handleUpdateRule(i, updated)}
                  onRemove={() => handleRemoveRule(i)}
                />
              </div>
            ))}
          </div>

          {/* Footer — add rule + delete block */}
          <div className="border-t border-slate-200 px-5 py-3 flex items-center gap-2">
            <select
              className="flex-1 h-8 text-xs border border-slate-200 rounded-md px-2 bg-white text-slate-600"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  handleAddRule(e.target.value as RuleType)
                  e.target.value = ''
                }
              }}
            >
              <option value="" disabled>+ Add rule...</option>
              {Array.from(getAllRulesByCategory().entries()).map(([category, rules]) => (
                <optgroup key={category} label={category}>
                  {rules.map((r) => (
                    <option key={r.type} value={r.type}>{r.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <Button variant="outline" size="sm" onClick={handleDelete} className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Delete
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
