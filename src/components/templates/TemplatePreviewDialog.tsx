import { useMemo, Suspense } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { styles } from '@/components/shared-styles'
import { configToYaml } from '@/utils/yaml'
import type { Edition } from '@/schema/types'
import type { TemplateDef } from './template-data'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

function TierBadge({ tier }: { tier: Edition }) {
  if (tier === 'free') return null
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded',
        tier === 'pro' ? styles.tierBadge.pro : styles.tierBadge.ent
      )}
    >
      {tier === 'pro' ? 'PRO' : 'ENT'}
    </span>
  )
}

const handleEditorMount: OnMount = (editor, monaco) => {
  monaco.editor.defineTheme('ror-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'type', foreground: '5eead4' },
      { token: 'string', foreground: 'f9e2af' },
      { token: 'number', foreground: 'a6e3a1' },
      { token: 'comment', foreground: '6c7086' },
      { token: 'keyword', foreground: '5eead4' },
    ],
    colors: {
      'editor.background': '#1e1e2e',
      'editor.foreground': '#a6e3a1',
      'editorLineNumber.foreground': '#45475a',
      'editorLineNumber.activeForeground': '#6c7086',
      'editor.selectionBackground': '#45475a50',
      'editor.lineHighlightBackground': '#45475a30',
      'editorGutter.background': '#1e1e2e',
    },
  })
  monaco.editor.setTheme('ror-dark')
}

export function TemplatePreviewDialog({
  template,
  open,
  onOpenChange,
  onConfirm,
}: {
  template: TemplateDef | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (template: TemplateDef) => void
}) {
  const yamlPreview = useMemo(() => {
    if (!template) return ''
    try {
      return configToYaml(template.buildConfig())
    } catch {
      return '# Error generating preview'
    }
  }, [template])

  if (!template) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <template.icon className="w-5 h-5 text-[var(--color-accent)]" />
            {template.title}
            <TierBadge tier={template.tier} />
          </DialogTitle>
          <DialogDescription>
            {template.longDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg overflow-hidden border border-[var(--color-border)]" style={{ height: 400 }}>
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-full bg-[#1e1e2e] text-xs text-gray-400">
                Loading editor...
              </div>
            }
          >
            <Editor
              defaultLanguage="yaml"
              value={yamlPreview}
              onMount={handleEditorMount}
              theme="vs-dark"
              options={{
                readOnly: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 13,
                fontFamily: 'var(--font-mono)',
                lineNumbers: 'on',
                renderLineHighlight: 'line',
                wordWrap: 'off',
                folding: true,
                glyphMargin: false,
                overviewRulerBorder: false,
                domReadOnly: true,
                padding: { top: 12, bottom: 12 },
              }}
            />
          </Suspense>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-white"
            onClick={() => onConfirm(template)}
          >
            Load Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
