# ACL Bible — ReadOnlyREST ACL Model Reference

> **Source of truth**: Derived from the ROR plugin source code (`develop` branch at `/tmp/ror-plugin`).
> This document supersedes the public documentation wherever discrepancies exist.

---

## 1. ACL Evaluation Algorithm

### Block-Level: First-Match-Wins

The ACL engine evaluates blocks sequentially (top to bottom). For each incoming request:

1. **foldLeft** across all blocks, stopping at the first `Permitted` or `ForbiddenBy` result.
2. If a block **matches** (all rules pass):
   - `policy: allow` → **Permitted** (stop, request allowed)
   - `policy: forbid` → **ForbiddenBy** (stop, request denied; optional `response_message`)
3. If a block does **not match** → continue to next block.
4. If no block matches → **Forbidden** (implicit deny).

### Rule-Level: AND Semantics (Within a Block)

All rules in a block must pass for the block to match:

- Rules are evaluated in a defined order (see §2: Rule Auto-Ordering).
- **Short-circuit on first failure**: if any rule returns `RuleResult.Rejected`, the block is immediately skipped.
- There is no OR logic between rules in a block. To express OR, use separate blocks.

### Block Properties

| Property | Values | Default | Description |
|----------|--------|---------|-------------|
| `name` | string | *required* | Unique block identifier |
| `policy` | `allow`, `forbid` | `allow` | What happens when block matches |
| `verbosity` | `info`, `error` | `info` | Log level for non-matching requests |
| `response_message` | string | — | Custom 403 message (forbid blocks only) |

**YAML syntax for forbid with message**:
```yaml
- name: "Block sensitive"
  type:
    policy: forbid
    response_message: "Access denied to sensitive data"
  indices: ["sensitive-*"]
```

---

## 2. Rule Auto-Ordering

Rules within a block are **automatically re-ordered** before evaluation, regardless of YAML order:

| Phase | Rule Category | Reason |
|-------|--------------|--------|
| 1 | **Authentication** | Must set `loggedUser` first |
| 2 | **Authorization / Groups** | Needs `loggedUser` to check membership |
| 3 | **Inspection** (hosts, methods, actions, headers, etc.) | Check request properties |
| 4 | **`indices`** | Last, to distinguish index-not-found from auth failures |
| 5 | **Search-time** (filter, fields, response_fields) | Applied at query execution, not during ACL eval |

This means users can write rules in any order in YAML — the engine reorders them internally.

---

## 3. Complete Rule Name Registry

Every rule name exactly as defined in `Rule.Name(...)` in the source code.

### Authentication Rules (Set Logged User)

| Rule Name | Description | Tier |
|-----------|-------------|------|
| `auth_key` | HTTP Basic Auth, plaintext | Free |
| `auth_key_sha1` | HTTP Basic Auth, SHA1 hash | Free |
| `auth_key_sha256` | HTTP Basic Auth, SHA256 hash | Free |
| `auth_key_sha512` | HTTP Basic Auth, SHA512 hash | Free |
| `auth_key_pbkdf2` | HTTP Basic Auth, PBKDF2 hash | Free |
| `auth_key_unix` | HTTP Basic Auth, Unix shadow format | Free |
| `proxy_auth` | Reverse proxy header authentication | Free |
| `token_authentication` | Static token from configurable header | Free |
| `external_authentication` | External HTTP service authentication | Free |
| `ldap_authentication` | LDAP directory authentication | Free |
| `jwt_authentication` | JWT token validation | Free |
| `ror_kbn_authentication` | ROR Kibana plugin (SAML) authentication | Enterprise |

### Combined Auth + Authz Rules

| Rule Name | Description | Tier |
|-----------|-------------|------|
| `ldap_auth` | Combined LDAP authentication + group check | Free |
| `jwt_auth` | Combined JWT authentication + group check | Free |
| `ror_kbn_auth` | Combined ROR KBN authentication + group check | Enterprise |

### Authorization Rules (Check Groups)

| Rule Name | Description | Tier |
|-----------|-------------|------|
| `ldap_authorization` | LDAP group membership check | Free |
| `jwt_authorization` | JWT group claims check | Free |
| `ror_kbn_authorization` | ROR KBN group check | Enterprise |
| `groups_provider_authorization` | External groups provider check | Free |
| `external_authorization` | Alias for `groups_provider_authorization` | Free |

### Groups Rules (with Aliases)

| Canonical Name | Aliases | Logic |
|---------------|---------|-------|
| `groups_any_of` | `groups`, `any_of`, `groups_or`, `roles` | User in ANY listed group (OR) |
| `groups_all_of` | `all_of`, `groups_and`, `roles_and` | User in ALL listed groups (AND) |
| `groups_not_any_of` | `not_any_of` | User in NONE of listed groups |
| `groups_not_all_of` | `not_all_of` | User NOT in all listed groups |
| `groups_combined` | — | Composite with sub-fields |

### Kibana Rules

| Rule Name | Description | Notes |
|-----------|-------------|-------|
| `kibana` | **Composite rule** (KibanaUserDataRule) | New: combines access, index, hide_apps, template_index |
| `kibana_access` | Access level (ro, rw, admin, etc.) | Legacy, separate |
| `kibana_index` | Custom Kibana index | Legacy, separate |
| `kibana_hide_apps` | Hide Kibana apps | Legacy, separate |
| `kibana_template_index` | Template index pattern | Legacy, separate |

### HTTP / Transport Rules

| Rule Name | Alias | Description |
|-----------|-------|-------------|
| `actions` | — | ES action patterns (e.g. `indices:data/read/*`) |
| `methods` | — | HTTP methods (GET, POST, etc.) |
| `headers_and` | `headers` | ALL headers must match |
| `headers_or` | — | ANY header must match |
| `uri_re` | — | URI regex patterns |
| `max_body_length` | — | Max request body bytes |
| `api_keys` | — | X-Api-Key header values |
| `x_forwarded_for` | — | X-Forwarded-For IP matching |
| `hosts` | — | Source IP / CIDR matching |
| `hosts_local` | — | Destination IP / CIDR matching |
| `session_max_idle` | — | Browser session timeout (deprecated) |

### Elasticsearch Rules

| Rule Name | Description |
|-----------|-------------|
| `indices` | Index/alias/data stream access control |
| `filter` | Document Level Security (DLS) — bool query |
| `fields` | Field Level Security (FLS) — whitelist/blacklist |
| `response_fields` | Response field filtering |
| `data_streams` | Data stream access control |
| `snapshots` | Snapshot name patterns |
| `repositories` | Repository name patterns |

### Other

| Rule Name | Description |
|-----------|-------------|
| `users` | Username pattern matching |
| `response_headers` | Add custom response headers |

---

## 4. Top-Level Config Keys

```yaml
readonlyrest:
  enable: boolean                                    # Enable/disable the plugin
  access_control_rules: [...]                        # ACL blocks
  users: [...]                                       # User definitions with groups
  ldaps: [...]                                       # LDAP connectors
  jwt: [...]                                         # JWT connectors
  ror_kbn: [...]                                     # ROR Kibana connectors
  proxy_auth_configs: [...]                          # Proxy auth header configs
  external_authentication_service_configs: [...]     # External auth services
  user_groups_providers: [...]                       # External groups providers
  # alias: external_groups_provider_service_configs
  impersonation: [...]                               # Impersonation rules (Enterprise)
  audit: {...}                                       # Audit logging config
  ssl: {...}                                         # SSL/TLS config
  ssl_internode: {...}                               # Inter-node SSL config
  global_settings: {...}                             # Global settings
  obfuscated_headers: [...]                          # Headers to obfuscate in logs
```

---

## 5. LDAP Connector Structure

### Canonical (Nested) Format

```yaml
ldaps:
  - name: ldap1
    host: localhost
    port: 389
    ssl_enabled: false
    bind_dn: "cn=admin,dc=example,dc=com"
    bind_password: "password"
    users:
      search_user_base_DN: "ou=People,dc=example,dc=com"
      user_id_attribute: "uid"
    groups:
      search_groups_base_DN: "ou=Groups,dc=example,dc=com"
      unique_member_attribute: "uniqueMember"
```

### Flat Format (Also Accepted)

```yaml
ldaps:
  - name: ldap1
    host: localhost
    port: 389
    search_user_base_DN: "ou=People,dc=example,dc=com"
    search_groups_base_DN: "ou=Groups,dc=example,dc=com"
```

Both are valid. Nested is canonical.

### Full LDAP Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `name` | string | *required* | Connector identifier |
| `host` | string | — | Single host |
| `hosts` | string[] | — | Multiple hosts (HA) |
| `ha` | enum | — | `FAILOVER` or `ROUND_ROBIN` |
| `port` | integer | 389 | LDAP port |
| `ssl_enabled` | boolean | false | Use LDAPS |
| `ssl_trust_all_certs` | boolean | false | Skip cert verification |
| `bind_dn` | string | — | Bind DN for search |
| `bind_password` | string | — | Bind password |
| `connection_pool_size` | integer | — | Pool size |
| `connection_timeout` | duration | — | Connect timeout |
| `request_timeout` | duration | — | Request timeout |
| `cache_ttl` | duration | — | Cache TTL |
| `ignore_ldap_connectivity_problems` | boolean | false | Treat LDAP errors as rule non-match |
| `server_discovery` | boolean/object | — | DNS SRV discovery |
| `circuit_breaker.max_retries` | integer | — | Max retries before open |
| `circuit_breaker.reset_duration` | duration | — | Time before half-open |
| `users.search_user_base_DN` | string | *required* | Base DN for user search |
| `users.user_id_attribute` | string | `uid` | User ID attribute |
| `users.skip_user_search` | boolean | false | Skip user search |
| `groups.search_groups_base_DN` | string | — | Base DN for group search |
| `groups.unique_member_attribute` | string | `uniqueMember` | Member attribute |
| `groups.group_name_attribute` | string | `cn` | Group name attribute |
| `groups.group_id_attribute` | string | — | Group ID attribute |
| `groups.group_search_filter` | string | — | Custom LDAP filter |
| `groups.group_attribute_is_dn` | boolean | — | Member attr contains DN |
| `groups.server_side_groups_filtering` | boolean | — | Server-side filter |
| `groups.nested_groups_depth` | integer | — | Nested group traversal depth |
| `groups.groups_from_user_attribute` | string | — | Read groups from user attribute |

---

## 6. Validation Rules (from Source)

### Block-Level Validation

| Rule | Severity | Description |
|------|----------|-------------|
| Block must have `name` | Error | Name is required and must be non-empty |
| Block must have ≥1 rule | Error | Empty blocks are catch-alls (match everything) |
| Duplicate block names | Error | All block names must be unique |
| Authorization without authentication | Error | A block with an authorization rule must also have an authentication rule |
| Multiple authentication rules | Error | A block cannot have more than one authentication rule |

### Connector Reference Validation

| Rule | Severity | Description |
|------|----------|-------------|
| LDAP rule → undefined connector | Error | `ldap_auth`, `ldap_authentication`, `ldap_authorization` must reference a defined LDAP |
| JWT rule → undefined connector | Error | `jwt_auth`, `jwt_authentication`, `jwt_authorization` must reference a defined JWT |
| ROR KBN rule → undefined connector | Error | `ror_kbn_*` rules must reference a defined ROR KBN connector |
| External auth → undefined service | Error | `external_authentication` must reference a defined service |
| Groups provider → undefined provider | Error | `groups_provider_authorization` must reference a defined provider |

---

## 7. Incompatible Rule Combinations

The following rule combinations within a single block produce validation errors:

| Rule A | Rule B | Reason |
|--------|--------|--------|
| `kibana_access` | `actions` | Kibana access internally manages actions |
| `kibana_access` | `filter` | Kibana access conflicts with DLS |
| `kibana_access` | `fields` | Kibana access conflicts with FLS |
| `kibana_access` | `response_fields` | Kibana access conflicts with response field filtering |

**Note**: The composite `kibana` rule does NOT have these conflicts — it replaces the legacy separate rules and handles the interactions internally.

---

## 8. Rule Aliases Quick Reference

When parsing YAML, these aliases must be recognized and normalized to their canonical form:

| YAML Key | Canonical Rule |
|----------|---------------|
| `groups` | `groups_any_of` |
| `roles` | `groups_any_of` |
| `any_of` | `groups_any_of` |
| `groups_or` | `groups_any_of` |
| `all_of` | `groups_all_of` |
| `groups_and` | `groups_all_of` |
| `roles_and` | `groups_all_of` |
| `not_any_of` | `groups_not_any_of` |
| `not_all_of` | `groups_not_all_of` |
| `headers` | `headers_and` |

---

## 9. Dynamic Variables

Available in `indices`, `filter`, `users`, `snapshots`, `repositories`, `data_streams`, and other string-valued rules.

### Standard Variables

| Variable | Description |
|----------|-------------|
| `@{user}` | Current authenticated username |
| `@{acl:current_group}` | Currently matched group |
| `@{acl:available_groups}` | All group IDs resolved by authorization rules (comma-separated when rendered as string) |
| `@{jwt:claim_name}` | JWT claim value (e.g. `@{jwt:department}`) |
| `@{ldap:field_name}` | LDAP attribute value |
| `@{header:header_name}` | HTTP header value (e.g. `@{header:X-Forwarded-For}`) |
| `@{x-forwarded-for}` | X-Forwarded-For IP |

### Explode Variables

`@explode{...}` expands a multi-valued variable into multiple values. Used primarily with `indices`:

```yaml
indices: ["logstash-@explode{jwt:groups}-*"]
# If jwt:groups = ["team_a", "team_b"], expands to:
# ["logstash-team_a-*", "logstash-team_b-*"]
```

### Function Chains

Variables support post-processing function chains:

| Function | Description | Example |
|----------|-------------|---------|
| `.to_lowercase` | Convert to lowercase | `@{user}.to_lowercase` |
| `.replace_first(from, to)` | Replace first occurrence | `@{user}.replace_first("@", "_at_")` |
| `.replace_all(from, to)` | Replace all occurrences | `@{header:X-Org}.replace_all(" ", "_")` |

Functions can be chained: `@{user}.to_lowercase.replace_all("@", "_")`

### Variable Syntax Pattern

Full regex: `@(explode)?\{[a-zA-Z_][a-zA-Z0-9_.:/-]*\}(\.(to_lowercase|replace_first\([^)]*\)|replace_all\([^)]*\)))*`

---

## 10. Authentication Rule Classification

For validation and auto-ordering, rules are classified as:

**Authentication rules** (set `loggedUser`):
`auth_key`, `auth_key_sha1`, `auth_key_sha256`, `auth_key_sha512`, `auth_key_pbkdf2`, `auth_key_unix`, `proxy_auth`, `token_authentication`, `external_authentication`, `ldap_authentication`, `jwt_authentication`, `ror_kbn_authentication`, `ldap_auth`, `jwt_auth`, `ror_kbn_auth`

**Authorization-only rules** (require `loggedUser` already set):
`ldap_authorization`, `jwt_authorization`, `ror_kbn_authorization`, `groups_provider_authorization`, `external_authorization`

**Groups rules** (require groups resolved by auth):
`groups_any_of` (+ aliases), `groups_all_of` (+ aliases), `groups_not_any_of` (+ aliases), `groups_not_all_of` (+ aliases), `groups_combined`
