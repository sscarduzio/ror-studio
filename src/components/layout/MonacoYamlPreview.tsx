import { useRef, useEffect, useImperativeHandle, forwardRef, useCallback, useState } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'
import type { editor as monacoEditor } from 'monaco-editor'
import type { ValidationIssue } from '@/validation/types'
import { setupRorYaml, buildValidationMarkers } from '@/utils/monaco-ror'

interface MonacoYamlPreviewProps {
  yamlText: string
  issues: ValidationIssue[]
}

export interface MonacoYamlPreviewHandle {
  revealLine: (line: number) => void
}

export const MonacoYamlPreview = forwardRef<MonacoYamlPreviewHandle, MonacoYamlPreviewProps>(
  function MonacoYamlPreview({ yamlText, issues }, ref) {
    const editorRef = useRef<monacoEditor.IStandaloneCodeEditor | null>(null)
    const monacoRef = useRef<typeof import('monaco-editor') | null>(null)
    const [mountCount, setMountCount] = useState(0)

    useImperativeHandle(ref, () => ({
      revealLine(line: number) {
        const editor = editorRef.current
        if (editor) {
          editor.revealLineInCenter(line)
          editor.setPosition({ lineNumber: line, column: 1 })
        }
      },
    }))

    const handleMount: OnMount = useCallback((editor, monaco) => {
      editorRef.current = editor
      monacoRef.current = monaco
      setupRorYaml(monaco)
      setMountCount((c) => c + 1)
    }, [])

    useEffect(() => {
      const editor = editorRef.current
      const monaco = monacoRef.current
      if (!editor || !monaco) return

      const model = editor.getModel()
      if (!model) return

      const markers = buildValidationMarkers(issues, model, monaco)
      monaco.editor.setModelMarkers(model, 'ror-validation', markers)
    }, [yamlText, issues, mountCount])

    return (
      <Editor
        defaultLanguage="ror-yaml"
        value={yamlText}
        onMount={handleMount}
        options={{
          readOnly: true,
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
          domReadOnly: true,
        }}
        loading={
          <div className="flex items-center justify-center h-full text-xs text-gray-400">
            Loading editor...
          </div>
        }
      />
    )
  },
)
