import { useState, useRef, useEffect, useCallback, forwardRef } from 'react'
import { createPortal } from 'react-dom'
import { Plus, GripVertical, ChevronRight, MoreVertical, AlertCircle, Copy, Trash2, EyeOff, Eye, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { useEditorStore } from '@/store/editor-store'
import type { AccessControlBlock, AclRule, RuleType, Edition } from '@/schema/types'
import { getAllRulesByCategory, getRuleMeta, isRuleAboveEdition } from '@/schema/field-meta'
import { cn } from '@/lib/utils'
import { styles } from '@/components/shared-styles'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { RuleEditor } from '@/components/acl/RuleEditor'
import { useFieldErrors } from '@/hooks/useFieldErrors'

function formatCategoryLabel(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1)
}

// Portaled dropdown for Add Rule — escapes overflow:hidden parent panels
interface RuleMenuDropdownProps {
  anchorRef: React.RefObject<HTMLButtonElement | null>
  rulesByCategory: Map<string, Array<{ type: RuleType; label: string; tier: string }>>
  edition: Edition
  onSelect: (type: RuleType) => void
}

const RuleMenuDropdown = forwardRef<HTMLDivElement, RuleMenuDropdownProps>(
  function RuleMenuDropdown({ anchorRef, rulesByCategory, edition, onSelect }, ref) {
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

    useEffect(() => {
      const anchor = anchorRef.current
      if (!anchor) return
      const updatePos = () => {
        const rect = anchor.getBoundingClientRect()
        setPos({ top: rect.bottom + 4, left: rect.left })
      }
      updatePos()
      window.addEventListener('scroll', updatePos, true)
      window.addEventListener('resize', updatePos)
      return () => {
        window.removeEventListener('scroll', updatePos, true)
        window.removeEventListener('resize', updatePos)
      }
    }, [anchorRef])

    if (!pos) return null

    return (
      <div
        ref={ref}
        className="fixed w-80 max-h-72 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] shadow-lg z-50"
        style={{ top: pos.top, left: pos.left }}
      >
        {Array.from(rulesByCategory.entries()).map(([cat, catRules]) => (
          <div key={cat}>
            <div className={cn(styles.categoryLabel, 'px-3 py-1 bg-gray-50 sticky top-0')}>
              {formatCategoryLabel(cat)}
            </div>
            {catRules.map((r) => {
              const aboveEdition = isRuleAboveEdition(r.tier as Edition, edition)
              return (
                <button
                  key={r.type}
                  onClick={() => onSelect(r.type)}
                  className={cn(
                    'w-full text-left px-3 py-1.5 transition-colors',
                    aboveEdition
                      ? 'hover:bg-amber-50/60'
                      : 'hover:bg-gray-50'
                  )}
                >
                  <div className="flex items-center gap-2">
                    {aboveEdition && (
                      <Lock className="w-3 h-3 text-amber-500 shrink-0" />
                    )}
                    <span className={cn(
                      'text-xs font-medium',
                      aboveEdition ? 'text-[var(--color-text-tertiary)]' : 'text-[var(--color-text-primary)]'
                    )}>
                      {r.label}
                    </span>
                    {r.tier !== 'free' && (
                      <span className={cn(
                        'px-1 py-0.5 text-[9px] font-bold rounded',
                        r.tier === 'pro' ? styles.tierBadge.pro : styles.tierBadge.ent
                      )}>
                        {r.tier === 'pro' ? 'PRO' : 'ENT'}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    )
  }
)

export function BlockCard({ block }: { block: AccessControlBlock }) {
  const expanded = useEditorStore((s) => s.expandedBlockIds.has(block.id))
  const toggleExpanded = useEditorStore((s) => s.toggleBlockExpanded)
  const setExpanded = useEditorStore((s) => s.setBlockExpanded)
  const [showRuleMenu, setShowRuleMenu] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const ruleMenuRef = useRef<HTMLDivElement>(null)
  const ruleMenuButtonRef = useRef<HTMLButtonElement>(null)
  const ruleMenuPortalRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const updateBlock = useEditorStore((s) => s.updateBlock)
  const removeBlock = useEditorStore((s) => s.removeBlock)
  const duplicateBlock = useEditorStore((s) => s.duplicateBlock)
  const edition = useEditorStore((s) => s.edition)
  const setEdition = useEditorStore((s) => s.setEdition)
  const blocks = useEditorStore((s) => s.config.access_control_rules)
  const focusBlockId = useEditorStore((s) => s.focusBlockId)
  const focusRuleId = useEditorStore((s) => s.focusRuleId)
  const clearFocusBlock = useEditorStore((s) => s.clearFocusBlock)
  const index = blocks.findIndex((b) => b.id === block.id)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [upgradePrompt, setUpgradePrompt] = useState<{ type: RuleType; label: string; tier: Edition } | null>(null)
  const rulesByCategory = getAllRulesByCategory()
  const fieldErrors = useFieldErrors(`access_control_rules[${index}]`)
  const nameErrors = fieldErrors.filter((e) => e.field?.endsWith('.name'))
  const ruleErrors = fieldErrors.filter((e) => e.field?.endsWith('.rules'))
  const hasErrors = fieldErrors.some((e) => e.severity === 'error')
  const hasWarnings = fieldErrors.some((e) => e.severity === 'warning')

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const combinedRef = useCallback((node: HTMLDivElement | null) => {
    setNodeRef(node)
    ;(cardRef as React.MutableRefObject<HTMLDivElement | null>).current = node
  }, [setNodeRef])

  // Focus name input when entering edit mode
  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus()
      nameInputRef.current.select()
    }
  }, [editingName])

  // Auto-expand and scroll into view when returning from connector creation
  useEffect(() => {
    if (focusBlockId === block.id) {
      setExpanded(block.id, true)
      const targetRuleId = focusRuleId
      clearFocusBlock()
      // Scroll after React re-renders with expanded content
      requestAnimationFrame(() => {
        if (targetRuleId) {
          // Focus the specific rule element with yellow halo
          const ruleEl = document.getElementById(targetRuleId)
          if (ruleEl) {
            ruleEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
            ruleEl.classList.add('return-highlight')
            ruleEl.addEventListener('animationend', () => ruleEl.classList.remove('return-highlight'), { once: true })
            return
          }
        }
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }, [focusBlockId, focusRuleId, block.id, clearFocusBlock, setExpanded])

  // Close rule menu on outside click
  useEffect(() => {
    if (!showRuleMenu) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        ruleMenuRef.current && !ruleMenuRef.current.contains(target) &&
        ruleMenuPortalRef.current && !ruleMenuPortalRef.current.contains(target)
      ) {
        setShowRuleMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showRuleMenu])

  const commitAddRule = (type: RuleType) => {
    const newRule: AclRule = { type, value: '' }
    updateBlock(block.id, { rules: [...block.rules, newRule] })
    setShowRuleMenu(false)
    if (!expanded) setExpanded(block.id, true)
  }

  const addRule = (type: RuleType) => {
    const ruleMeta = getRuleMeta(type)
    if (ruleMeta && isRuleAboveEdition(ruleMeta.tier, edition)) {
      setUpgradePrompt({ type, label: ruleMeta.label, tier: ruleMeta.tier })
      setShowRuleMenu(false)
      return
    }
    commitAddRule(type)
  }

  const handleUpgradeConfirm = () => {
    if (!upgradePrompt) return
    setEdition(upgradePrompt.tier)
    commitAddRule(upgradePrompt.type)
    setUpgradePrompt(null)
  }

  const updateRule = (ruleIndex: number, rule: AclRule) => {
    const newRules = [...block.rules]
    newRules[ruleIndex] = rule
    updateBlock(block.id, { rules: newRules })
  }

  const removeRule = (ruleIndex: number) => {
    updateBlock(block.id, { rules: block.rules.filter((_, i) => i !== ruleIndex) })
  }

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      setEditingName(false)
    }
  }

  const handleDelete = () => setDeleteConfirmOpen(true)

  return (
    <div
      ref={combinedRef}
      style={style}
      id={`block-${block.id}`}
      className={cn(
        'rounded-[var(--radius-card)] border bg-[var(--color-card)] shadow-[var(--shadow-card)] transition-all duration-150',
        isDragging ? 'opacity-50 border-[var(--color-accent)]'
          : hasErrors ? 'border-[var(--color-error)]/50 shadow-[0_0_0_1px_rgba(224,62,62,0.15),0_0_8px_rgba(224,62,62,0.1)]'
          : hasWarnings ? 'border-amber-400/50 shadow-[0_0_0_1px_rgba(245,158,11,0.15)]'
          : 'border-[var(--color-border)]',
        !block.enabled && 'opacity-50'
      )}
    >
      {/* Header row */}
      <div
        className="flex items-center gap-1.5 px-2 py-2"
        id={`block-${block.id}-name`}
      >
        {/* Chevron — primary expand/collapse affordance */}
        <button
          onClick={() => toggleExpanded(block.id)}
          className="shrink-0 p-0.5 rounded text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-gray-100 transition-all"
          aria-label={expanded ? 'Collapse block' : 'Expand block'}
        >
          <ChevronRight className={cn(
            'w-4 h-4 transition-transform duration-150',
            expanded && 'rotate-90'
          )} />
        </button>

        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] shrink-0"
          tabIndex={-1}
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {/* Block name — click to rename, or click header area to expand */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          {editingName ? (
            <Input
              ref={nameInputRef}
              value={block.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateBlock(block.id, { name: e.target.value })}
              onBlur={() => setEditingName(false)}
              onKeyDown={handleNameKeyDown}
              className={cn(
                'h-7 text-sm font-semibold py-0 px-1.5',
                nameErrors.length > 0 && 'border-[var(--color-error)]'
              )}
              placeholder="Block name..."
            />
          ) : (
            <button
              onClick={() => toggleExpanded(block.id)}
              className="flex items-center gap-2 text-left min-w-0 flex-1"
            >
              <span className={cn(
                'text-sm font-semibold truncate',
                block.enabled ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-tertiary)] line-through'
              )}>
                {block.name || 'Unnamed Block'}
              </span>

              {/* Error indicator — collapsed only */}
              {hasErrors && !expanded && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span><AlertCircle className="w-3.5 h-3.5 text-[var(--color-error)] shrink-0" /></span>
                  </TooltipTrigger>
                  <TooltipContent>{fieldErrors.filter(e => e.severity === 'error').length} validation error(s)</TooltipContent>
                </Tooltip>
              )}

              {/* Rule chips — collapsed only */}
              {!expanded && block.rules.length > 0 && (
                <div className="flex items-center gap-1 ml-auto shrink-0">
                  {block.rules.slice(0, 4).map((rule, ri) => (
                    <span
                      key={ri}
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-[var(--color-text-secondary)]"
                    >
                      {rule.type}
                    </span>
                  ))}
                  {block.rules.length > 4 && (
                    <span className="text-[10px] text-[var(--color-text-tertiary)]">
                      +{block.rules.length - 4}
                    </span>
                  )}
                </div>
              )}
            </button>
          )}
        </div>

        {/* Allow/Forbid toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => updateBlock(block.id, { type: block.type === 'allow' ? 'forbid' : 'allow' })}
              className={cn(
                'shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors',
                block.type === 'allow'
                  ? 'bg-[var(--color-success-bg)] text-[var(--color-success)] hover:bg-[var(--color-success)]/15'
                  : 'bg-[var(--color-error-bg)] text-[var(--color-error)] hover:bg-[var(--color-error)]/15'
              )}
            >
              {block.type}
            </button>
          </TooltipTrigger>
          <TooltipContent>Click to switch to {block.type === 'allow' ? 'forbid' : 'allow'}</TooltipContent>
        </Tooltip>

        {/* Kebab menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="shrink-0 p-1 rounded hover:bg-gray-100 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors">
              <MoreVertical className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => { setEditingName(true); setExpanded(block.id, true) }}>
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateBlock(block.id, { enabled: !block.enabled })}>
              {block.enabled ? <><EyeOff className="w-4 h-4" /> Disable</> : <><Eye className="w-4 h-4" /> Enable</>}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => duplicateBlock(block.id)}>
              <Copy className="w-4 h-4" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleDelete}>
              <Trash2 className="w-4 h-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Inline name error — visible even when collapsed */}
      {nameErrors.length > 0 && !editingName && (
        <div className="px-3 pb-2 -mt-1">
          {nameErrors.map((err, idx) => (
            <p key={idx} className="text-[11px] text-[var(--color-error)]">{err.message}</p>
          ))}
        </div>
      )}

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-[var(--color-border)] px-3 py-3 space-y-3">
          {/* Rule-level errors */}
          {ruleErrors.length > 0 && (
            <div className="rounded-md bg-[var(--color-error-bg)] border border-[var(--color-error)]/20 px-3 py-2">
              {ruleErrors.map((err, idx) => (
                <p key={idx} className="text-xs text-[var(--color-error)]">
                  {err.message}
                  {err.fix && <span className="text-[var(--color-text-tertiary)]"> — {err.fix}</span>}
                </p>
              ))}
            </div>
          )}

          {/* Rules list */}
          {block.rules.length > 0 && (
            <div className="space-y-5">
              {block.rules.map((rule, i) => {
                const ruleId = `block-${block.id}-rule-${i}`
                const ruleIssues = fieldErrors.filter((e) => e.fieldId === ruleId)
                return (
                  <div key={`${rule.type}-${i}`} id={ruleId}>
                    <RuleEditor
                      rule={rule}
                      onChange={(updated) => updateRule(i, updated)}
                      onRemove={() => removeRule(i)}
                      blockId={block.id}
                      ruleId={ruleId}
                      errors={ruleIssues}
                    />
                  </div>
                )
              })}
            </div>
          )}

          {/* Add rule */}
          <div ref={ruleMenuRef}>
            <Button
              ref={ruleMenuButtonRef}
              variant="ghost"
              size="sm"
              onClick={() => setShowRuleMenu(!showRuleMenu)}
              className="gap-1.5 text-[var(--color-accent)] h-7 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Rule
            </Button>
            {showRuleMenu && createPortal(
              <RuleMenuDropdown
                ref={ruleMenuPortalRef}
                anchorRef={ruleMenuButtonRef}
                rulesByCategory={rulesByCategory}
                edition={edition}
                onSelect={addRule}
              />,
              document.body
            )}
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Block</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-semibold text-[var(--color-text-primary)]">{block.name || 'Unnamed Block'}</span>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[var(--color-error)] hover:bg-[var(--color-error)]/90 text-white"
              onClick={() => { removeBlock(block.id); setDeleteConfirmOpen(false) }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edition upgrade dialog */}
      <Dialog open={upgradePrompt !== null} onOpenChange={(open) => { if (!open) setUpgradePrompt(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-500" />
              Edition Upgrade Required
            </DialogTitle>
            <DialogDescription>
              The rule <span className="font-semibold text-[var(--color-text-primary)]">{upgradePrompt?.label}</span> requires
              the <span className={cn(
                'inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded mx-0.5',
                upgradePrompt?.tier === 'pro' ? styles.tierBadge.pro : styles.tierBadge.ent
              )}>{upgradePrompt?.tier === 'pro' ? 'PRO' : 'Enterprise'}</span> edition.
              Upgrade to add this rule to your configuration?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpgradePrompt(null)}>
              Cancel
            </Button>
            <Button
              className="bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-white"
              onClick={handleUpgradeConfirm}
            >
              Upgrade &amp; Add Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
