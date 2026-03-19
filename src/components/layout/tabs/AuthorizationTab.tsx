import { UserCheck, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useEditorStore } from '@/store/editor-store'
import { styles } from '@/components/shared-styles'
import { ReturnBanner } from '@/components/layout/ReturnBanner'
import type { ExternalAuthorizationConfig } from '@/schema/types'
import { EMPTY_PROVIDERS } from '@/schema/empty-defaults'

export function AuthorizationTab() {
  const providers = useEditorStore((s) => s.config.user_groups_providers ?? EMPTY_PROVIDERS)
  const updateConfigField = useEditorStore((s) => s.updateConfigField)

  const addProvider = () => {
    const newProvider: ExternalAuthorizationConfig = {
      name: `ext_authz_${providers.length + 1}`,
      groups_endpoint: '',
      auth_token_name: '',
      auth_token_passed_as: 'HEADER',
    }
    updateConfigField('user_groups_providers', [...providers, newProvider])
  }

  const updateProvider = (index: number, updates: Partial<ExternalAuthorizationConfig>) => {
    const updated = providers.map((p, i) => (i === index ? { ...p, ...updates } : p))
    updateConfigField('user_groups_providers', updated)
  }

  const removeProvider = (index: number) => {
    updateConfigField('user_groups_providers', providers.filter((_: ExternalAuthorizationConfig, i: number) => i !== index))
  }

  return (
    <div className={styles.pageContainer}>
      <ReturnBanner />
      <div className="flex items-center justify-between">
        <div>
          <h2 className={styles.pageTitle}>
            Authorization
          </h2>
          <p className={styles.pageSubtitle}>
            Configure external groups providers for group resolution
          </p>
        </div>
        <Button size="sm" onClick={addProvider} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          Add Provider
        </Button>
      </div>

      {providers.length === 0 ? (
        <div className={styles.emptyStateCard}>
          <UserCheck className="w-10 h-10 text-[var(--color-text-tertiary)]" />
          <p className="text-sm text-[var(--color-text-secondary)]">No authorization providers configured</p>
          <Button size="sm" onClick={addProvider} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Add provider
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {providers.map((provider, i) => (
            <div key={i} className={styles.cardWithSpaceTight}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className={styles.fieldLabel}>Name</Label>
                  <Input value={provider.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateProvider(i, { name: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label className={styles.fieldLabel}>Groups Endpoint</Label>
                  <Input value={provider.groups_endpoint} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateProvider(i, { groups_endpoint: e.target.value })} className={styles.monoInput} placeholder="https://..." />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className={styles.fieldLabel}>Auth Token Name</Label>
                  <Input value={provider.auth_token_name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateProvider(i, { auth_token_name: e.target.value })} className="mt-1" placeholder="X-Auth-Token" />
                </div>
                <div>
                  <Label className={styles.fieldLabel}>Token Passed As</Label>
                  <select
                    value={provider.auth_token_passed_as}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateProvider(i, { auth_token_passed_as: e.target.value as 'HEADER' | 'QUERY_PARAM' })}
                    className={styles.select}
                  >
                    <option value="HEADER">Header</option>
                    <option value="QUERY_PARAM">Query Parameter</option>
                  </select>
                </div>
                <div>
                  <Label className={styles.fieldLabel}>HTTP Method</Label>
                  <select
                    value={provider.http_method || 'GET'}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateProvider(i, { http_method: e.target.value as 'GET' | 'POST' })}
                    className={styles.select}
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                  </select>
                </div>
              </div>
              <div>
                <Label className={styles.fieldLabel}>Groups IDs JSON Path</Label>
                <Input value={provider.response_groups_ids_json_path || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateProvider(i, { response_groups_ids_json_path: e.target.value })} className={styles.monoInput} placeholder="$.groups[*]" />
              </div>
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={() => removeProvider(i)} className={styles.removeButton}>
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
