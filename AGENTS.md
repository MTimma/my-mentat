# AGENTS.md

## Cursor Cloud specific instructions

This repository is a single client-only app: a **Dune: Imperium** board-game implementation (React 18 + TypeScript + Vite, build tool `@vitejs/plugin-react-swc`). All code lives in `client/`; there is no backend/server. Commands below must be run from `client/`.

Standard scripts are defined in `client/package.json`:
- `npm run dev` — Vite dev server (development workflow), serves on `http://localhost:5173/`.
- `npm run test` — Vitest (`vitest run`).
- `npm run lint` — ESLint.
- `npm run build` — `tsc -b && vite build` (type-checked production build).

Non-obvious caveats:
- **Dev server is the development workflow; it does NOT type-check.** `npm run dev` (and the in-browser app) uses SWC and runs even when there are TypeScript or ESLint errors. Use `npm run dev` for running/testing the app, not `npm run build`.
- On `npm run dev` startup you may see a one-time esbuild **"Failed to scan for dependencies"** warning during dependency pre-bundling. This does not stop the dev server — it still serves `http://localhost:5173/` and the app renders normally. (At the time of writing this surfaces a pre-existing `const` reassignment in `src/components/GameContext/GameContext.tsx`; SWC still serves the module.)
- As of HEAD, `npm run build` and `npm run lint` fail due to pre-existing TypeScript/ESLint errors in the codebase (unused vars, a few type mismatches, a `const` reassignment). These are codebase-state issues, not environment problems; the tooling itself is correctly installed.
- The app is purely front-end with no auth or external services. To exercise core gameplay: open the app, click **Start Game**, select 5 Imperium Row cards and a Conflict card, then play a card from hand to place an agent on a board space.
- Game rules/clarifications used by the implementation live under `.cursor/rules/` and the repo-level `plans/` and `notes/` directories.
