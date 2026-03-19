import { Lock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useEditorStore } from '@/store/editor-store'
import { StringArrayInput } from '@/components/fields/StringArrayField'
import { styles } from '@/components/shared-styles'
import type { SslConfig } from '@/schema/types'

export function SslTlsTab() {
  const ssl = useEditorStore((s) => s.config.ssl)
  const updateConfigField = useEditorStore((s) => s.updateConfigField)

  const sslEnabled = !!ssl
  const sslData = ssl || {}

  const toggleSsl = (enabled: boolean) => {
    if (enabled) {
      updateConfigField('ssl', {} as SslConfig)
    } else {
      updateConfigField('ssl', undefined)
    }
  }

  const update = (updates: Partial<SslConfig>) => {
    updateConfigField('ssl', { ...sslData, ...updates })
  }

  return (
    <div className={styles.pageContainer}>
      <div>
        <h2 className={styles.pageTitle}>
          SSL / TLS
        </h2>
        <p className={styles.pageSubtitle}>
          Configure SSL/TLS encryption for Elasticsearch REST API. Requires <code className={styles.codeInline}>http.type: ssl_netty4</code> in elasticsearch.yml.
        </p>
      </div>

      <div className={styles.cardWithSpace}>
        <div className="flex items-center gap-3">
          <Switch checked={sslEnabled} onCheckedChange={toggleSsl} />
          <div>
            <Label className="text-sm font-semibold text-[var(--color-text-primary)]">Enable SSL</Label>
            <p className="text-xs text-[var(--color-text-tertiary)]">Enable HTTPS for the Elasticsearch REST API</p>
          </div>
        </div>

        {sslEnabled && (
          <div className="space-y-4 pt-2 border-t border-[var(--color-border)]">
            <p className={styles.fieldLabel}>
              Keystore Mode (JKS/PKCS12)
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className={styles.fieldLabel}>Keystore File</Label>
                <Input value={sslData.keystore_file || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => update({ keystore_file: e.target.value })} className={styles.monoInput} placeholder="keystore.jks" />
              </div>
              <div>
                <Label className={styles.fieldLabel}>Keystore Password</Label>
                <Input type="password" value={sslData.keystore_pass || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => update({ keystore_pass: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className={styles.fieldLabel}>Key Alias</Label>
                <Input value={sslData.key_alias || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => update({ key_alias: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label className={styles.fieldLabel}>Key Password</Label>
                <Input type="password" value={sslData.key_pass || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => update({ key_pass: e.target.value })} className="mt-1" />
              </div>
            </div>

            <div className="border-t border-[var(--color-border)] pt-3">
              <p className={`${styles.fieldLabel} mb-3`}>
                — OR — PEM Mode
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className={styles.fieldLabel}>Certificate File</Label>
                  <Input value={sslData.server_certificate_file || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => update({ server_certificate_file: e.target.value })} className={styles.monoInput} placeholder="cert.pem" />
                </div>
                <div>
                  <Label className={styles.fieldLabel}>Private Key File</Label>
                  <Input value={sslData.server_certificate_key_file || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => update({ server_certificate_key_file: e.target.value })} className={styles.monoInput} placeholder="key.pem" />
                </div>
              </div>
            </div>

            <div className="border-t border-[var(--color-border)] pt-3 space-y-3">
              <p className={styles.fieldLabel}>
                Security Settings
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch checked={sslData.client_authentication || false} onCheckedChange={(v: boolean) => update({ client_authentication: v })} />
                  <Label className="text-xs text-[var(--color-text-secondary)]">Client Authentication</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={sslData.certificate_verification || false} onCheckedChange={(v: boolean) => update({ certificate_verification: v })} />
                  <Label className="text-xs text-[var(--color-text-secondary)]">Certificate Verification</Label>
                </div>
              </div>
              <div>
                <Label className={styles.fieldLabel}>Allowed Protocols</Label>
                <div className="mt-1">
                  <StringArrayInput
                    value={sslData.allowed_protocols || []}
                    onChange={(v: string[]) => update({ allowed_protocols: v })}
                    placeholder="e.g. TLSv1.2, TLSv1.3"
                  />
                </div>
              </div>
              <div>
                <Label className={styles.fieldLabel}>Allowed Ciphers</Label>
                <div className="mt-1">
                  <StringArrayInput
                    value={sslData.allowed_ciphers || []}
                    onChange={(v: string[]) => update({ allowed_ciphers: v })}
                    placeholder="Add cipher suite..."
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {!sslEnabled && (
        <div className={styles.emptyState}>
          <Lock className="w-8 h-8 text-[var(--color-text-tertiary)]" />
          <p className="text-sm text-[var(--color-text-secondary)]">
            Enable SSL to configure certificate and encryption settings
          </p>
        </div>
      )}
    </div>
  )
}
