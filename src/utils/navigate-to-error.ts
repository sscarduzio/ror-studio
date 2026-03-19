import type { ValidationIssue } from '@/validation/types'
import type { TabId } from '@/schema/types'
import { useEditorStore } from '@/store/editor-store'

export function navigateToError(
  issue: ValidationIssue,
  setActiveTab: (tab: TabId) => void,
  revealLine?: (line: number) => void,
): void {
  setActiveTab(issue.tab)

  // If the fieldId targets a rule inside a block, expand the block first
  const ruleMatch = issue.fieldId?.match(/^block-(.+)-rule-(\d+)$/)
  if (ruleMatch) {
    const blockId = ruleMatch[1]
    // Set focusBlockId to expand the block, then scroll to the rule after it renders
    useEditorStore.setState({ focusBlockId: blockId })
    // Wait for block expansion + render, then scroll to the specific rule
    requestAnimationFrame(() => {
      setTimeout(() => {
        const el = issue.fieldId ? document.getElementById(issue.fieldId) : null
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.classList.add('validation-highlight')
          setTimeout(() => el.classList.remove('validation-highlight'), 2000)
        }
        if (issue.line && revealLine) revealLine(issue.line)
      }, 150)
    })
    return
  }

  requestAnimationFrame(() => {
    setTimeout(() => {
      if (issue.fieldId) {
        // For block-level fieldIds, also expand the block
        const blockMatch = issue.fieldId.match(/^block-(.+?)(?:-name)?$/)
        if (blockMatch) {
          useEditorStore.setState({ focusBlockId: blockMatch[1] })
        }
        const el = document.getElementById(issue.fieldId)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.classList.add('validation-highlight')
          setTimeout(() => el.classList.remove('validation-highlight'), 2000)
        }
      }
      if (issue.line && revealLine) revealLine(issue.line)
    }, 100)
  })
}
