# AGENTS.md

## Cursor Cloud specific instructions

This is a **Dune: Imperium digital board game** — a client-side-only React + TypeScript + Vite application. There is no backend, database, or external service dependency.

### Project layout

All application code lives under `/workspace/client/`. The workspace root has no `package.json`.

### Running the app

```
cd client
npm run dev          # Vite dev server with HMR (default port 5173)
```

Use `-- --host 0.0.0.0` when you need the server reachable outside localhost.

### Linting

```
cd client
npm run lint         # ESLint (pre-existing unused-variable errors are expected)
```

### Building

```
cd client
npm run build        # tsc -b && vite build
```

> **Note:** `tsc -b` currently fails due to pre-existing type errors (missing test-runner types, unused variables, type mismatches in test files). The Vite dev server uses SWC and is unaffected — it runs fine for development.

### Testing

Test files exist (`src/services/__tests__/`, `src/components/__tests__/`, `src/components/GameContext/__tests__/`) but **no test runner is configured** in `package.json` (no vitest, jest, etc.). Tests cannot be executed until a test framework is added.

### Game rules

Dune: Imperium rules are documented in `.cursor/rules/` — see `round-structure.mdc`, `board-spaces.mdc`, `full-rules.mdc`, `clarifications.mdc`, and `terms.mdc`.
