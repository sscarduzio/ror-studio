import { useMemo, useRef, useState, useEffect } from 'react'
import { useEditorStore } from '@/store/editor-store'
import { validateConfig } from '@/validation/semantic-validator'
import { configToYaml } from '@/utils/yaml'
import { buildYamlLineMap } from '@/utils/yaml-line-map'
import type { RorConfig } from '@/schema/types'
import type { TabId } from '@/schema/types'
import type { ValidationIssue } from '@/validation/types'

const DEBOUNCE_MS = 200

export interface ValidationResult {
  issues: ValidationIssue[]
  issuesByTab: Map<TabId, ValidationIssue[]>
  errorCount: number
  warningCount: number
  yamlText: string
}

const EMPTY_RESULT: ValidationResult = {
  issues: [],
  issuesByTab: new Map(),
  errorCount: 0,
  warningCount: 0,
  yamlText: '',
}

function buildResult(issues: ValidationIssue[], yamlText: string): ValidationResult {
  const issuesByTab = new Map<TabId, ValidationIssue[]>()
  let errorCount = 0
  let warningCount = 0

  for (const issue of issues) {
    const list = issuesByTab.get(issue.tab)
    if (list) {
      list.push(issue)
    } else {
      issuesByTab.set(issue.tab, [issue])
    }
    if (issue.severity === 'error') errorCount++
    else if (issue.severity === 'warning') warningCount++
  }

  return { issues, issuesByTab, errorCount, warningCount, yamlText }
}

/**
 * Resolve a validator field path to a YAML line number.
 *
 * Validator uses internal model paths like:
 *   access_control_rules[0].rules       (block-level issue)
 *   access_control_rules[0].rules[2]    (rule-specific issue)
 *   access_control_rules[0].name        (block name)
 *   users[0].username                   (user field)
 *   ssl.keystore_pass                   (direct path)
 *
 * But in YAML, ACL rules are flattened as sibling keys within blocks,
 * so `access_control_rules[0].rules[2]` doesn't exist in the line map.
 * We need to translate these using the config.
 */
function resolveFieldToLine(
  field: string,
  lineMap: Map<string, number>,
  config: RorConfig,
): number | undefined {
  // Direct match — works for users, ssl, block names, etc.
  const direct = lineMap.get(field)
  if (direct) return direct

  // access_control_rules[i].rules[j] → look up the j-th rule's type as a YAML key
  const ruleMatch = field.match(/^access_control_rules\[(\d+)\]\.rules\[(\d+)\]$/)
  if (ruleMatch) {
    const blockIdx = parseInt(ruleMatch[1], 10)
    const ruleIdx = parseInt(ruleMatch[2], 10)
    const block = config.access_control_rules[blockIdx]
    if (block && block.rules[ruleIdx]) {
      const ruleType = block.rules[ruleIdx].type
      // In YAML, rules are flattened as top-level keys within the block object
      const yamlPath = `access_control_rules[${blockIdx}].${ruleType}`
      const line = lineMap.get(yamlPath)
      if (line) return line
    }
    // Fall back to the block itself
    return lineMap.get(`access_control_rules[${blockIdx}].name`)
  }

  // access_control_rules[i].rules → point to the block's name line
  const blockRulesMatch = field.match(/^access_control_rules\[(\d+)\]\.rules$/)
  if (blockRulesMatch) {
    const blockIdx = parseInt(blockRulesMatch[1], 10)
    return lineMap.get(`access_control_rules[${blockIdx}].name`)
  }

  // access_control_rules[i] → point to the block's name line
  const blockMatch = field.match(/^access_control_rules\[(\d+)\]$/)
  if (blockMatch) {
    return lineMap.get(`access_control_rules[${parseInt(blockMatch[1], 10)}].name`)
  }

  // users[i] → point to the user's username line
  const userMatch = field.match(/^users\[(\d+)\]$/)
  if (userMatch) {
    return lineMap.get(`users[${parseInt(userMatch[1], 10)}].username`)
  }

  // Try prefix match — find the closest parent that maps
  const parts = field.split('.')
  for (let len = parts.length - 1; len >= 1; len--) {
    const prefix = parts.slice(0, len).join('.')
    const line = lineMap.get(prefix)
    if (line) return line
  }

  return undefined
}

/**
 * Hook that subscribes to the editor config and runs semantic validation
 * with a 200ms debounce. Uses JSON.stringify fingerprinting to avoid
 * infinite re-render loops with React 19 + zustand.
 */
export function useValidation(): ValidationResult {
  const config = useEditorStore((s) => s.config)
  const [result, setResult] = useState<ValidationResult>(EMPTY_RESULT)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Stable fingerprint to detect actual config changes
  const configJson = useMemo(() => JSON.stringify(config), [config])
  const prevJsonRef = useRef<string>('')

  useEffect(() => {
    // Skip if config hasn't actually changed
    if (configJson === prevJsonRef.current) return
    prevJsonRef.current = configJson

    const runValidation = () => {
      const issues = validateConfig(config)
      const yamlText = configToYaml(config)
      const lineMap = buildYamlLineMap(yamlText)

      // Enrich issues with line numbers from the YAML line map
      for (const issue of issues) {
        if (issue.field && !issue.line) {
          const line = resolveFieldToLine(issue.field, lineMap, config)
          if (line) {
            issue.line = line
          }
        }
      }

      setResult(buildResult(issues, yamlText))
    }

    // Run immediately on first load to avoid empty preview flash,
    // then debounce subsequent updates for performance
    if (result === EMPTY_RESULT) {
      runValidation()
      return
    }

    // Clear any pending debounce
    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(runValidation, DEBOUNCE_MS)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [configJson, config]) // eslint-disable-line react-hooks/exhaustive-deps -- result ref is intentional

  return result
}
