import { useRef, useEffect, useCallback, useState } from 'react'
import * as yamlLib from 'js-yaml'
import Editor, { type OnMount } from '@monaco-editor/react'
import type { editor as monacoEditor } from 'monaco-editor'
import { CircleX, TriangleAlert } from 'lucide-react'
import { useEditorStore } from '@/store/editor-store'
import { configToYaml, yamlToConfig } from '@/utils/yaml'
import { validateConfig } from '@/validation/semantic-validator'
import { buildYamlLineMap } from '@/utils/yaml-line-map'
import { setupRorYaml } from '@/utils/monaco-ror'
import type { RorConfig } from '@/schema/types'

// ---------------------------------------------------------------------------
// Resolve validator field paths to YAML line numbers (same logic as useValidation)
// ---------------------------------------------------------------------------

function resolveFieldToLine(
  field: string,
  lineMap: Map<string, number>,
  config: RorConfig,
): number | undefined {
  const direct = lineMap.get(field)
  if (direct) return direct

  const ruleMatch = field.match(/^access_control_rules\[(\d+)\]\.rules\[(\d+)\]$/)
  if (ruleMatch) {
    const blockIdx = parseInt(ruleMatch[1], 10)
    const ruleIdx = parseInt(ruleMatch[2], 10)
    const block = config.access_control_rules[blockIdx]
    if (block?.rules[ruleIdx]) {
      const line = lineMap.get(`access_control_rules[${blockIdx}].${block.rules[ruleIdx].type}`)
      if (line) return line
    }
    return lineMap.get(`access_control_rules[${blockIdx}].name`)
  }

  const blockRulesMatch = field.match(/^access_control_rules\[(\d+)\]\.rules$/)
  if (blockRulesMatch) {
    return lineMap.get(`access_control_rules[${parseInt(blockRulesMatch[1], 10)}].name`)
  }

  const blockMatch = field.match(/^access_control_rules\[(\d+)\]$/)
  if (blockMatch) {
    return lineMap.get(`access_control_rules[${parseInt(blockMatch[1], 10)}].name`)
  }

  const userMatch = field.match(/^users\[(\d+)\]$/)
  if (userMatch) {
    return lineMap.get(`users[${parseInt(userMatch[1], 10)}].username`)
  }

  // Prefix fallback
  const parts = field.split('.')
  for (let len = parts.length - 1; len >= 1; len--) {
    const line = lineMap.get(parts.slice(0, len).join('.'))
    if (line) return line
  }
  return undefined
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface CodeIssue {
  severity: 'error' | 'warning'
  message: string
  line?: number
  endLine?: number
  fix?: string
}

export function AclCodeEditor() {
  const config = useEditorStore((s) => s.config)
  const setConfig = useEditorStore((s) => s.setConfig)
  const setConfigSilent = useEditorStore((s) => s.setConfigSilent)
  const editorRef = useRef<monacoEditor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null)
  const [mountCount, setMountCount] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isInternalChange = useRef(false)
  const hasSnapshotRef = useRef(false)
  const mountedRef = useRef(true)

  // Local validation state — runs directly on editor text, independent of store
  const [codeIssues, setCodeIssues] = useState<CodeIssue[]>([])

  const yamlText = configToYaml(config)

  useEffect(() => {
    mountedRef.current = true
    hasSnapshotRef.current = false
    return () => { mountedRef.current = false }
  }, [])

  // ── Validate raw editor text: YAML syntax + ROR semantic rules ──
  const runValidation = useCallback((text: string): CodeIssue[] => {
    const issues: CodeIssue[] = []

    // 1) YAML syntax validation
    try {
      yamlLib.load(text)
    } catch (e) {
      if (e instanceof yamlLib.YAMLException) {
        const mark = e.mark
        issues.push({
          severity: 'error',
          message: e.reason || 'YAML syntax error',
          line: mark ? mark.line + 1 : undefined, // js-yaml uses 0-based lines
          fix: mark ? `Line ${mark.line + 1}, column ${mark.column + 1}` : undefined,
        })
      } else {
        issues.push({ severity: 'error', message: 'Invalid YAML' })
      }
      return issues // Can't do semantic validation on broken YAML
    }

    // 2) ROR config parse validation
    let parsed: RorConfig
    try {
      const result = yamlToConfig(text)
      parsed = result.config
    } catch (e) {
      issues.push({
        severity: 'error',
        message: e instanceof Error ? e.message : 'Failed to parse ROR config',
      })
      return issues
    }

    // 3) Full ROR semantic validation
    const semanticIssues = validateConfig(parsed)
    const lineMap = buildYamlLineMap(text)

    for (const issue of semanticIssues) {
      if (issue.severity === 'info') continue
      let line = issue.line
      if (!line && issue.field) {
        line = resolveFieldToLine(issue.field, lineMap, parsed)
      }
      issues.push({
        severity: issue.severity as 'error' | 'warning',
        message: issue.message,
        line,
        endLine: issue.endLine,
        fix: issue.fix,
      })
    }

    return issues
  }, [])

  // ── Apply markers to Monaco from local issues ──
  const applyMarkers = useCallback((issues: CodeIssue[]) => {
    const editor = editorRef.current
    const monaco = monacoRef.current
    if (!editor || !monaco) return

    const model = editor.getModel()
    if (!model) return

    const markers: monacoEditor.IMarkerData[] = issues
      .filter((i) => i.line)
      .map((issue) => {
        const line = issue.line!
        const endLine = issue.endLine ?? line
        const lineContent = model.getLineContent(Math.min(line, model.getLineCount()))
        const startCol = (lineContent.length - lineContent.trimStart().length) + 1
        const endLineContent = model.getLineContent(Math.min(endLine, model.getLineCount()))
        const endCol = endLineContent.length + 1

        return {
          severity: issue.severity === 'error'
            ? monaco.MarkerSeverity.Error
            : monaco.MarkerSeverity.Warning,
          message: issue.fix
            ? `${issue.message}\n\nFix: ${issue.fix}`
            : issue.message,
          startLineNumber: line,
          startColumn: startCol,
          endLineNumber: endLine,
          endColumn: endCol,
        }
      })

    monaco.editor.setModelMarkers(model, 'ror-validation', markers)
  }, [])

  // ── Editor change handler: debounced parse + validate ──
  const handleChange = useCallback((value: string | undefined) => {
    if (!value) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (!mountedRef.current) return

      // Always validate the raw text — even if YAML is broken
      const issues = runValidation(value)
      setCodeIssues(issues)
      applyMarkers(issues)

      // Only update store if YAML parses successfully
      try {
        const { config: parsed } = yamlToConfig(value)
        // Preserve disabled blocks
        const currentConfig = useEditorStore.getState().config
        const disabledBlocks = currentConfig.access_control_rules.filter((b) => !b.enabled)
        if (disabledBlocks.length > 0) {
          parsed.access_control_rules = [...parsed.access_control_rules, ...disabledBlocks]
        }
        isInternalChange.current = true
        if (!hasSnapshotRef.current) {
          hasSnapshotRef.current = true
          setConfig(parsed)
        } else {
          setConfigSilent(parsed)
        }
      } catch {
        // YAML parse failed — markers already applied above, don't update store
      }
    }, 400)
  }, [setConfig, setConfigSilent, runValidation, applyMarkers])

  // ── Sync editor when store changes externally ──
  // Uses a ref to defer validation to next frame (avoids setState-in-effect lint rule)
  const pendingValidationRef = useRef<string | null>(null)

  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false
      return
    }
    const editor = editorRef.current
    if (!editor) return
    const model = editor.getModel()
    if (!model) return
    const currentValue = model.getValue()
    if (currentValue !== yamlText) {
      const pos = editor.getPosition()
      model.setValue(yamlText)
      if (pos) editor.setPosition(pos)
      // Defer validation to next frame
      pendingValidationRef.current = yamlText
      requestAnimationFrame(() => {
        if (pendingValidationRef.current !== null) {
          const issues = runValidation(pendingValidationRef.current)
          pendingValidationRef.current = null
          setCodeIssues(issues)
          applyMarkers(issues)
        }
      })
    }
  }, [yamlText, runValidation, applyMarkers])

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco
    setupRorYaml(monaco)
    setMountCount((c) => c + 1)
  }, [])

  // Run initial validation once editor is mounted
  useEffect(() => {
    if (mountCount === 0) return
    const editor = editorRef.current
    if (!editor) return
    const model = editor.getModel()
    if (!model) return
    const text = model.getValue()
    const issues = runValidation(text)
    setCodeIssues(issues)
    applyMarkers(issues)
  }, [mountCount, runValidation, applyMarkers])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const errorCount = codeIssues.filter((i) => i.severity === 'error').length
  const warningCount = codeIssues.filter((i) => i.severity === 'warning').length

  const revealLine = useCallback((line: number) => {
    const editor = editorRef.current
    if (editor) {
      editor.revealLineInCenter(line)
      editor.setPosition({ lineNumber: line, column: 1 })
      editor.focus()
    }
  }, [])

  return (
    <div className="h-full flex flex-col bg-[#fafbfc]">
      {/* Error summary bar */}
      {codeIssues.length > 0 && (
        <div className={`shrink-0 border-b ${errorCount > 0 ? 'bg-red-50/90 border-red-200/60' : 'bg-amber-50/90 border-amber-200/60'}`}>
          {/* Summary counts */}
          <div className="flex items-center gap-3 px-4 py-1.5 text-[12px] font-semibold">
            {errorCount > 0 && (
              <span className="text-red-700 flex items-center gap-1">
                <CircleX className="w-3.5 h-3.5" />
                {errorCount} {errorCount === 1 ? 'error' : 'errors'}
              </span>
            )}
            {warningCount > 0 && (
              <span className="text-amber-700 flex items-center gap-1">
                <TriangleAlert className="w-3.5 h-3.5" />
                {warningCount} {warningCount === 1 ? 'warning' : 'warnings'}
              </span>
            )}
          </div>
          {/* Issue list */}
          <div className="max-h-[140px] overflow-y-auto border-t border-slate-200/40">
            {codeIssues.map((issue, idx) => (
              <button
                key={idx}
                onClick={() => issue.line && revealLine(issue.line)}
                className="w-full text-left px-4 py-1.5 flex items-center gap-2.5 hover:bg-white/60 transition-colors text-[12px]"
              >
                {issue.severity === 'error'
                  ? <CircleX className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  : <TriangleAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                }
                {issue.line && (
                  <span className="shrink-0 px-1 py-0.5 rounded text-[10px] font-mono font-bold bg-white/80 border border-slate-200 text-slate-500">
                    L{issue.line}
                  </span>
                )}
                <span className="truncate text-slate-800 font-medium">{issue.message}</span>
                {issue.fix && (
                  <span className="truncate text-slate-400 ml-1 hidden sm:inline">— {issue.fix}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Monaco editor */}
      <div className="flex-1 min-h-0">
        <Editor
          defaultLanguage="ror-yaml"
          defaultValue={yamlText}
          onChange={handleChange}
          onMount={handleMount}
          options={{
            readOnly: false,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
            lineNumbers: 'on',
            renderLineHighlight: 'line',
            wordWrap: 'off',
            folding: true,
            glyphMargin: true,
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
            tabSize: 2,
          }}
          loading={
            <div className="flex items-center justify-center h-full text-xs text-gray-400">
              Loading editor...
            </div>
          }
        />
      </div>
    </div>
  )
}
