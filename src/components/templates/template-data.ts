import { Shield, Layers, GitMerge, Zap, Users } from 'lucide-react'
import type { Edition, RorConfig } from '@/schema/types'

export interface TemplateDef {
  id: string
  title: string
  description: string
  longDescription: string
  tier: Edition
  icon: React.ComponentType<{ className?: string }>
  buildConfig: () => RorConfig
}

function buildBasicAuthConfig(): RorConfig {
  return {
    access_control_rules: [
      {
        id: crypto.randomUUID(),
        name: 'Admin Full Access',
        type: 'allow',
        enabled: true,
        rules: [
          { type: 'auth_key', value: 'admin:admin123' },
        ],
      },
      {
        id: crypto.randomUUID(),
        name: 'Read-Only Users',
        type: 'allow',
        enabled: true,
        rules: [
          { type: 'auth_key', value: 'viewer:viewer123' },
          { type: 'indices', value: ['logstash-*', 'filebeat-*'] },
          { type: 'actions', value: ['indices:data/read/*'] },
        ],
      },
    ],
  }
}

function buildMultiTenantConfig(): RorConfig {
  return {
    access_control_rules: [
      {
        id: crypto.randomUUID(),
        name: 'Team Alpha',
        type: 'allow',
        enabled: true,
        rules: [
          { type: 'auth_key_sha256', value: 'e796dbbf06a7e66e49a8884d29a510a89a3d tried_placeholder_hash' },
          { type: 'groups', value: ['team_alpha'] },
          { type: 'kibana', value: { access: 'rw', index: '.kibana_team_alpha' } },
          { type: 'indices', value: ['alpha-*'] },
        ],
      },
      {
        id: crypto.randomUUID(),
        name: 'Team Beta',
        type: 'allow',
        enabled: true,
        rules: [
          { type: 'auth_key_sha256', value: 'a1b2c3d4e5f6placeholder_hash_for_team_beta' },
          { type: 'groups', value: ['team_beta'] },
          { type: 'kibana', value: { access: 'rw', index: '.kibana_team_beta' } },
          { type: 'indices', value: ['beta-*'] },
        ],
      },
      {
        id: crypto.randomUUID(),
        name: 'Admin',
        type: 'allow',
        enabled: true,
        rules: [
          { type: 'auth_key', value: 'admin:admin123' },
        ],
      },
    ],
    users: [
      {
        username: 'alpha_user',
        auth_key: 'alpha_user:changeme',
        groups: ['team_alpha'],
      },
      {
        username: 'beta_user',
        auth_key: 'beta_user:changeme',
        groups: ['team_beta'],
      },
    ],
  }
}

function buildLdapAuthConfig(): RorConfig {
  return {
    access_control_rules: [
      {
        id: crypto.randomUUID(),
        name: 'LDAP Admin Group',
        type: 'allow',
        enabled: true,
        rules: [
          {
            type: 'ldap_auth',
            value: {
              name: 'ldap1',
              groups_any_of: ['cn=admins,ou=Groups,dc=example,dc=com'],
            },
          },
        ],
      },
      {
        id: crypto.randomUUID(),
        name: 'LDAP Dev Group',
        type: 'allow',
        enabled: true,
        rules: [
          {
            type: 'ldap_auth',
            value: {
              name: 'ldap1',
              groups_any_of: ['cn=developers,ou=Groups,dc=example,dc=com'],
            },
          },
          { type: 'indices', value: ['dev-*', 'staging-*'] },
        ],
      },
    ],
    ldaps: [
      {
        name: 'ldap1',
        host: 'ldap.example.com',
        port: 636,
        ssl_enabled: true,
        bind_dn: 'cn=admin,dc=example,dc=com',
        bind_password: 'changeme',
        users: {
          search_user_base_DN: 'ou=People,dc=example,dc=com',
        },
        groups: {
          search_groups_base_DN: 'ou=Groups,dc=example,dc=com',
        },
      },
    ],
  }
}

function buildJwtSsoConfig(): RorConfig {
  return {
    access_control_rules: [
      {
        id: crypto.randomUUID(),
        name: 'JWT Admin',
        type: 'allow',
        enabled: true,
        rules: [
          {
            type: 'jwt_auth',
            value: {
              name: 'jwt1',
              roles: ['admin'],
            },
          },
        ],
      },
      {
        id: crypto.randomUUID(),
        name: 'JWT Users',
        type: 'allow',
        enabled: true,
        rules: [
          {
            type: 'jwt_auth',
            value: {
              name: 'jwt1',
              roles: ['users'],
            },
          },
          { type: 'indices', value: ['app-*'] },
          { type: 'actions', value: ['indices:data/read/*', 'indices:data/write/*'] },
        ],
      },
    ],
    jwt: [
      {
        name: 'jwt1',
        signature_algo: 'RSA',
        signature_key: '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA... (replace with your RSA public key)\n-----END PUBLIC KEY-----',
        user_claim: 'sub',
        group_ids_claim: 'groups',
      },
    ],
  }
}

function buildReadOnlyPublicConfig(): RorConfig {
  return {
    access_control_rules: [
      {
        id: crypto.randomUUID(),
        name: 'Admin Access',
        type: 'allow',
        enabled: true,
        rules: [
          { type: 'auth_key', value: 'admin:admin123' },
        ],
      },
      {
        id: crypto.randomUUID(),
        name: 'Public Read-Only',
        type: 'allow',
        enabled: true,
        rules: [
          { type: 'indices', value: ['public-*'] },
          { type: 'actions', value: ['indices:data/read/*'] },
        ],
      },
      {
        id: crypto.randomUUID(),
        name: 'Deny Everything Else',
        type: 'forbid',
        enabled: true,
        rules: [],
      },
    ],
  }
}

function buildLdapGroupMappingConfig(): RorConfig {
  return {
    access_control_rules: [
      {
        id: crypto.randomUUID(),
        name: 'Admin Team',
        type: 'allow',
        enabled: true,
        rules: [
          { type: 'groups_any_of', value: ['admins'] },
        ],
      },
      {
        id: crypto.randomUUID(),
        name: 'DevOps — Full Infra Access',
        type: 'allow',
        enabled: true,
        rules: [
          { type: 'groups_any_of', value: ['devops'] },
          { type: 'indices', value: ['infra-*', 'logs-*', 'metrics-*'] },
        ],
      },
      {
        id: crypto.randomUUID(),
        name: 'Developers — App Indices',
        type: 'allow',
        enabled: true,
        rules: [
          { type: 'groups_any_of', value: ['developers'] },
          { type: 'indices', value: ['app-*', 'dev-*', 'staging-*'] },
          { type: 'actions', value: ['indices:data/read/*', 'indices:data/write/*'] },
        ],
      },
      {
        id: crypto.randomUUID(),
        name: 'Analysts — Read-Only',
        type: 'allow',
        enabled: true,
        rules: [
          { type: 'groups_any_of', value: ['analysts'] },
          { type: 'indices', value: ['reports-*', 'analytics-*'] },
          { type: 'actions', value: ['indices:data/read/*'] },
        ],
      },
    ],
    users: [
      {
        username: 'admin',
        auth_key: 'admin:changeme',
        groups: ['admins'],
      },
      {
        username: '*',
        ldap_auth: {
          name: 'ldap1',
          groups_any_of: ['cn=admins,ou=Groups,dc=example,dc=com'],
        },
        groups: ['admins'],
      },
      {
        username: '*',
        ldap_auth: {
          name: 'ldap1',
          groups_any_of: ['cn=devops,ou=Groups,dc=example,dc=com'],
        },
        groups: ['devops'],
      },
      {
        username: '*',
        ldap_auth: {
          name: 'ldap1',
          groups_any_of: ['cn=developers,ou=Groups,dc=example,dc=com'],
        },
        groups: ['developers'],
      },
      {
        username: '*',
        ldap_auth: {
          name: 'ldap1',
          groups_any_of: ['cn=analysts,ou=Groups,dc=example,dc=com'],
        },
        groups: ['analysts'],
      },
    ],
    ldaps: [
      {
        name: 'ldap1',
        host: 'ldap.example.com',
        port: 636,
        ssl_enabled: true,
        ssl_trust_all_certs: false,
        bind_dn: 'cn=admin,dc=example,dc=com',
        bind_password: 'changeme',
        users: {
          search_user_base_DN: 'ou=People,dc=example,dc=com',
        },
        groups: {
          search_groups_base_DN: 'ou=Groups,dc=example,dc=com',
        },
      },
    ],
  }
}

export const templates: TemplateDef[] = [
  {
    id: 'basic-auth',
    title: 'Basic Auth \u2014 Admin + Read-only',
    description: 'Admin with full access and a read-only viewer account',
    longDescription:
      'Sets up two access control blocks: an admin account with unrestricted access, and a read-only viewer limited to logstash and filebeat indices. A good starting point for simple deployments.',
    tier: 'free',
    icon: Shield,
    buildConfig: buildBasicAuthConfig,
  },
  {
    id: 'multi-tenant',
    title: 'Multi-tenant Kibana',
    description: 'Separate Kibana spaces and indices per team',
    longDescription:
      'Creates isolated tenants for two teams (Alpha and Beta), each with their own Kibana index and data indices. Includes an admin block with full access and user definitions mapped to team groups.',
    tier: 'pro',
    icon: Layers,
    buildConfig: buildMultiTenantConfig,
  },
  {
    id: 'ldap-auth',
    title: 'LDAP Authentication',
    description: 'Authenticate and authorize via LDAP directory',
    longDescription:
      'Configures an LDAP connector with SSL pointing to your directory server. Admin and developer groups get different index access levels. Update the LDAP host, bind credentials, and base DNs to match your environment.',
    tier: 'pro',
    icon: GitMerge,
    buildConfig: buildLdapAuthConfig,
  },
  {
    id: 'ldap-group-mapping',
    title: 'LDAP Group Mapping',
    description: 'Map LDAP groups to local roles with per-team access',
    longDescription:
      'Maps external LDAP groups (cn=admins, cn=devops, cn=developers, cn=analysts) to local ReadOnlyREST groups. Each local group gets its own ACL block with tailored index and action permissions. Includes a local admin fallback user. This is the recommended pattern for organizations using LDAP — ACL blocks reference simple local group names while the users section handles the LDAP-to-local mapping.',
    tier: 'pro',
    icon: Users,
    buildConfig: buildLdapGroupMappingConfig,
  },
  {
    id: 'jwt-sso',
    title: 'JWT / SSO Integration',
    description: 'Single sign-on with JSON Web Tokens',
    longDescription:
      'Configures a JWT connector using RSA signature verification. Admin and regular user roles receive different access levels. Replace the placeholder public key with your identity provider\'s actual RSA public key.',
    tier: 'enterprise',
    icon: Zap,
    buildConfig: buildJwtSsoConfig,
  },
  {
    id: 'read-only-public',
    title: 'Read-only Public + Protected Admin',
    description: 'Public read access to selected indices with admin override',
    longDescription:
      'Provides unauthenticated read-only access to public indices, a password-protected admin account with full access, and a catch-all deny block that rejects everything else. Ideal for exposing public dashboards.',
    tier: 'free',
    icon: Shield,
    buildConfig: buildReadOnlyPublicConfig,
  },
]
