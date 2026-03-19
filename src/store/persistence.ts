import type { RorConfig, Edition, TabId } from '@/schema/types'
import type { YamlDock } from '@/store/editor-store'

const STORAGE_KEY = 'ror-studio'
const EDITION_KEY = 'ror-studio-edition'
const WIZARD_KEY = 'ror-studio-wizard-seen'
const TAB_KEY = 'ror-studio-active-tab'
const DOCK_KEY = 'ror-studio-yaml-dock'

interface PersistedState {
  config: RorConfig
  edition: Edition
  activeTab: TabId
  wizardSeen: boolean
  yamlDock: YamlDock
}

export function saveState(state: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.config))
    localStorage.setItem(EDITION_KEY, state.edition)
    localStorage.setItem(TAB_KEY, state.activeTab)
    localStorage.setItem(WIZARD_KEY, String(state.wizardSeen))
    localStorage.setItem(DOCK_KEY, state.yamlDock)
  } catch {
    // localStorage might be full or unavailable
  }
}

export function loadState(): PersistedState | null {
  try {
    const configStr = localStorage.getItem(STORAGE_KEY)
    if (!configStr) return null

    const config = JSON.parse(configStr) as RorConfig
    const edition = (localStorage.getItem(EDITION_KEY) as Edition) || 'enterprise'
    const activeTab = (localStorage.getItem(TAB_KEY) as TabId) || 'getting-started'
    const wizardSeen = localStorage.getItem(WIZARD_KEY) === 'true'
    const yamlDock = (localStorage.getItem(DOCK_KEY) as YamlDock) || 'bottom'

    return { config, edition, activeTab, wizardSeen, yamlDock }
  } catch {
    return null
  }
}

export function clearState(): void {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(EDITION_KEY)
  localStorage.removeItem(TAB_KEY)
  localStorage.removeItem(WIZARD_KEY)
  localStorage.removeItem(DOCK_KEY)
}
