import type { editor as monacoEditor } from 'monaco-editor'
import type { ValidationIssue } from '@/validation/types'

type Monaco = typeof import('monaco-editor')

let registered = false

/**
 * Register the `ror-yaml` monarch language and `ror-light` theme.
 * Fully idempotent — safe to call on every editor mount.
 */
export function setupRorYaml(monaco: Monaco) {
  if (!registered) {
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
        { token: 'type', foreground: '0f766e' },
        { token: 'string', foreground: 'b45309' },
        { token: 'number', foreground: '0369a1' },
        { token: 'comment', foreground: '94a3b8' },
        { token: 'keyword', foreground: '0f766e' },
        { token: 'ror-variable', foreground: '7c3aed' },
      ],
      colors: {
        'editor.background': '#00000000',
        'editor.foreground': '#334155',
        'editorLineNumber.foreground': '#cbd5e1',
        'editorLineNumber.activeForeground': '#64748b',
        'editor.selectionBackground': '#e2e8f0',
        'editor.lineHighlightBackground': '#f1f5f9',
        'editorGutter.background': '#00000000',
      },
    })

    registered = true
  }

  monaco.editor.setTheme('ror-light')
}

/**
 * Convert validation issues with line numbers into Monaco marker data.
 */
export function buildValidationMarkers(
  issues: ValidationIssue[],
  model: monacoEditor.ITextModel,
  monaco: Monaco,
): monacoEditor.IMarkerData[] {
  return issues
    .filter((i) => i.line && i.severity !== 'info')
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
}
