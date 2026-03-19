import { create } from 'zustand'
import type { RorConfig, Edition, TabId, AccessControlBlock, UserDefinition } from '@/schema/types'

const DEFAULT_CONFIG: RorConfig = {
  access_control_rules: [],
}

const HISTORY_LIMIT = 100

export type YamlDock = 'bottom' | 'right'

export interface EditorStore {
  // State
  config: RorConfig
  edition: Edition
  activeTab: TabId
  wizardSeen: boolean
  returnTab: TabId | null
  focusBlockId: string | null
  focusRuleId: string | null
  expandedBlockIds: Set<string>
  yamlDock: YamlDock

  // Undo/redo history (internal)
  _past: RorConfig[]
  _future: RorConfig[]

  // Config actions
  setConfig: (config: RorConfig) => void
  resetConfig: () => void

  // Edition
  setEdition: (edition: Edition) => void

  // Navigation
  setActiveTab: (tab: TabId) => void
  navigateWithReturn: (tab: TabId, blockId?: string, ruleId?: string) => void
  returnToPreviousTab: () => void
  clearFocusBlock: () => void

  // Block expansion
  toggleBlockExpanded: (blockId: string) => void
  setBlockExpanded: (blockId: string, expanded: boolean) => void

  // Wizard
  setWizardSeen: (seen: boolean) => void

  // Undo/redo
  undo: () => void
  redo: () => void

  // ACL Block actions
  addBlock: (block: AccessControlBlock) => void
  updateBlock: (id: string, block: Partial<AccessControlBlock>) => void
  removeBlock: (id: string) => void
  reorderBlocks: (fromIndex: number, toIndex: number) => void
  duplicateBlock: (id: string) => void

  // User actions
  addUser: (user: UserDefinition) => void
  updateUser: (index: number, user: UserDefinition) => void
  removeUser: (index: number) => void

  // Dock position
  setYamlDock: (dock: YamlDock) => void

  // Generic field updater
  updateConfigField: (path: string, value: unknown) => void
}

function setNestedField<T extends Record<string, unknown>>(obj: T, path: string, value: unknown): T {
  const keys = path.split('.')
  const result = { ...obj } as Record<string, unknown>
  let current = result

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    current[key] = { ...(current[key] as Record<string, unknown> || {}) }
    current = current[key] as Record<string, unknown>
  }

  current[keys[keys.length - 1]] = value
  return result as T
}

/** Push current config to undo history before making a change */
function pushHistory(state: EditorStore): Pick<EditorStore, '_past' | '_future'> {
  const past = [...state._past, state.config]
  if (past.length > HISTORY_LIMIT) past.shift()
  return { _past: past, _future: [] }
}

export const useEditorStore = create<EditorStore>()((set) => ({
  config: DEFAULT_CONFIG,
  edition: 'enterprise',
  activeTab: 'getting-started',
  wizardSeen: false,
  returnTab: null,
  focusBlockId: null,
  focusRuleId: null,
  expandedBlockIds: new Set<string>(),
  yamlDock: 'right',
  _past: [],
  _future: [],

  setConfig: (config) =>
    set((state) => ({ config, ...pushHistory(state) })),

  resetConfig: () =>
    set((state) => ({ config: DEFAULT_CONFIG, ...pushHistory(state) })),

  setEdition: (edition) => set({ edition }),
  setActiveTab: (tab) => {
    set({ activeTab: tab, returnTab: null, focusBlockId: null, focusRuleId: null })
  },
  navigateWithReturn: (tab, blockId, ruleId) => {
    const state = useEditorStore.getState()
    set({ activeTab: tab, returnTab: state.activeTab, focusBlockId: blockId ?? null, focusRuleId: ruleId ?? null })
  },
  returnToPreviousTab: () => set((state) => {
    if (!state.returnTab) return state
    return { activeTab: state.returnTab, returnTab: null }
  }),
  clearFocusBlock: () => set({ focusBlockId: null, focusRuleId: null }),

  toggleBlockExpanded: (blockId) => set((state) => {
    const next = new Set(state.expandedBlockIds)
    if (next.has(blockId)) next.delete(blockId)
    else next.add(blockId)
    return { expandedBlockIds: next }
  }),
  setBlockExpanded: (blockId, expanded) => set((state) => {
    const next = new Set(state.expandedBlockIds)
    if (expanded) next.add(blockId)
    else next.delete(blockId)
    return { expandedBlockIds: next }
  }),
  setWizardSeen: (seen) => set({ wizardSeen: seen }),
  setYamlDock: (dock) => set({ yamlDock: dock }),

  undo: () =>
    set((state) => {
      if (state._past.length === 0) return state
      const past = [...state._past]
      const prev = past.pop()!
      return {
        config: prev,
        _past: past,
        _future: [state.config, ...state._future],
      }
    }),

  redo: () =>
    set((state) => {
      if (state._future.length === 0) return state
      const future = [...state._future]
      const next = future.shift()!
      return {
        config: next,
        _past: [...state._past, state.config],
        _future: future,
      }
    }),

  addBlock: (block) =>
    set((state) => ({
      ...pushHistory(state),
      config: {
        ...state.config,
        access_control_rules: [...state.config.access_control_rules, block],
      },
    })),

  updateBlock: (id, updates) =>
    set((state) => ({
      ...pushHistory(state),
      config: {
        ...state.config,
        access_control_rules: state.config.access_control_rules.map((b) =>
          b.id === id ? { ...b, ...updates } : b
        ),
      },
    })),

  removeBlock: (id) =>
    set((state) => ({
      ...pushHistory(state),
      config: {
        ...state.config,
        access_control_rules: state.config.access_control_rules.filter((b) => b.id !== id),
      },
    })),

  reorderBlocks: (fromIndex, toIndex) =>
    set((state) => {
      const blocks = [...state.config.access_control_rules]
      const [moved] = blocks.splice(fromIndex, 1)
      blocks.splice(toIndex, 0, moved)
      return { ...pushHistory(state), config: { ...state.config, access_control_rules: blocks } }
    }),

  duplicateBlock: (id) =>
    set((state) => {
      const block = state.config.access_control_rules.find((b) => b.id === id)
      if (!block) return state
      const newBlock: AccessControlBlock = {
        ...block,
        id: crypto.randomUUID(),
        name: `${block.name} (copy)`,
      }
      const index = state.config.access_control_rules.findIndex((b) => b.id === id)
      const blocks = [...state.config.access_control_rules]
      blocks.splice(index + 1, 0, newBlock)
      return { ...pushHistory(state), config: { ...state.config, access_control_rules: blocks } }
    }),

  addUser: (user) =>
    set((state) => ({
      ...pushHistory(state),
      config: {
        ...state.config,
        users: [...(state.config.users || []), user],
      },
    })),

  updateUser: (index, user) =>
    set((state) => {
      const users = [...(state.config.users || [])]
      users[index] = user
      return { ...pushHistory(state), config: { ...state.config, users } }
    }),

  removeUser: (index) =>
    set((state) => ({
      ...pushHistory(state),
      config: {
        ...state.config,
        users: (state.config.users || []).filter((_, i) => i !== index),
      },
    })),

  updateConfigField: (path, value) =>
    set((state) => ({
      ...pushHistory(state),
      config: setNestedField(state.config as RorConfig & Record<string, unknown>, path, value),
    })),
}))
