import { useEditorStore } from '@/store/editor-store'

/**
 * Generic CRUD hook for array-typed config fields (connectors, etc.).
 *
 * IMPORTANT: `emptyDefault` must be a stable reference defined outside the
 * component (e.g. `const EMPTY: Foo[] = []`) to avoid React 19 infinite
 * re-render loops caused by a new array identity on every render.
 */
export function useConnectorCrud<T>(configKey: string, emptyDefault: T[]) {
  const items = useEditorStore((s) => (s.config as unknown as Record<string, unknown>)[configKey] as T[] ?? emptyDefault)
  const updateConfigField = useEditorStore((s) => s.updateConfigField)

  const add = (newItem: T) => updateConfigField(configKey, [...items, newItem])

  const update = (index: number, updates: Partial<T>) => {
    updateConfigField(configKey, items.map((item, i) => (i === index ? { ...item, ...updates } : item)))
  }

  const remove = (index: number) => {
    updateConfigField(configKey, items.filter((_, i) => i !== index))
  }

  return { items, add, update, remove }
}
