import type { TabId } from '@/schema/types'

export type ValidationSeverity = 'error' | 'warning' | 'info'

export interface ValidationIssue {
  severity: ValidationSeverity
  message: string
  tab: TabId
  field?: string
  line?: number
  endLine?: number
  fix?: string
  fieldId?: string
}
