# ROR Studio

The visual configuration editor for [ReadOnlyREST](https://readonlyrest.com) — the security plugin for Elasticsearch and Kibana.

Build, validate, and export `readonlyrest.yml` configs through an intuitive visual interface. Supports all ReadOnlyREST editions: **Free**, **PRO**, and **Enterprise**.

## Your settings stay on your machine

ROR Studio runs **100% in the browser**. No backend, no accounts, no telemetry, no external requests. Your security configuration never leaves your machine — the app works fully **air-gapped** with all assets bundled locally. Perfect for environments where ACL configs contain sensitive infrastructure details.

## Three ways to edit your ACL

| Graph | Form | Code |
|-------|------|------|
| Visual flow diagram showing how requests are evaluated top-to-bottom through your ACL blocks | Structured card editor with drag-to-reorder, inline validation, and rule dropdowns | Full Monaco YAML editor with syntax highlighting, real-time validation squiggles, and line-by-line error reporting |

Switch freely between views — they all read from and write to the same config. Changes in one view are instantly reflected in the others.

## Features

- **Real-time validation** — catches empty block names, duplicate names, missing auth rules, dangling connector references, unreachable blocks, and more. Errors map to exact YAML lines with actionable fix suggestions.
- **YAML preview** — dockable panel (bottom or right) with syntax highlighting, copy, and download. Shows your `readonlyrest.yml` as you build it.
- **Edition tier gating** — rule types are tagged Free/PRO/Enterprise. Adding a higher-tier rule prompts for edition upgrade. Duplicate rule types are prevented (YAML flattens rules as keys).
- **Production templates** — 6 ready-to-use configs: Basic Auth, Multi-tenant Kibana, LDAP Authentication, LDAP Group Mapping, JWT/SSO, and combined patterns. Preview the YAML before loading.
- **Guided wizard** — 5-step setup for your first ACL block (name, auth method, permissions, review).
- **Undo/redo** — full history with Cmd/Ctrl+Z support.
- **Import/export** — paste or upload existing `readonlyrest.yml`, download the result.
- **Connector management** — configure LDAP, JWT, ROR KBN, proxy auth, external authentication/authorization services, and groups providers. Blocks and users reference connectors by name with validation.

## Getting Started

```bash
npm install
npm run dev
```

Opens at [http://localhost:4500/ror-studio/](http://localhost:4500/ror-studio/).

## Build for production

```bash
npm run build            # TypeScript check + Vite production build
npx vite preview         # Serve and test the production build locally
```

The `dist/` folder is a fully self-contained static site. Deploy it anywhere — no server-side runtime needed.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server (port 4500) |
| `npm run build` | Type-check + production build |
| `npm run lint` | ESLint |
| `npx tsc -b --noEmit` | Type-check only |

## Tech Stack

- **React 19** + TypeScript
- **Zustand** — state management with undo/redo
- **Vite** — build tool
- **Monaco Editor** — YAML editing with custom ROR syntax highlighting (bundled locally, no CDN)
- **AntV G6** — ACL flow diagram
- **Radix UI** + **Tailwind CSS 4** — accessible UI primitives and styling
- **js-yaml** — YAML serialization and parsing

## License

Copyright (c) 2026 [Beshu Limited](https://readonlyrest.com) (UK). All rights reserved. See [LICENSE](LICENSE).
