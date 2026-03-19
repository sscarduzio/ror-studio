import { Info, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { styles } from '@/components/shared-styles'
import { useConnectorCrud } from '@/hooks/useConnectorCrud'
import { ReturnBanner } from '@/components/layout/ReturnBanner'
import { EMPTY_LDAPS, EMPTY_JWTS, EMPTY_EXT_AUTHS, EMPTY_ROR_KBNS, EMPTY_PROXY_AUTHS } from '@/schema/empty-defaults'
import type { LdapConnector, JwtConfig, ExternalAuthenticationConfig, RorKbnConfig, ProxyAuthConfig } from '@/schema/types'

function LdapSection() {
  const { items: ldaps, add: addLdapItem, update: updateLdap, remove: removeLdap } = useConnectorCrud<LdapConnector>('ldaps', EMPTY_LDAPS)

  const addLdap = () => {
    addLdapItem({
      name: `ldap_${ldaps.length + 1}`,
      host: '',
      port: 389,
      ssl_enabled: false,
      ssl_trust_all_certs: false,
      users: { search_user_base_DN: '' },
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className={styles.sectionTitle}>LDAP Connectors</h3>
        <Button size="sm" variant="outline" onClick={addLdap} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          Add LDAP
        </Button>
      </div>
      {ldaps.map((ldap, i) => (
        <div key={i} className={styles.cardWithSpaceTight}>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className={styles.fieldLabel}>Name</Label>
              <Input value={ldap.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateLdap(i, { name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className={styles.fieldLabel}>Host</Label>
              <Input value={ldap.host} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateLdap(i, { host: e.target.value })} className="mt-1" placeholder="ldap.example.com" />
            </div>
            <div>
              <Label className={styles.fieldLabel}>Port</Label>
              <Input type="number" value={ldap.port} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateLdap(i, { port: parseInt(e.target.value, 10) || 389 })} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className={styles.fieldLabel}>Bind DN</Label>
              <Input value={ldap.bind_dn || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateLdap(i, { bind_dn: e.target.value })} className={styles.monoInput} placeholder="cn=admin,dc=example,dc=com" />
            </div>
            <div>
              <Label className={styles.fieldLabel}>Bind Password</Label>
              <Input type="password" value={ldap.bind_password || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateLdap(i, { bind_password: e.target.value })} className="mt-1" />
            </div>
          </div>
          <div>
            <Label className={styles.fieldLabel}>Search User Base DN</Label>
            <Input value={ldap.users.search_user_base_DN} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateLdap(i, { users: { ...ldap.users, search_user_base_DN: e.target.value } })} className={styles.monoInput} placeholder="ou=users,dc=example,dc=com" />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={ldap.ssl_enabled} onCheckedChange={(v) => updateLdap(i, { ssl_enabled: v })} />
              <Label className="text-xs text-[var(--color-text-secondary)]">SSL Enabled</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={ldap.ssl_trust_all_certs} onCheckedChange={(v) => updateLdap(i, { ssl_trust_all_certs: v })} />
              <Label className="text-xs text-[var(--color-text-secondary)]">Trust All Certs</Label>
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => removeLdap(i)} className={styles.removeButton}>
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Remove
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

function JwtSection() {
  const { items: jwts, add: addJwtItem, update: updateJwt, remove: removeJwt } = useConnectorCrud<JwtConfig>('jwt', EMPTY_JWTS)

  const addJwt = () => {
    addJwtItem({ name: `jwt_${jwts.length + 1}`, signature_key: '' })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className={styles.sectionTitle}>JWT Configurations</h3>
        <Button size="sm" variant="outline" onClick={addJwt} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          Add JWT
        </Button>
      </div>
      {jwts.map((jwt, i) => (
        <div key={i} className={styles.cardWithSpaceTight}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className={styles.fieldLabel}>Name</Label>
              <Input value={jwt.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateJwt(i, { name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className={styles.fieldLabel}>Signature Algorithm</Label>
              <select
                value={jwt.signature_algo || ''}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateJwt(i, { signature_algo: e.target.value as JwtConfig['signature_algo'] })}
                className={styles.select}
              >
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
            <Input value={jwt.signature_key || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateJwt(i, { signature_key: e.target.value })} className={styles.monoInput} placeholder="Your signing key or public key" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className={styles.fieldLabel}>User Claim</Label>
              <Input value={jwt.user_claim || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateJwt(i, { user_claim: e.target.value })} className="mt-1" placeholder="sub" />
            </div>
            <div>
              <Label className={styles.fieldLabel}>Groups Claim</Label>
              <Input value={jwt.group_ids_claim || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateJwt(i, { group_ids_claim: e.target.value })} className="mt-1" placeholder="groups" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => removeJwt(i)} className={styles.removeButton}>
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Remove
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

function ExternalAuthSection() {
  const { items: extAuths, add: addExtAuthItem, update: updateExtAuth, remove: removeExtAuth } = useConnectorCrud<ExternalAuthenticationConfig>('external_authentication_service_configs', EMPTY_EXT_AUTHS)

  const addExtAuth = () => {
    addExtAuthItem({
      name: `ext_${extAuths.length + 1}`,
      authentication_endpoint: '',
      success_status_code: 200,
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className={styles.sectionTitle}>External Authentication Services</h3>
        <Button size="sm" variant="outline" onClick={addExtAuth} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          Add External Auth
        </Button>
      </div>
      {extAuths.map((ext, i) => (
        <div key={i} className={styles.cardWithSpaceTight}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className={styles.fieldLabel}>Name</Label>
              <Input value={ext.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateExtAuth(i, { name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className={styles.fieldLabel}>Authentication Endpoint</Label>
              <Input value={ext.authentication_endpoint} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateExtAuth(i, { authentication_endpoint: e.target.value })} className={styles.monoInput} placeholder="https://auth.example.com/verify" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className={styles.fieldLabel}>Success Status Code</Label>
              <Input type="number" value={ext.success_status_code} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateExtAuth(i, { success_status_code: parseInt(e.target.value, 10) || 200 })} className="mt-1" />
            </div>
            <div>
              <Label className={styles.fieldLabel}>Cache TTL (seconds)</Label>
              <Input type="number" value={ext.cache_ttl_in_sec ?? ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateExtAuth(i, { cache_ttl_in_sec: e.target.value ? parseInt(e.target.value, 10) : undefined })} className="mt-1" placeholder="Optional" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => removeExtAuth(i)} className={styles.removeButton}>
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Remove
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

function RorKbnSection() {
  const { items: rorKbns, add: addRorKbnItem, update: updateRorKbn, remove: removeRorKbn } = useConnectorCrud<RorKbnConfig>('ror_kbn', EMPTY_ROR_KBNS)

  const addRorKbn = () => {
    addRorKbnItem({
      name: `ror_kbn_${rorKbns.length + 1}`,
      signature_key: '',
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className={styles.sectionTitle}>
          ROR KBN / SAML
          <span className={`ml-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none ${styles.tierBadge.ent}`}>
            Enterprise
          </span>
        </h3>
        <Button size="sm" variant="outline" onClick={addRorKbn} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          Add ROR KBN
        </Button>
      </div>
      {rorKbns.map((rkbn, i) => (
        <div key={i} className={styles.cardWithSpaceTight}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className={styles.fieldLabel}>Name</Label>
              <Input value={rkbn.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateRorKbn(i, { name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className={styles.fieldLabel}>Signature Key</Label>
              <Input value={rkbn.signature_key} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateRorKbn(i, { signature_key: e.target.value })} className={styles.monoInput} placeholder="Your signing key" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => removeRorKbn(i)} className={styles.removeButton}>
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Remove
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

function ProxyAuthSection() {
  const { items: configs, add: addConfig, update: updateConfig, remove: removeConfig } = useConnectorCrud<ProxyAuthConfig>('proxy_auth_configs', EMPTY_PROXY_AUTHS)

  const addProxyAuth = () => {
    addConfig({ name: `proxy_${configs.length + 1}`, user_id_header: 'X-Forwarded-User' })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className={styles.sectionTitle}>Proxy Authentication</h3>
        <Button size="sm" variant="outline" onClick={addProxyAuth} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          Add Proxy Auth Config
        </Button>
      </div>
      <div className={styles.cardWithSpaceTight}>
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 mt-0.5 shrink-0 text-[var(--color-text-tertiary)]" />
          <p className="text-xs text-[var(--color-text-secondary)]">
            Use <code className={styles.codeInline}>proxy_auth: "*"</code> in ACL rules to accept any user from the default header (<code className={styles.codeInline}>X-Forwarded-User</code>).
            Define a named config below to customize which header to read.
          </p>
        </div>
      </div>
      {configs.map((cfg, i) => (
        <div key={i} className={styles.cardWithSpaceTight}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className={styles.fieldLabel}>Name</Label>
              <Input value={cfg.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateConfig(i, { name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className={styles.fieldLabel}>User ID Header</Label>
              <Input value={cfg.user_id_header} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateConfig(i, { user_id_header: e.target.value })} className={styles.monoInput} placeholder="X-Forwarded-User" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => removeConfig(i)} className={styles.removeButton}>
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Remove
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

export function AuthenticationTab() {
  return (
    <div className={styles.pageContainerWide}>
      <ReturnBanner />
      <div>
        <h2 className={styles.pageTitle}>
          Authentication
        </h2>
        <p className={styles.pageSubtitle}>
          Configure authentication connectors: LDAP, JWT, SAML, proxy auth, and more
        </p>
      </div>

      <LdapSection />
      <JwtSection />

      <ExternalAuthSection />
      <RorKbnSection />
      <ProxyAuthSection />
    </div>
  )
}
