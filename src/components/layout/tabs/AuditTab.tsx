import { ScrollText } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useEditorStore } from '@/store/editor-store'
import { styles } from '@/components/shared-styles'
import type { AuditConfig, AuditOutput } from '@/schema/types'

const DEFAULT_AUDIT: AuditConfig = { enabled: false }

export function AuditTab() {
  const audit = useEditorStore((s) => s.config.audit || DEFAULT_AUDIT)
  const updateConfigField = useEditorStore((s) => s.updateConfigField)

  const update = (updates: Partial<AuditConfig>) => {
    updateConfigField('audit', { ...audit, ...updates })
  }

  // Get outputs of specific types
  const outputs = audit.outputs || []
  const hasIndexOutput = outputs.some((o) => o.type === 'index')
  const hasLogOutput = outputs.some((o) => o.type === 'log')
  const indexOutput = outputs.find((o) => o.type === 'index')

  const toggleOutput = (type: 'index' | 'log', enabled: boolean) => {
    if (enabled) {
      update({ outputs: [...outputs, { type }] })
    } else {
      update({ outputs: outputs.filter((o) => o.type !== type) })
    }
  }

  const updateIndexOutput = (updates: Partial<AuditOutput>) => {
    const newOutputs = outputs.map((o) => o.type === 'index' ? { ...o, ...updates } : o)
    update({ outputs: newOutputs })
  }

  return (
    <div className={styles.pageContainer}>
      <div>
        <h2 className={styles.pageTitle}>
          Audit Log
        </h2>
        <p className={styles.pageSubtitle}>
          Configure audit logging for ReadOnlyREST events
        </p>
      </div>

      <div className={styles.cardWithSpace}>
        <div className="flex items-center gap-3">
          <Switch checked={audit.enabled} onCheckedChange={(v: boolean) => update({ enabled: v })} />
          <div>
            <Label className="text-sm font-semibold text-[var(--color-text-primary)]">Enable Audit Log</Label>
            <p className="text-xs text-[var(--color-text-tertiary)]">Log access control decisions and events</p>
          </div>
        </div>

        {audit.enabled && (
          <div className="space-y-4 pt-2 border-t border-[var(--color-border)]">
            <div>
              <Label className={styles.fieldLabel}>Outputs</Label>
              <div className="flex gap-3 mt-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={hasIndexOutput}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => toggleOutput('index', e.target.checked)}
                    className="rounded border-[var(--color-border)]"
                  />
                  <span className="text-sm text-[var(--color-text-primary)]">Index</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={hasLogOutput}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => toggleOutput('log', e.target.checked)}
                    className="rounded border-[var(--color-border)]"
                  />
                  <span className="text-sm text-[var(--color-text-primary)]">Log</span>
                </label>
              </div>
            </div>
            {hasIndexOutput && (
              <div>
                <Label className={styles.fieldLabel}>Index Template</Label>
                <Input
                  value={indexOutput?.index_template || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateIndexOutput({ index_template: e.target.value })}
                  className={styles.monoInput}
                  placeholder="readonlyrest_audit-yyyy-MM-dd"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {!audit.enabled && (
        <div className={styles.emptyState}>
          <ScrollText className="w-8 h-8 text-[var(--color-text-tertiary)]" />
          <p className="text-sm text-[var(--color-text-secondary)]">
            Enable audit logging to configure outputs and filters
          </p>
        </div>
      )}
    </div>
  )
}
