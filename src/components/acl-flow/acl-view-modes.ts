import { Workflow, List, Code2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type AclViewMode = 'graph' | 'form' | 'code'

export interface ViewModeDef {
  id: AclViewMode
  label: string
  icon: LucideIcon
}

export const ACL_VIEW_MODES: ViewModeDef[] = [
  { id: 'graph', label: 'Graph', icon: Workflow },
  { id: 'form',  label: 'Form',  icon: List },
  { id: 'code',  label: 'Code',  icon: Code2 },
]
