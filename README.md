# ROR Studio

A visual configuration editor for [ReadOnlyREST](https://readonlyrest.com) Elasticsearch/Kibana ACL plugin. Build your `readonlyrest.yml` entirely in the browser — no backend required.

## Features

- Visual ACL block editor with drag-to-reorder
- Real-time YAML preview with syntax highlighting (Monaco)
- Semantic validation with inline error markers
- ACL flow diagram showing request evaluation path
- Edition tier gating (Free / Pro / Enterprise)
- Production-ready templates (LDAP, JWT/SSO, multi-tenant Kibana, group mapping)
- Step-by-step wizard for first ACL block
- Undo/redo support
- Import/export YAML configs
- Runs 100% client-side — zero data leaves your browser

## Getting Started

```bash
npm install
npm run dev
```

Opens on [http://localhost:4500](http://localhost:4500).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (port 4500) |
| `npm run build` | Type-check + production build |
| `npm run lint` | Run ESLint |

## Tech Stack

- React 19 + TypeScript
- Zustand (state management)
- Vite (build tool)
- Monaco Editor (YAML preview)
- AntV G6 (ACL flow diagram)
- Radix UI + Tailwind CSS 4

## License

See [LICENSE](LICENSE) for details.
