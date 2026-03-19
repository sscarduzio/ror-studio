import type { RorConfig, Edition, TabId } from '@/schema/types'
import type { YamlDock } from '@/store/editor-store'
import type { AclViewMode } from '@/components/acl-flow/acl-view-modes'

const STORAGE_KEY = 'ror-studio'
const EDITION_KEY = 'ror-studio-edition'
const WIZARD_KEY = 'ror-studio-wizard-seen'
const TAB_KEY = 'ror-studio-active-tab'
const DOCK_KEY = 'ror-studio-yaml-dock'
const ACL_VIEW_KEY = 'ror-studio-acl-view'

interface PersistedState {
  config: RorConfig
  edition: Edition
  activeTab: TabId
  wizardSeen: boolean
  yamlDock: YamlDock
  aclViewMode: AclViewMode
}

export function saveState(state: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.config))
    localStorage.setItem(EDITION_KEY, state.edition)
    localStorage.setItem(TAB_KEY, state.activeTab)
    localStorage.setItem(WIZARD_KEY, String(state.wizardSeen))
    localStorage.setItem(DOCK_KEY, state.yamlDock)
    localStorage.setItem(ACL_VIEW_KEY, state.aclViewMode)
  } catch {
    // localStorage might be full or unavailable
  }
}

export function loadState(): PersistedState | null {
  try {
    const configStr = localStorage.getItem(STORAGE_KEY)
    if (!configStr) return null

    const config = JSON.parse(configStr) as RorConfig

    const VALID_EDITIONS = new Set(['free', 'pro', 'enterprise'])
    const VALID_TABS = new Set(['getting-started', 'acl-flow', 'users-groups', 'authentication', 'authorization', 'ssl-tls', 'audit', 'advanced'])
    const VALID_DOCKS = new Set(['bottom', 'right'])
    const VALID_ACL_VIEWS = new Set(['graph', 'form', 'code'])

    const rawEdition = localStorage.getItem(EDITION_KEY)
    const edition = (VALID_EDITIONS.has(rawEdition!) ? rawEdition : 'enterprise') as Edition
    const rawTab = localStorage.getItem(TAB_KEY)
    const activeTab = (VALID_TABS.has(rawTab!) ? rawTab : 'getting-started') as TabId
    const wizardSeen = localStorage.getItem(WIZARD_KEY) === 'true'
    const rawDock = localStorage.getItem(DOCK_KEY)
    const yamlDock = (VALID_DOCKS.has(rawDock!) ? rawDock : 'bottom') as YamlDock
    const rawAclView = localStorage.getItem(ACL_VIEW_KEY)
    const aclViewMode = (VALID_ACL_VIEWS.has(rawAclView!) ? rawAclView : 'graph') as AclViewMode

    return { config, edition, activeTab, wizardSeen, yamlDock, aclViewMode }
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
  localStorage.removeItem(ACL_VIEW_KEY)
}
