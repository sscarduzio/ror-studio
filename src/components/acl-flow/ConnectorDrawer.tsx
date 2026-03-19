import { Dialog as DialogPrimitive } from 'radix-ui'
import { X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { styles } from '@/components/shared-styles'
import { useConnectorCrud } from '@/hooks/useConnectorCrud'
import { EMPTY_LDAPS, EMPTY_JWTS, EMPTY_EXT_AUTHS, EMPTY_ROR_KBNS, EMPTY_PROXY_AUTHS, EMPTY_PROVIDERS } from '@/schema/empty-defaults'
import type { LdapConnector, JwtConfig, ExternalAuthenticationConfig, RorKbnConfig, ProxyAuthConfig, ExternalAuthorizationConfig } from '@/schema/types'

export interface ConnectorTarget {
  /** Config key: 'ldaps' | 'jwt' | 'ror_kbn' | 'proxy_auth_configs' | 'external_authentication_service_configs' */
  configKey: string
  /** Display type label */
  typeLabel: string
  /** Connector name to find by */
  name: string
}

interface ConnectorDrawerProps {
  target: ConnectorTarget | null
  onClose: () => void
  onNavigate?: (direction: 'up' | 'down') => void
}

// ── LDAP form (reuses same fields as AuthenticationTab.LdapSection) ──
function LdapForm({ index }: { index: number }) {
  const { items, update } = useConnectorCrud<LdapConnector>('ldaps', EMPTY_LDAPS)
  const ldap = items[index]
  if (!ldap) return null
  const u = (changes: Partial<LdapConnector>) => update(index, changes)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className={styles.fieldLabel}>Name</Label>
          <Input value={ldap.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => u({ name: e.target.value })} className="mt-1" />
        </div>
        <div>
          <Label className={styles.fieldLabel}>Host</Label>
          <Input value={ldap.host} onChange={(e: React.ChangeEvent<HTMLInputElement>) => u({ host: e.target.value })} className="mt-1" placeholder="ldap.example.com" />
        </div>
        <div>
          <Label className={styles.fieldLabel}>Port</Label>
          <Input type="number" value={ldap.port} onChange={(e: React.ChangeEvent<HTMLInputElement>) => u({ port: parseInt(e.target.value, 10) || 389 })} className="mt-1" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className={styles.fieldLabel}>Bind DN</Label>
          <Input value={ldap.bind_dn || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => u({ bind_dn: e.target.value })} className={styles.monoInput} placeholder="cn=admin,dc=example,dc=com" />
        </div>
        <div>
          <Label className={styles.fieldLabel}>Bind Password</Label>
          <Input type="password" value={ldap.bind_password || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => u({ bind_password: e.target.value })} className="mt-1" />
        </div>
      </div>
      <div>
        <Label className={styles.fieldLabel}>Search User Base DN</Label>
        <Input value={ldap.users.search_user_base_DN} onChange={(e: React.ChangeEvent<HTMLInputElement>) => u({ users: { ...ldap.users, search_user_base_DN: e.target.value } })} className={styles.monoInput} placeholder="ou=users,dc=example,dc=com" />
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch checked={ldap.ssl_enabled} onCheckedChange={(v) => u({ ssl_enabled: v })} />
          <Label className="text-xs text-[var(--color-text-secondary)]">SSL Enabled</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={ldap.ssl_trust_all_certs} onCheckedChange={(v) => u({ ssl_trust_all_certs: v })} />
          <Label className="text-xs text-[var(--color-text-secondary)]">Trust All Certs</Label>
        </div>
      </div>
    </div>
  )
}

// ── JWT form ──
function JwtForm({ index }: { index: number }) {
  const { items, update } = useConnectorCrud<JwtConfig>('jwt', EMPTY_JWTS)
  const jwt = items[index]
  if (!jwt) return null
  const u = (changes: Partial<JwtConfig>) => update(index, changes)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className={styles.fieldLabel}>Name</Label>
          <Input value={jwt.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => u({ name: e.target.value })} className="mt-1" />
        </div>
        <div>
          <Label className={styles.fieldLabel}>Signature Algorithm</Label>
          <select value={jwt.signature_algo || ''} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => u({ signature_algo: e.target.value as JwtConfig['signature_algo'] })} className={styles.select}>
            <option value="">Select...</option>
            <option value="HMAC">HMAC (default)</option>
            <option value="RSA">RSA</option>
            <option value="EC">EC</option>
            <option value="NONE">NONE</option>
          </select>
        </div>
      </div>
      <div>
        <Label className={styles.fieldLabel}>Signature Key</Label>
        <Input value={jwt.signature_key || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => u({ signature_key: e.target.value })} className={styles.monoInput} placeholder="Your signing key or public key" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className={styles.fieldLabel}>User Claim</Label>
          <Input value={jwt.user_claim || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => u({ user_claim: e.target.value })} className="mt-1" placeholder="sub" />
        </div>
        <div>
          <Label className={styles.fieldLabel}>Groups Claim</Label>
          <Input value={jwt.group_ids_claim || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => u({ group_ids_claim: e.target.value })} className="mt-1" placeholder="groups" />
        </div>
      </div>
    </div>
  )
}

// ── ROR KBN form ──
function RorKbnForm({ index }: { index: number }) {
  const { items, update } = useConnectorCrud<RorKbnConfig>('ror_kbn', EMPTY_ROR_KBNS)
  const rkbn = items[index]
  if (!rkbn) return null
  const u = (changes: Partial<RorKbnConfig>) => update(index, changes)

  return (
    <div className="space-y-4">
      <div>
        <Label className={styles.fieldLabel}>Name</Label>
        <Input value={rkbn.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => u({ name: e.target.value })} className="mt-1" />
      </div>
      <div>
        <Label className={styles.fieldLabel}>Signature Key</Label>
        <Input value={rkbn.signature_key || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => u({ signature_key: e.target.value })} className={styles.monoInput} />
      </div>
    </div>
  )
}

// ── Proxy Auth form ──
function ProxyAuthForm({ index }: { index: number }) {
  const { items, update } = useConnectorCrud<ProxyAuthConfig>('proxy_auth_configs', EMPTY_PROXY_AUTHS)
  const pa = items[index]
  if (!pa) return null
  const u = (changes: Partial<ProxyAuthConfig>) => update(index, changes)

  return (
    <div className="space-y-4">
      <div>
        <Label className={styles.fieldLabel}>Name</Label>
        <Input value={pa.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => u({ name: e.target.value })} className="mt-1" />
      </div>
      <div>
        <Label className={styles.fieldLabel}>User ID Header</Label>
        <Input value={pa.user_id_header} onChange={(e: React.ChangeEvent<HTMLInputElement>) => u({ user_id_header: e.target.value })} className={styles.monoInput} placeholder="X-Forwarded-User" />
      </div>
    </div>
  )
}

// ── External Auth form ──
function ExternalAuthForm({ index }: { index: number }) {
  const { items, update } = useConnectorCrud<ExternalAuthenticationConfig>('external_authentication_service_configs', EMPTY_EXT_AUTHS)
  const ea = items[index]
  if (!ea) return null
  const u = (changes: Partial<ExternalAuthenticationConfig>) => update(index, changes)

  return (
    <div className="space-y-4">
      <div>
        <Label className={styles.fieldLabel}>Name</Label>
        <Input value={ea.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => u({ name: e.target.value })} className="mt-1" />
      </div>
      <div>
        <Label className={styles.fieldLabel}>Authentication Endpoint</Label>
        <Input value={ea.authentication_endpoint} onChange={(e: React.ChangeEvent<HTMLInputElement>) => u({ authentication_endpoint: e.target.value })} className={styles.monoInput} placeholder="https://auth.example.com/verify" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className={styles.fieldLabel}>Success Status Code</Label>
          <Input type="number" value={ea.success_status_code} onChange={(e: React.ChangeEvent<HTMLInputElement>) => u({ success_status_code: parseInt(e.target.value, 10) || 200 })} className="mt-1" />
        </div>
        <div>
          <Label className={styles.fieldLabel}>Cache TTL (seconds)</Label>
          <Input type="number" value={ea.cache_ttl_in_sec ?? ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => u({ cache_ttl_in_sec: parseInt(e.target.value, 10) || undefined })} className="mt-1" placeholder="60" />
        </div>
      </div>
    </div>
  )
}

// ── Groups Provider form ──
function GroupsProviderForm({ index }: { index: number }) {
  const { items, update } = useConnectorCrud<ExternalAuthorizationConfig>('user_groups_providers', EMPTY_PROVIDERS)
  const gp = items[index]
  if (!gp) return null
  const u = (changes: Partial<ExternalAuthorizationConfig>) => update(index, changes)

  return (
    <div className="space-y-4">
      <div>
        <Label className={styles.fieldLabel}>Name</Label>
        <Input value={gp.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => u({ name: e.target.value })} className="mt-1" />
      </div>
      <div>
        <Label className={styles.fieldLabel}>Groups Endpoint</Label>
        <Input value={gp.groups_endpoint} onChange={(e: React.ChangeEvent<HTMLInputElement>) => u({ groups_endpoint: e.target.value })} className={styles.monoInput} placeholder="https://authz.example.com/groups" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className={styles.fieldLabel}>Auth Token Name</Label>
          <Input value={gp.auth_token_name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => u({ auth_token_name: e.target.value })} className="mt-1" placeholder="token" />
        </div>
        <div>
          <Label className={styles.fieldLabel}>Token Passed As</Label>
          <select value={gp.auth_token_passed_as || 'HEADER'} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => u({ auth_token_passed_as: e.target.value as 'HEADER' | 'QUERY_PARAM' })} className={styles.select}>
            <option value="HEADER">Header</option>
            <option value="QUERY_PARAM">Query Param</option>
          </select>
        </div>
      </div>
    </div>
  )
}

// ── Config key → form component mapping ──
const CONNECTOR_FORMS: Record<string, React.ComponentType<{ index: number }>> = {
  ldaps: LdapForm,
  jwt: JwtForm,
  ror_kbn: RorKbnForm,
  proxy_auth_configs: ProxyAuthForm,
  external_authentication_service_configs: ExternalAuthForm,
  user_groups_providers: GroupsProviderForm,
}

// ── Color palette per connector type ──
const CONNECTOR_COLORS: Record<string, { bg: string; border: string }> = {
  LDAP: { bg: 'bg-amber-50', border: 'border-amber-200' },
  JWT: { bg: 'bg-blue-50', border: 'border-blue-200' },
  'ROR KBN': { bg: 'bg-purple-50', border: 'border-purple-200' },
  'Proxy Auth': { bg: 'bg-slate-50', border: 'border-slate-200' },
  'Ext Auth': { bg: 'bg-orange-50', border: 'border-orange-200' },
  Groups: { bg: 'bg-teal-50', border: 'border-teal-200' },
}

/** Map graph connector type label → config key */
const TYPE_TO_CONFIG_KEY: Record<string, string> = {
  LDAP: 'ldaps',
  JWT: 'jwt',
  'ROR KBN': 'ror_kbn',
  'Proxy Auth': 'proxy_auth_configs',
  'Ext Auth': 'external_authentication_service_configs',
  Groups: 'user_groups_providers',
}

export function ConnectorDrawer({ target, onClose, onNavigate }: ConnectorDrawerProps) {
  if (!target) return null

  const configKey = TYPE_TO_CONFIG_KEY[target.typeLabel] || target.configKey
  const FormComponent = CONNECTOR_FORMS[configKey]
  const colors = CONNECTOR_COLORS[target.typeLabel] || { bg: 'bg-slate-50', border: 'border-slate-200' }

  return (
    <DialogPrimitive.Root open={!!target} onOpenChange={(open) => { if (!open) onClose() }} modal={false}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          className="fixed right-0 top-0 bottom-0 z-50 w-[480px] max-w-[90vw] bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200"
          onEscapeKeyDown={onClose}
          onKeyDown={(e) => {
            if (!onNavigate) return
            if (e.key === 'ArrowUp') { e.preventDefault(); onNavigate('up') }
            if (e.key === 'ArrowDown') { e.preventDefault(); onNavigate('down') }
          }}
        >
          {/* Header */}
          <div className={`flex items-center gap-3 px-5 py-3.5 border-b ${colors.bg} ${colors.border}`}>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{target.typeLabel} Connector</div>
              <div className="text-sm font-bold text-slate-900 mt-0.5">{target.name}</div>
            </div>
            <DialogPrimitive.Close asChild>
              <button className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </DialogPrimitive.Close>
          </div>

          {/* Form body */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {FormComponent ? (
              <ConnectorFormByName configKey={configKey} name={target.name} FormComponent={FormComponent} />
            ) : (
              <div className="text-center py-8 text-sm text-slate-400">
                No editor available for this connector type.
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

/** Resolves connector name → array index and renders the form */
function ConnectorFormByName({ configKey, name, FormComponent }: {
  configKey: string
  name: string
  FormComponent: React.ComponentType<{ index: number }>
}) {
  const items = useConnectorCrud<{ name: string }>(configKey, []).items
  const index = items.findIndex((item) => item.name === name)
  if (index === -1) {
    return <div className="text-center py-8 text-sm text-slate-400">Connector "{name}" not found.</div>
  }
  return <FormComponent index={index} />
}
