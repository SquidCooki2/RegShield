# Transcribe

Monorepo managed with [Bun workspaces](https://bun.sh/docs/install/workspaces).

```
.
├── client/     # React + TypeScript + Vite (Redline UI)
└── server/     # Bun + TypeScript API server
```

## Getting started

```sh
bun install        # installs deps for all workspaces
bun run dev        # runs client (http://localhost:5173) and server (http://localhost:3000)
```

Run one side only with `bun run dev:client` or `bun run dev:server`.

In development, the Vite dev server proxies `/api/*` to the server, so the client can call `fetch('/api/health')` directly.
