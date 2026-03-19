import { Plus, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEditorStore } from '@/store/editor-store'
import { styles } from '@/components/shared-styles'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { BlockCard } from '@/components/acl/BlockCard'

export function AccessControlTab() {
  const blocks = useEditorStore((s) => s.config.access_control_rules)
  const addBlock = useEditorStore((s) => s.addBlock)
  const reorderBlocks = useEditorStore((s) => s.reorderBlocks)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex((b) => b.id === active.id)
      const newIndex = blocks.findIndex((b) => b.id === over.id)
      reorderBlocks(oldIndex, newIndex)
    }
  }

  const handleAddBlock = () => {
    addBlock({
      id: crypto.randomUUID(),
      name: `Block ${blocks.length + 1}`,
      type: 'allow',
      enabled: true,
      rules: [],
    })
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <h2 className={styles.pageTitle}>
          Access Control Rules
        </h2>
        <p className={styles.pageSubtitle}>
          Rules are evaluated top to bottom. First matching block wins. Drag to reorder.
        </p>
      </div>

      {blocks.length === 0 ? (
        <div className={styles.emptyStateCard}>
          <Shield className="w-10 h-10 text-[var(--color-text-tertiary)]" />
          <p className="text-sm text-[var(--color-text-secondary)]">No access control rules yet</p>
          <Button size="sm" onClick={handleAddBlock} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Add your first rule block
          </Button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={blocks.map((b) => b.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {blocks.map((block) => (
                <BlockCard key={block.id} block={block} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={handleAddBlock}
        className="w-full gap-1.5 border-dashed"
      >
        <Plus className="w-3.5 h-3.5" />
        Add Block
      </Button>
    </div>
  )
}
