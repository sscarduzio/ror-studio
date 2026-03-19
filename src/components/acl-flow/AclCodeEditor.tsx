import { useRef, useEffect, useCallback, useState } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'
import type { editor as monacoEditor } from 'monaco-editor'
import { useEditorStore } from '@/store/editor-store'
import { useValidation } from '@/hooks/useValidation'
import { configToYaml, yamlToConfig } from '@/utils/yaml'
import { setupRorYaml, buildValidationMarkers } from '@/utils/monaco-ror'

export function AclCodeEditor() {
  const config = useEditorStore((s) => s.config)
  const setConfig = useEditorStore((s) => s.setConfig)
  const setConfigSilent = useEditorStore((s) => s.setConfigSilent)
  const { issues } = useValidation()
  const editorRef = useRef<monacoEditor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null)
  const [mountCount, setMountCount] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isInternalChange = useRef(false)
  // Push one undo entry on the first edit, then use silent updates for subsequent parses.
  // This way "undo" returns to the pre-edit state without flooding the stack.
  const hasSnapshotRef = useRef(false)

  const yamlText = configToYaml(config)

  // Track whether component is still mounted to prevent stale store updates
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    hasSnapshotRef.current = false
    return () => { mountedRef.current = false }
  }, [])

  const handleChange = useCallback((value: string | undefined) => {
    if (!value) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (!mountedRef.current) return
      try {
        const { config: parsed } = yamlToConfig(value)
        // Preserve disabled blocks — they're serialized as comments,
        // so yamlToConfig() can't recover them from the YAML text.
        const currentConfig = useEditorStore.getState().config
        const disabledBlocks = currentConfig.access_control_rules.filter((b) => !b.enabled)
        if (disabledBlocks.length > 0) {
          parsed.access_control_rules = [...parsed.access_control_rules, ...disabledBlocks]
        }
        isInternalChange.current = true
        if (!hasSnapshotRef.current) {
          // First edit: push one undo snapshot, then switch to silent
          hasSnapshotRef.current = true
          setConfig(parsed)
        } else {
          // Subsequent edits: don't flood undo stack
          setConfigSilent(parsed)
        }
      } catch {
        // Invalid YAML — don't update store, markers will show errors
      }
    }, 500)
  }, [setConfig, setConfigSilent])

  // Sync editor content when store changes externally (e.g. from Form/Graph mode)
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
    }
  }, [yamlText])

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco
    setupRorYaml(monaco)
    setMountCount((c) => c + 1)
  }, [])

  // Apply validation markers
  useEffect(() => {
    const editor = editorRef.current
    const monaco = monacoRef.current
    if (!editor || !monaco) return

    const model = editor.getModel()
    if (!model) return

    const markers = buildValidationMarkers(issues, model, monaco)
    monaco.editor.setModelMarkers(model, 'ror-validation', markers)
  }, [issues, mountCount])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  return (
    <div className="h-full bg-[#fafbfc]">
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
  )
}
