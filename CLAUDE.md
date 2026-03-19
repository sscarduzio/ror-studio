# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Vite dev server on port 4500
npm run build      # TypeScript check + Vite production build (tsc -b && vite build)
npm run lint       # ESLint
npx tsc -b --noEmit  # Type-check only (no emit)
```

No test runner is configured. There are no test files.

## Architecture

ROR Studio is a single-page React 19 config editor for [ReadOnlyREST](https://readonlyrest.com) Elasticsearch/Kibana ACL plugin. It produces `readonlyrest.yml` files. Runs entirely in the browser — no backend.

### State Management

**Zustand store** (`src/store/editor-store.ts`) is the single source of truth:
- `config: RorConfig` — the ACL configuration being edited
- `edition: 'free' | 'pro' | 'enterprise'` — controls which rule types are available; auto-upgrades when user adds a higher-tier rule or loads a template
- `activeTab: TabId` — current sidebar tab
- `yamlDock: 'bottom' | 'right'` — YAML preview panel position (Chrome DevTools-style docking)
- Undo/redo via `_past`/`_future` arrays (limit 100), with `pushHistory()` before mutations
- Block CRUD: `addBlock`, `updateBlock`, `removeBlock`, `reorderBlocks`, `duplicateBlock`
- User CRUD: `addUser`, `updateUser`, `removeUser`
- Generic nested field updates via `updateConfigField(path, value)` using `setNestedField()`

**Persistence** (`src/store/persistence.ts`): auto-saves to localStorage with 500ms debounce. Silent failure on quota exceeded.

### Data Flow

```
User edits form → Zustand store mutation → React re-render
                                        → useValidation() (200ms debounce) → semantic issues
                                        → configToYaml() → YAML text
                                        → buildYamlLineMap() → line numbers for issues
                                        → resolveFieldToLine() → maps internal field paths to YAML lines
                                        → Monaco markers (error squiggles at exact lines)
```

### Key Domain Types (`src/schema/types.ts`)

- `RorConfig` — top-level config: ACL blocks, connectors (LDAP/JWT/ROR KBN/external auth/groups providers), users, SSL, audit, global settings
- `AccessControlBlock` — has `id`, `name`, `type` (allow/forbid), `enabled`, `rules: AclRule[]`
- `AclRule` — `{ type: RuleType, value: unknown }` — flattened to YAML keys (e.g., `indices: [...]`)
- `RuleType` — union of ~77 string literals covering auth, network, ES, HTTP, Kibana rules
- `UserDefinition` — username, auth method (one of auth_key_*, ldap_auth, jwt_auth, etc.), local groups, optional authorization

### YAML Serialization (`src/utils/yaml.ts`)

`configToYaml()` converts internal `RorConfig` to valid `readonlyrest.yml`. Key detail: ACL blocks store rules as `{type, value}` arrays internally but YAML flattens them as top-level keys. Disabled blocks are serialized as YAML comments. Uses `js-yaml` with `indent: 2, lineWidth: -1, noRefs: true`.

`yamlToConfig()` parses YAML back, handling the `readonlyrest:` wrapper, legacy key aliases, and preserving unrecognized keys in `_unrecognized`.

### YAML Line Mapping (`src/utils/yaml-line-map.ts`)

`buildYamlLineMap()` parses YAML text line-by-line to produce a `Map<fieldPath, lineNumber>`. Paths use dotted notation without `readonlyrest.` prefix (e.g., `access_control_rules[0].name`).

Critical detail: internal validator field paths don't match YAML paths (rules are flattened in YAML). `resolveFieldToLine()` in `useValidation.ts` bridges this gap — e.g., `access_control_rules[0].rules[2]` resolves to the YAML line for the 2nd rule's type key within block 0.

### Validation

- **Semantic validator** (`src/validation/semantic-validator.ts`): validates ACL blocks (names, rules, auth conflicts, connector references, kibana_access), users (empty usernames, missing auth, duplicate names, connector refs), and SSL consistency
- **`useValidation()` hook** (`src/hooks/useValidation.ts`): debounced validation producing `ValidationResult` with issues, `issuesByTab`, counts, `yamlText`, and line numbers
- **`ValidationIssue`** includes `fix` (actionable guidance), `fieldId` (DOM element ID for scroll-to-fix), `line`/`endLine` (YAML line numbers)
- **`useFieldErrors(prefix)`** hook: filters issues by field path prefix for inline display
- **Monaco markers**: issues with line numbers become red/yellow squiggles in the Monaco YAML preview

### Edition Tier Gating

Rule metadata in `src/schema/field-meta.ts` includes a `tier` field per rule type. `getAllRulesByCategory()` returns all rules regardless of edition (for the dropdown). `isRuleAboveEdition()` compares tiers. When a user adds a rule above their edition, `BlockCard` shows a confirmation dialog and auto-switches the edition on accept.

### Shared Hooks

- `useConnectorNames(configKey)` (`src/hooks/useConnectorNames.ts`) — shared between RuleEditor and UsersGroupsTab for connector dropdown options
- `AuthKeyEditor` (`src/components/acl/AuthKeyEditor.tsx`) — hash-and-lock UX for auth_key_* rules, reused in Users tab via `UserAuthKeyEditor` adapter

### Layout

App uses `react-resizable-panels` with dockable YAML preview:
- **Bottom dock** (default): Vertical split — top panel (Sidebar + TabContainer + ErrorPanel), bottom panel (YamlPreview)
- **Right dock**: Horizontal split — left panel (Sidebar + TabContainer + ErrorPanel), right panel (YamlPreview)
- Dock position toggle buttons in YamlPreview header bar

ErrorPanel sits between the tab content area and the panel separator — always visible when errors/warnings exist.

The "Add Rule" dropdown in BlockCard uses `createPortal` to render at document.body level, escaping the panel's `overflow-hidden`.

### UI Components

Radix UI primitives in `src/components/ui/`. Styling via Tailwind 4 + CSS custom properties defined in `src/index.css` (the `@theme` block). Shared style constants in `src/components/shared-styles.ts`.

Rule metadata (labels, descriptions, tiers, value types, placeholders) lives in `src/schema/field-meta.ts` — `getRuleMeta(type)` and `getAllRulesByCategory()`.

### Getting Started / Onboarding

- **Templates** (`src/components/templates/GettingStartedTab.tsx`): 5 realistic template configs with preview dialog (Monaco editor) before loading
- **Wizard** (`src/components/wizard/`): 5-step guided setup for first ACL block (Welcome → Name → Auth → Permissions → Review)

### Path Alias

`@/` resolves to `src/` (configured in both `vite.config.ts` and `tsconfig.app.json`).
