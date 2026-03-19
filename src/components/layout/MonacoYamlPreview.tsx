import { useRef, useEffect, useImperativeHandle, forwardRef, useCallback, useState } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'
import type { editor as monacoEditor } from 'monaco-editor'
import type { ValidationIssue } from '@/validation/types'

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
    // Counter that increments when the editor mounts, forcing the markers effect to re-run
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

      // Define a light theme matching the new abstract aesthetic
      // Register a monarch tokenizer for YAML with ROR variable highlighting
      monaco.languages.register({ id: 'ror-yaml' })
      monaco.languages.setMonarchTokensProvider('ror-yaml', {
        tokenizer: {
          root: [
            [/@(explode)?\{[^}]+\}(\.(to_lowercase|replace_first\([^)]*\)|replace_all\([^)]*\)))*/, 'ror-variable'],
            [/#.*$/, 'comment'],
            [/^[\t ]*[a-zA-Z_][\w.]*(?=\s*:)/, 'type'],
            [/"[^"]*"/, 'string'],
            [/'[^']*'/, 'string'],
            [/\b\d+(\.\d+)?\b/, 'number'],
            [/\b(true|false|null|yes|no)\b/, 'keyword'],
          ],
        },
      })

      monaco.editor.defineTheme('ror-light', {
        base: 'vs',
        inherit: true,
        rules: [
          { token: 'type', foreground: '0f766e' },     // keys (teal-700)
          { token: 'string', foreground: 'b45309' },   // strings (amber-700)
          { token: 'number', foreground: '0369a1' },   // numbers (sky-700)
          { token: 'comment', foreground: '94a3b8' },  // comments (slate-400)
          { token: 'keyword', foreground: '0f766e' },
          { token: 'ror-variable', foreground: '7c3aed' }, // violet-600
        ],
        colors: {
          'editor.background': '#00000000', // Transparent to let the container background show
          'editor.foreground': '#334155',   // slate-700
          'editorLineNumber.foreground': '#cbd5e1', // slate-300
          'editorLineNumber.activeForeground': '#64748b', // slate-500
          'editor.selectionBackground': '#e2e8f0', // slate-200
          'editor.lineHighlightBackground': '#f1f5f9', // slate-100
          'editorGutter.background': '#00000000',
        },
      })

      monaco.editor.setTheme('ror-light')

      // Trigger markers effect to re-run now that refs are populated
      setMountCount((c) => c + 1)
    }, [])

    // Apply markers whenever content, issues, or editor mount changes.
    // Content is managed by @monaco-editor/react via the `value` prop.
    // We still need this effect for markers since setValue() clears them.
    useEffect(() => {
      const editor = editorRef.current
      const monaco = monacoRef.current
      if (!editor || !monaco) return

      const model = editor.getModel()
      if (!model) return

      // Build and apply markers
      const markers: monacoEditor.IMarkerData[] = issues
        .filter((i) => i.line && i.severity !== 'info')
        .map((issue) => {
          const line = issue.line!
          const endLine = issue.endLine ?? line
          // Use actual line length for accurate squiggle range
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
