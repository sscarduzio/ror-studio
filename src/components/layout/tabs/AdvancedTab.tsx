import { Settings } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useEditorStore } from '@/store/editor-store'
import { styles } from '@/components/shared-styles'
import type { GlobalSettings } from '@/schema/types'

export function AdvancedTab() {
  const config = useEditorStore((s) => s.config)
  const updateConfigField = useEditorStore((s) => s.updateConfigField)
  const gs = config.global_settings || {}
  const unrecognized = config._unrecognized || {}
  const hasUnrecognized = Object.keys(unrecognized).length > 0

  const updateGlobalSetting = (updates: Partial<GlobalSettings>) => {
    updateConfigField('global_settings', { ...gs, ...updates })
  }

  return (
    <div className={styles.pageContainer}>
      <div>
        <h2 className={styles.pageTitle}>
          Advanced Settings
        </h2>
        <p className={styles.pageSubtitle}>
          Global settings, configuration options, and imported unrecognized settings
        </p>
      </div>

      <div className={styles.cardWithSpace}>
        <h3 className={styles.sectionTitle}>Global Settings</h3>

        <div className="flex items-center gap-3">
          <Switch
            checked={gs.prompt_for_basic_auth ?? false}
            onCheckedChange={(v: boolean) => updateGlobalSetting({ prompt_for_basic_auth: v })}
          />
          <div>
            <Label className="text-sm font-semibold text-[var(--color-text-primary)]">
              Prompt for Basic Auth
            </Label>
            <p className="text-xs text-[var(--color-text-tertiary)]">
              Return 401 instead of 403 on auth failure (triggers browser basic auth dialog)
            </p>
          </div>
        </div>

        <div>
          <Label className={styles.fieldLabel}>
            Response if Request Forbidden
          </Label>
          <Input
            value={gs.response_if_req_forbidden || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateGlobalSetting({ response_if_req_forbidden: e.target.value })}
            className="mt-1"
            placeholder="Forbidden by ReadonlyREST ES plugin"
          />
        </div>

        <div>
          <Label className={styles.fieldLabel}>
            FLS Engine
          </Label>
          <select
            value={gs.fls_engine || 'es_with_lucene'}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateGlobalSetting({ fls_engine: e.target.value as GlobalSettings['fls_engine'] })}
            className={styles.select}
          >
            <option value="es_with_lucene">ES with Lucene (default)</option>
            <option value="es">ES only</option>
          </select>
        </div>

        <div>
          <Label className={styles.fieldLabel}>
            Username Case Sensitivity
          </Label>
          <select
            value={gs.username_case_sensitivity || 'case_sensitive'}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateGlobalSetting({ username_case_sensitivity: e.target.value as GlobalSettings['username_case_sensitivity'] })}
            className={styles.select}
          >
            <option value="case_sensitive">Case Sensitive (default)</option>
            <option value="case_insensitive">Case Insensitive</option>
          </select>
        </div>
      </div>

      {/* Unrecognized settings from import */}
      {hasUnrecognized && (
        <div>
          <h3 className="text-sm font-bold text-[var(--color-warning)] mb-2">
            Unrecognized Settings (Preserved from Import)
          </h3>
          <div className="rounded-[var(--radius-card)] border border-[var(--color-warning)]/30 bg-[var(--color-warning-bg)] p-4">
            <p className="text-xs text-[var(--color-text-secondary)] mb-3">
              These settings were found in your imported configuration but are not recognized by ROR Studio.
              They will be preserved in the exported YAML.
            </p>
            <Textarea
              value={JSON.stringify(unrecognized, null, 2)}
              readOnly
              className="font-mono text-xs h-40"
            />
          </div>
        </div>
      )}

      {!hasUnrecognized && (
        <div className={styles.emptyState}>
          <Settings className="w-8 h-8 text-[var(--color-text-tertiary)]" />
          <p className="text-sm text-[var(--color-text-secondary)]">
            No unrecognized settings
          </p>
          <p className="text-xs text-[var(--color-text-tertiary)]">
            Unrecognized settings from imported configs will appear here
          </p>
        </div>
      )}
    </div>
  )
}
